"""
routes/districts.py – Public lookup endpoints for districts and units.

No authentication required; used to populate dropdowns on the login/
submission forms before a token is available.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import District, Unit

router = APIRouter(tags=["Lookups"])


@router.get("/districts/", summary="List all districts")
def list_districts(db: Session = Depends(get_db)):
    """Return every district as a list of `{id, name}`."""
    districts = db.query(District).order_by(District.name).all()
    return [{"id": d.id, "name": d.name} for d in districts]


@router.get("/entities/", summary="Flat list of all districts and units")
def list_entities(db: Session = Depends(get_db)):
    """Return every district and unit as one flat list for a single dropdown.

    District ids are prefixed `d-`, unit ids `u-` to avoid collision, e.g.
    `[{"id": "d-1", "name": "Central", "type": "district"},
      {"id": "u-1", "name": "Connaught Place PS", "type": "unit"}, ...]`.
    """
    districts = db.query(District).order_by(District.name).all()
    units = db.query(Unit).order_by(Unit.name).all()

    entities = [{"id": f"d-{d.id}", "name": d.name, "type": "district"} for d in districts]
    entities += [{"id": f"u-{u.id}", "name": u.name, "type": "unit"} for u in units]
    return entities


@router.get("/units/", summary="List units (optionally by district)")
def list_units(
    district_id: Optional[int] = Query(None, description="Filter by district"),
    db: Session = Depends(get_db),
):
    """Return units as a list of `{id, name, district_id}`, optionally filtered."""
    q = db.query(Unit)
    if district_id is not None:
        q = q.filter(Unit.district_id == district_id)
    units = q.order_by(Unit.name).all()
    return [{"id": u.id, "name": u.name, "district_id": u.district_id} for u in units]
