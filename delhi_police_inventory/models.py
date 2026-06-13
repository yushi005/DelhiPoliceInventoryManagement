import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Enum, ForeignKey,
    DateTime, Text, func,
)
from sqlalchemy.orm import relationship
from database import Base


# ── Enums ────────────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    officer     = "officer"
    admin       = "admin"
    superadmin  = "superadmin"


class StatusEnum(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"


# ── ORM Models ───────────────────────────────────────────────────────────────

class District(Base):
    __tablename__ = "districts"

    id   = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)

    units = relationship("Unit", back_populates="district")
    users = relationship("User", back_populates="district")


class Unit(Base):
    __tablename__ = "units"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(120), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)

    district = relationship("District", back_populates="units")
    users    = relationship("User", back_populates="unit")


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    badge_id      = Column(String(30), unique=True, nullable=False, index=True)
    name          = Column(String(120), nullable=False)
    password_hash = Column(String(256), nullable=False)
    role          = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.officer)
    rank          = Column(String(50), nullable=True)
    district_id   = Column(Integer, ForeignKey("districts.id"), nullable=True)
    unit_id       = Column(Integer, ForeignKey("units.id"), nullable=True)

    district    = relationship("District", back_populates="users")
    unit        = relationship("Unit", back_populates="users")
    submissions = relationship(
        "Submission",
        back_populates="submitter",
        foreign_keys="[Submission.user_id]",
    )


class Submission(Base):
    """
    IT Software / Application inventory submission.
    Tracks a software deployment request across 4 sections.
    """
    __tablename__ = "submissions"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    status          = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.pending)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ── Approval tracking ────────────────────────────────────────────────────
    rejection_reason  = Column(Text, nullable=True)
    approved_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejected_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    status_changed_at = Column(DateTime, nullable=True)

    # ── Section 1 – Application details ──────────────────────────────────────
    app_name    = Column(String(200), nullable=False)
    app_type    = Column(String(30),  nullable=False)   # in-house | vendor | commercial
    vendor_name = Column(String(120), nullable=True)
    version     = Column(String(50),  nullable=True)
    purpose     = Column(Text,        nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    unit_id     = Column(Integer, ForeignKey("units.id"),     nullable=True)

    # ── Section 2 – Deployment details ───────────────────────────────────────
    storage_location    = Column(String(200), nullable=False)
    device_config       = Column(Text,        nullable=True)
    custodian_name      = Column(String(120), nullable=False)
    custodian_badge_id  = Column(String(30),  nullable=False)
    num_users           = Column(Integer,     nullable=False, default=1)

    # ── Section 3 – Server / hosting details ─────────────────────────────────
    server_type      = Column(String(20),  nullable=False)   # cloud | on-prem | hybrid
    server_provider  = Column(String(100), nullable=True)
    server_capacity  = Column(String(100), nullable=True)
    physical_location = Column(String(200), nullable=True)

    # ── Section 4 – Data classification ──────────────────────────────────────
    data_type           = Column(String(20), nullable=False)   # public | restrictive | confidential
    data_justification  = Column(Text,       nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    submitter    = relationship("User", back_populates="submissions", foreign_keys="[Submission.user_id]")
    approver     = relationship("User", foreign_keys="[Submission.approved_by]")
    rejecter     = relationship("User", foreign_keys="[Submission.rejected_by]")
    sub_district = relationship("District", foreign_keys="[Submission.district_id]")
    sub_unit     = relationship("Unit",     foreign_keys="[Submission.unit_id]")

    # ── Derived display helpers (used by SubmissionOut) ────────────────────────
    @property
    def district_name(self) -> str | None:
        return self.sub_district.name if self.sub_district else None

    @property
    def unit_name(self) -> str | None:
        return self.sub_unit.name if self.sub_unit else None

    @property
    def entity_id(self) -> str:
        """Single flat identifier for the District/Unit dropdown.

        Prefers the unit (most specific); falls back to the district.
        """
        if self.unit_id:
            return f"u-{self.unit_id}"
        return f"d-{self.district_id}"