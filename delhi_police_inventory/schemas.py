from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DistrictOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class UnitOut(BaseModel):
    id: int
    name: str
    district_id: int
    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    badge_id: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    badge_id: Optional[str] = None


class UserCreate(BaseModel):
    badge_id: str
    name: str
    password: str
    role: str = "officer"
    rank: Optional[str] = None
    district_id: Optional[int] = None
    unit_id: Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    rank: Optional[str] = None
    district_id: Optional[int] = None
    unit_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    badge_id: str
    name: str
    role: str
    rank: Optional[str]
    district_id: Optional[int]
    unit_id: Optional[int]
    model_config = {"from_attributes": True}


class SubmissionCreate(BaseModel):
    # Section 1
    app_name: str = Field(..., min_length=2, max_length=200)
    app_type: str = Field(..., pattern="^(in-house|vendor|commercial)$")
    vendor_name: Optional[str] = None
    version: Optional[str] = None
    purpose: str
    entity_id: str = Field(..., pattern=r"^(d|u)-\d+$")   # "d-1" district | "u-1" unit
    # Section 2
    storage_location: str
    device_config: Optional[str] = None
    custodian_name: str
    custodian_badge_id: str
    num_users: int = Field(..., ge=1)
    # Section 3
    server_type: str = Field(..., pattern="^(cloud|on-prem|hybrid)$")
    server_provider: Optional[str] = None
    server_capacity: Optional[str] = None
    physical_location: Optional[str] = None
    # Section 4
    data_type: str = Field(..., pattern="^(public|restrictive|confidential)$")
    data_justification: str

class SubmissionOut(BaseModel):
    id: int
    user_id: int
    status: str
    rejection_reason: Optional[str]
    approved_by: Optional[int]
    rejected_by: Optional[int]
    status_changed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    app_name: str
    app_type: str
    vendor_name: Optional[str]
    version: Optional[str]
    purpose: str
    district_id: int
    unit_id: Optional[int]
    district_name: Optional[str] = None
    unit_name: Optional[str] = None
    entity_id: Optional[str] = None
    storage_location: str
    device_config: Optional[str]
    custodian_name: str
    custodian_badge_id: str
    num_users: int
    server_type: str
    server_provider: Optional[str]
    server_capacity: Optional[str]
    physical_location: Optional[str]
    data_type: str
    data_justification: str
    model_config = {"from_attributes": True}

class SubmissionUpdate(BaseModel):
    # Section 1
    app_name: Optional[str] = Field(None, min_length=2, max_length=200)
    app_type: Optional[str] = Field(None, pattern="^(in-house|vendor|commercial)$")
    vendor_name: Optional[str] = None
    version: Optional[str] = None
    purpose: Optional[str] = None
    entity_id: Optional[str] = Field(None, pattern=r"^(d|u)-\d+$")
    # Section 2
    storage_location: Optional[str] = None
    device_config: Optional[str] = None
    custodian_name: Optional[str] = None
    custodian_badge_id: Optional[str] = None
    num_users: Optional[int] = Field(None, ge=1)
    # Section 3
    server_type: Optional[str] = Field(None, pattern="^(cloud|on-prem|hybrid)$")
    server_provider: Optional[str] = None
    server_capacity: Optional[str] = None
    physical_location: Optional[str] = None
    # Section 4
    data_type: Optional[str] = Field(None, pattern="^(public|restrictive|confidential)$")
    data_justification: Optional[str] = None

class ApprovalPatch(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    reason: Optional[str] = None

class AnalyticsSummary(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    by_data_type: list[dict]
    by_app_type: list[dict]
    by_server_type: list[dict]