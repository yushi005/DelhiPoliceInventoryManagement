"""
routes/auth.py – Login endpoint returning a JWT
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import LoginRequest, Token
from auth import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=Token, summary="Officer / Admin login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with **badge_id** + **password**.
    Returns a Bearer JWT valid for 60 minutes.
    """
    user: User | None = db.query(User).filter(User.badge_id == payload.badge_id).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid badge_id or password",
        )
    token = create_access_token(data={"sub": user.badge_id, "role": user.role.value, "name": user.name})
    return Token(access_token=token)
