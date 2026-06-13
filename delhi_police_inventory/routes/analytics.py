"""
routes/analytics.py – Aggregated statistics with flexible filters
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from database import get_db
from models import Submission, User, StatusEnum
from schemas import AnalyticsSummary
from auth import get_current_user, get_current_user_optional, require_role

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary,
            summary="Aggregated submission statistics")
def get_summary(
    district_id: Optional[int] = Query(None, description="Filter by district"),
    app_type: Optional[str] = Query(None, description="Filter by app type"),
    data_type: Optional[str] = Query(None, description="Filter by data type"),
    server_type: Optional[str] = Query(None, description="Filter by server type"),
    date_from: Optional[str] = Query(None, description="ISO date yyyy-mm-dd"),
    date_to: Optional[str] = Query(None, description="ISO date yyyy-mm-dd"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Returns counts broken down by status, data type, app type, and server type.
    - **public (no token)** → global, unscoped (powers the landing portal)
    - **officer** → scoped to their own submissions
    - **admin** → global, filterable by district_id
    - **superadmin** → global, filterable by district_id
    """
    q = db.query(Submission)

    # Role scoping (anonymous callers see global stats)
    if current_user is not None and current_user.role.value == "officer":
        q = q.filter(Submission.user_id == current_user.id)
    elif district_id:
        # anonymous, admin & superadmin → global, with optional district filter
        q = q.join(User, Submission.user_id == User.id).filter(
            User.district_id == district_id
        )

    # Additional filters
    if app_type:
        q = q.filter(Submission.app_type == app_type)
    if data_type:
        q = q.filter(Submission.data_type == data_type)
    if server_type:
        q = q.filter(Submission.server_type == server_type)
    if date_from:
        q = q.filter(Submission.created_at >= date_from)
    if date_to:
        q = q.filter(Submission.created_at <= date_to + " 23:59:59")

    subs = q.all()
    total = len(subs)

    status_counts = {s.value: 0 for s in StatusEnum}
    for s in subs:
        status_counts[getattr(s.status, "value", s.status)] += 1

    # ── By data type ────────────────────────────────────────────────────────────
    data_agg: dict[str, int] = {}
    for s in subs:
        key = getattr(s.data_type, "value", s.data_type)
        data_agg[key] = data_agg.get(key, 0) + 1

    # ── By app type ─────────────────────────────────────────────────────────────
    app_agg: dict[str, int] = {}
    for s in subs:
        key = getattr(s.app_type, "value", s.app_type)
        app_agg[key] = app_agg.get(key, 0) + 1

    # ── By server type ──────────────────────────────────────────────────────────
    server_agg: dict[str, int] = {}
    for s in subs:
        key = getattr(s.server_type, "value", s.server_type)
        server_agg[key] = server_agg.get(key, 0) + 1

    return AnalyticsSummary(
        total=total,
        pending=status_counts["pending"],
        approved=status_counts["approved"],
        rejected=status_counts["rejected"],
        by_data_type=[{"data_type": k, "count": v} for k, v in data_agg.items()],
        by_app_type=[{"app_type": k, "count": v} for k, v in app_agg.items()],
        by_server_type=[{"server_type": k, "count": v} for k, v in server_agg.items()],
    )


@router.get("/status-breakdown", summary="Status counts only (lightweight)")
def status_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """Quick status breakdown — admin/superadmin only."""
    rows = (
        db.query(Submission.status, func.count(Submission.id).label("count"))
        .group_by(Submission.status)
        .all()
    )
    return [{"status": r.status.value, "count": r.count} for r in rows]


@router.get("/top-app-types", summary="Top N app types by submission count")
def top_app_types(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Submission.app_type, func.count(Submission.id).label("count"))
        .group_by(Submission.app_type)
        .order_by(func.count(Submission.id).desc())
        .limit(limit)
        .all()
    )
    return [{"app_type": getattr(r.app_type, "value", r.app_type), "count": r.count} for r in rows]
