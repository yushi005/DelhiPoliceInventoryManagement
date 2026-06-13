"""
custom_fields_models.py – ORM models for the "My Fields" feature (Feature 3).

NEW FILE. These two tables are additive only; no existing model in models.py is
touched. They reuse the shared `Base` from database.py, so the existing
`Base.metadata.create_all(bind=engine)` call in main.py creates them on startup —
this works because routes/custom_fields.py (which imports this module) is itself
imported by main.py *before* that create_all call runs.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey

from database import Base


class CustomField(Base):
    """A superadmin-defined custom field shown on the officer submission form."""
    __tablename__ = "custom_fields"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(120), nullable=False)
    # text | dropdown | number | date | boolean
    field_type = Column(String(20), nullable=False)
    # Comma-separated choices, only meaningful when field_type == "dropdown".
    options    = Column(Text, nullable=True)
    required   = Column(Boolean, nullable=False, default=False)
    active     = Column(Boolean, nullable=False, default=True)


class CustomFieldResponse(Base):
    """One officer-supplied value for one custom field on one submission."""
    __tablename__ = "custom_field_responses"

    id            = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False, index=True)
    field_id      = Column(Integer, ForeignKey("custom_fields.id"), nullable=False, index=True)
    value         = Column(Text, nullable=True)
