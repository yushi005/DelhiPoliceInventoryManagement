"""
routes/users.py – User management (admin / superadmin only)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User
from schemas import UserCreate, UserOut, UserUpdate
from auth import hash_password, get_current_user, require_role

router = APIRouter(prefix="/users", tags=["Users"])


# ── GET /users/me ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut, summary="Current user profile")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── LIST ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[UserOut], summary="List all users")
def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    district_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    q = db.query(User)
    if current_user.role.value == "admin":
        # admins can only see users in their district
        q = q.filter(User.district_id == current_user.district_id)
    if role:
        q = q.filter(User.role == role)
    if district_id and current_user.role.value == "superadmin":
        q = q.filter(User.district_id == district_id)
    return q.offset(skip).limit(limit).all()


# ── GET ONE ───────────────────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=UserOut, summary="Get user by ID")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    if current_user.role.value == "admin" and user.district_id != current_user.district_id:
        raise HTTPException(status_code=403, detail="Access denied outside your district")
    return user


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             summary="Create a new user")
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """
    - **admin** can create officers only within their own district.
    - **superadmin** can create any role in any district.
    """
    if current_user.role.value == "admin":
        if payload.role in ("admin", "superadmin"):
            raise HTTPException(status_code=403, detail="Admins cannot create admin/superadmin users")
        if payload.district_id and payload.district_id != current_user.district_id:
            raise HTTPException(status_code=403, detail="Admins can only add users to their own district")

    existing = db.query(User).filter(User.badge_id == payload.badge_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"badge_id '{payload.badge_id}' already taken")

    user = User(
        badge_id=payload.badge_id,
        name=payload.name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        district_id=payload.district_id,
        unit_id=payload.unit_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── UPDATE ────────────────────────────────────────────────────────────────────

@router.patch("/{user_id}", response_model=UserOut, summary="Update a user")
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    if current_user.role.value == "admin" and user.district_id != current_user.district_id:
        raise HTTPException(status_code=403, detail="Access denied")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


# ── DELETE ────────────────────────────────────────────────────────────────────

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a user (superadmin only)")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()
