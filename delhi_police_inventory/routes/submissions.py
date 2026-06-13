"""
routes/submissions.py – Full CRUD for submissions
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import Submission, StatusEnum, User, District, Unit
from schemas import SubmissionCreate, SubmissionOut, SubmissionUpdate
from auth import get_current_user

router = APIRouter(prefix="/submissions", tags=["Submissions"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_404(submission_id: int, db: Session) -> Submission:
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {submission_id} not found")
    return sub


def _resolve_entity(entity_id: str, db: Session) -> dict:
    """Translate a flat entity id ("d-1" / "u-1") into district_id / unit_id.

    - Selecting a **unit** stores the unit and derives its parent district.
    - Selecting a **district** stores the district with no unit.
    """
    kind, _, raw = entity_id.partition("-")
    try:
        ref_id = int(raw)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid entity_id '{entity_id}'")

    if kind == "u":
        unit = db.query(Unit).filter(Unit.id == ref_id).first()
        if not unit:
            raise HTTPException(status_code=404, detail=f"Unit {ref_id} not found")
        return {"unit_id": unit.id, "district_id": unit.district_id}
    if kind == "d":
        district = db.query(District).filter(District.id == ref_id).first()
        if not district:
            raise HTTPException(status_code=404, detail=f"District {ref_id} not found")
        return {"unit_id": None, "district_id": district.id}
    raise HTTPException(status_code=422, detail=f"Invalid entity_id '{entity_id}'")


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED,
             summary="Create a new submission")
def create_submission(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any authenticated user can create a submission."""
    data = payload.model_dump()
    entity_id = data.pop("entity_id")
    data.update(_resolve_entity(entity_id, db))

    sub = Submission(
        user_id=current_user.id,
        status=StatusEnum.pending,
        **data,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


# ── READ ALL ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[SubmissionOut], summary="List submissions")
def list_submissions(
    status: Optional[str] = Query(None, description="Filter by status"),
    district_id: Optional[int] = Query(None, description="Filter by district (superadmin only)"),
    app_type: Optional[str] = Query(None, description="Filter by app type"),
    data_type: Optional[str] = Query(None, description="Filter by data type"),
    server_type: Optional[str] = Query(None, description="Filter by server type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    - **officer** → sees only their own submissions
    - **admin** → sees all submissions globally (optionally filtered by district_id)
    - **superadmin** → sees all submissions (optionally filtered by district_id)
    Supports filtering by status, app_type, data_type, and server_type.
    """
    q = db.query(Submission)

    if current_user.role.value == "officer":
        q = q.filter(Submission.user_id == current_user.id)
    elif district_id:
        # admin & superadmin → global view, with optional district filter
        q = q.join(User, Submission.user_id == User.id).filter(
            User.district_id == district_id
        )

    if status:
        q = q.filter(Submission.status == status)
    if app_type:
        q = q.filter(Submission.app_type == app_type)
    if data_type:
        q = q.filter(Submission.data_type == data_type)
    if server_type:
        q = q.filter(Submission.server_type == server_type)

    return q.offset(skip).limit(limit).all()


# ── READ ONE ──────────────────────────────────────────────────────────────────

@router.get("/{submission_id}", response_model=SubmissionOut, summary="Get a submission by ID")
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = _get_or_404(submission_id, db)
    # officers can only see their own
    if current_user.role.value == "officer" and sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return sub


# ── UPDATE ────────────────────────────────────────────────────────────────────

@router.patch("/{submission_id}", response_model=SubmissionOut, summary="Update a submission")
def update_submission(
    submission_id: int,
    payload: SubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Officers may edit their own *pending* or *rejected* submissions.

    Editing a rejected submission is the "Edit & Resubmit" flow: the status is
    reset to *pending* and the prior rejection is cleared.
    """
    sub = _get_or_404(submission_id, db)
    was_rejected = sub.status.value == "rejected"

    if current_user.role.value == "officer":
        if sub.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if sub.status.value not in ("pending", "rejected"):
            raise HTTPException(status_code=400, detail="Only pending or rejected submissions can be edited")

    update_data = payload.model_dump(exclude_unset=True)
    entity_id = update_data.pop("entity_id", None)
    if entity_id:
        update_data.update(_resolve_entity(entity_id, db))

    for field, value in update_data.items():
        setattr(sub, field, value)

    # Resubmitting a rejected entry sends it back to pending for re-review.
    if current_user.role.value == "officer" and was_rejected:
        sub.status = StatusEnum.pending
        sub.rejection_reason = None
        sub.rejected_by = None

    db.commit()
    db.refresh(sub)
    return sub


# ── DELETE ────────────────────────────────────────────────────────────────────

@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a submission")
def delete_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Officers can delete their own pending submissions; admins/superadmins can delete any."""
    sub = _get_or_404(submission_id, db)

    if current_user.role.value == "officer":
        if sub.user_id != current_user.id or sub.status.value != "pending":
            raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(sub)
    db.commit()
