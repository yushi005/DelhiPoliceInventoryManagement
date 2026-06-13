"""
routes/custom_fields.py – CRUD for superadmin "My Fields" + officer responses.

NEW FILE (Feature 3). Registered in main.py. Reuses the existing JWT auth
dependencies from auth.py for all role gating.
"""
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Submission, User
from custom_fields_models import CustomField, CustomFieldResponse
from auth import get_current_user, require_role

router = APIRouter(prefix="/custom_fields", tags=["Custom Fields"])

FieldType = Literal["text", "dropdown", "number", "date", "boolean"]


# ── Schemas (local to this router; schemas.py is left untouched) ───────────────

class CustomFieldCreate(BaseModel):
    name: str
    field_type: FieldType
    options: Optional[List[str]] = None
    required: bool = False
    active: bool = True


class CustomFieldUpdate(BaseModel):
    name: Optional[str] = None
    field_type: Optional[FieldType] = None
    options: Optional[List[str]] = None
    required: Optional[bool] = None
    active: Optional[bool] = None


class CustomFieldOut(BaseModel):
    id: int
    name: str
    field_type: str
    options: List[str]
    required: bool
    active: bool


class ResponseItem(BaseModel):
    field_id: int
    value: str


class ResponsesIn(BaseModel):
    submission_id: int
    responses: List[ResponseItem]


class ResponseOut(BaseModel):
    field_id: int
    name: str
    field_type: str
    value: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _opts_to_list(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    return [o for o in (p.strip() for p in raw.split(",")) if o]


def _opts_to_str(opts: Optional[List[str]]) -> Optional[str]:
    if not opts:
        return None
    return ",".join(o.strip() for o in opts if o.strip())


def _to_out(f: CustomField) -> CustomFieldOut:
    return CustomFieldOut(
        id=f.id, name=f.name, field_type=f.field_type,
        options=_opts_to_list(f.options), required=f.required, active=f.active,
    )


# ── Field definitions ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[CustomFieldOut], summary="List custom fields")
def list_fields(
    active_only: bool = Query(False, description="Return only active fields"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any authenticated user can read field definitions (the officer form needs
    them). Only a superadmin may see *inactive* fields; everyone else is forced
    to the active set regardless of the query flag."""
    q = db.query(CustomField)
    if active_only or current_user.role.value != "superadmin":
        q = q.filter(CustomField.active.is_(True))
    return [_to_out(f) for f in q.order_by(CustomField.id).all()]


@router.post("/", response_model=CustomFieldOut, status_code=status.HTTP_201_CREATED,
             summary="Create a custom field (superadmin only)")
def create_field(
    payload: CustomFieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    if payload.field_type == "dropdown" and not payload.options:
        raise HTTPException(status_code=422, detail="Dropdown fields require at least one option")
    field = CustomField(
        name=payload.name,
        field_type=payload.field_type,
        options=_opts_to_str(payload.options),
        required=payload.required,
        active=payload.active,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return _to_out(field)


@router.patch("/{field_id}", response_model=CustomFieldOut,
              summary="Update / toggle a custom field (superadmin only)")
def update_field(
    field_id: int,
    payload: CustomFieldUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Custom field {field_id} not found")

    data = payload.model_dump(exclude_unset=True)
    if "options" in data:
        data["options"] = _opts_to_str(data["options"])
    for key, value in data.items():
        setattr(field, key, value)

    db.commit()
    db.refresh(field)
    return _to_out(field)


@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a custom field (superadmin only)")
def delete_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Custom field {field_id} not found")
    db.query(CustomFieldResponse).filter(CustomFieldResponse.field_id == field_id).delete()
    db.delete(field)
    db.commit()


# ── Responses (officer fills these in on the submission form) ──────────────────

def _check_submission_access(submission_id: int, db: Session, current_user: User) -> Submission:
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {submission_id} not found")
    if current_user.role.value == "officer" and sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return sub


@router.post("/responses", status_code=status.HTTP_201_CREATED,
             summary="Save custom field responses for a submission")
def save_responses(
    payload: ResponsesIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_submission_access(payload.submission_id, db, current_user)

    supplied = {r.field_id: (r.value or "").strip() for r in payload.responses}

    # Server-side enforcement: every active+required field must be supplied.
    required_fields = (
        db.query(CustomField)
        .filter(CustomField.active.is_(True), CustomField.required.is_(True))
        .all()
    )
    for f in required_fields:
        if not supplied.get(f.id):
            raise HTTPException(status_code=422, detail=f"Custom field '{f.name}' is required")

    # Idempotent: replace any existing responses for this submission.
    db.query(CustomFieldResponse).filter(
        CustomFieldResponse.submission_id == payload.submission_id
    ).delete()

    valid_field_ids = {f.id for f in db.query(CustomField.id).all() for f in [f]}
    for field_id, value in supplied.items():
        if field_id not in {row.id for row in db.query(CustomField.id).all()}:
            continue
        db.add(CustomFieldResponse(
            submission_id=payload.submission_id, field_id=field_id, value=value,
        ))

    db.commit()
    return {"saved": len(supplied)}


@router.get("/responses/{submission_id}", response_model=List[ResponseOut],
            summary="Get custom field responses for a submission")
def get_responses(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_submission_access(submission_id, db, current_user)

    fields = {f.id: f for f in db.query(CustomField).all()}
    rows = (
        db.query(CustomFieldResponse)
        .filter(CustomFieldResponse.submission_id == submission_id)
        .all()
    )
    out: List[ResponseOut] = []
    for r in rows:
        f = fields.get(r.field_id)
        if not f:
            continue
        out.append(ResponseOut(
            field_id=r.field_id, name=f.name, field_type=f.field_type, value=r.value or "",
        ))
    return out
