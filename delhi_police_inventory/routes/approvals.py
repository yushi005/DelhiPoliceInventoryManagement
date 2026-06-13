"""
routes/approvals.py – PATCH endpoint for status changes (admin / superadmin only)

Exposed as `PATCH /submissions/{submission_id}/status` so the approval action
lives alongside the submissions resource it acts on.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Submission, StatusEnum, User
from schemas import ApprovalPatch, SubmissionOut
from auth import require_role

router = APIRouter(prefix="/submissions", tags=["Approvals"])


@router.patch("/{submission_id}/status", response_model=SubmissionOut,
              summary="Approve / reject a submission")
def change_approval_status(
    submission_id: int,
    payload: ApprovalPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """
    **admin** / **superadmin** can move a submission to *approved* or *rejected*.

    Admins may only act on submissions from their own district. The reviewer's
    user ID is recorded in `approved_by` / `rejected_by` and the change is
    timestamped in `status_changed_at`.
    """
    sub: Submission | None = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {submission_id} not found")

    # Admins can only review submissions from their own district
    if current_user.role.value == "admin" and sub.district_id != current_user.district_id:
        raise HTTPException(
            status_code=403,
            detail="Admins can only review submissions from their own district",
        )

    new_status = StatusEnum(payload.status)
    sub.status = new_status
    sub.status_changed_at = datetime.utcnow()

    if new_status == StatusEnum.approved:
        sub.approved_by = current_user.id
        sub.rejected_by = None
        sub.rejection_reason = None
    elif new_status == StatusEnum.rejected:
        sub.rejected_by = current_user.id
        sub.approved_by = None
        sub.rejection_reason = payload.reason

    db.commit()
    db.refresh(sub)
    return sub
