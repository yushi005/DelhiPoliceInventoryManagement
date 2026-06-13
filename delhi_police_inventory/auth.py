"""
auth.py – JWT helpers + password utilities + FastAPI dependency
"""
import os
import bcrypt
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env from the project root (parent of this package dir) so SECRET_KEY
# and friends are actually pulled from .env regardless of the cwd uvicorn
# is launched from.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import TokenData

# ── Config (override via environment) ────────────────────────────────────────
SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecret-jwt-key-change-in-production")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# ── OAuth2 scheme (token extracted from Authorization: Bearer <token>) ────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
# Same scheme, but does not 401 when the header is absent — used by public
# endpoints that still want to scope results when a token *is* supplied.
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenData:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        badge_id: Optional[str] = payload.get("sub")
        if badge_id is None:
            raise credentials_exc
        return TokenData(badge_id=badge_id)
    except JWTError:
        raise credentials_exc


# ── FastAPI dependencies ──────────────────────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    token_data = decode_token(token)
    user = db.query(User).filter(User.badge_id == token_data.badge_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Like get_current_user, but returns None instead of 401 when no/invalid
    token is supplied. Lets an endpoint be public yet role-scope authed users."""
    if not token:
        return None
    try:
        token_data = decode_token(token)
    except HTTPException:
        return None
    return db.query(User).filter(User.badge_id == token_data.badge_id).first()


def require_role(*roles: str):
    """Factory that returns a dependency enforcing one of the given roles."""
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role(s): {roles}. Your role: {current_user.role.value}",
            )
        return current_user
    return dependency
