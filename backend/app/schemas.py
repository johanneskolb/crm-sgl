from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


PARTNER_STATUSES = ["Interessent", "In Gespraechen", "Verhandlung", "Aktiver Partner", "Alumni"]
STUDENT_STATUSES = ["Aktiv", "Alumni"]


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    role: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str

    model_config = {"from_attributes": True}


class PartnerBase(BaseModel):
    name: str = Field(min_length=1)
    industry: str = ""
    location: str = ""
    contact_person: str = ""
    status: str = "Interessent"
    topics: str = ""


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    location: str | None = None
    contact_person: str | None = None
    status: str | None = None
    topics: str | None = None


class PartnerOut(PartnerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PartnerContactCreate(BaseModel):
    channel: str = Field(min_length=1)
    summary: str = Field(min_length=1)


class PartnerContactOut(BaseModel):
    id: int
    partner_id: int
    channel: str
    summary: str
    contact_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class LecturerBase(BaseModel):
    name: str = Field(min_length=1)
    contact: str = ""
    expertise: str = ""
    can_lecture: bool = True
    can_supervise: bool = False
    lectures_held: str = ""
    focus_topics: str = ""


class LecturerCreate(LecturerBase):
    pass


class LecturerUpdate(BaseModel):
    name: str | None = None
    contact: str | None = None
    expertise: str | None = None
    can_lecture: bool | None = None
    can_supervise: bool | None = None
    lectures_held: str | None = None
    focus_topics: str | None = None


class LecturerOut(LecturerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StudentBase(BaseModel):
    name: str = Field(min_length=1)
    cohort: str = ""
    company: str = ""
    status: str = "Aktiv"
    lecturer_potential: bool = False
    notes: str = ""


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = None
    cohort: str | None = None
    company: str | None = None
    status: str | None = None
    lecturer_potential: bool | None = None
    notes: str | None = None


class StudentOut(StudentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StatusHistoryOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    old_status: str
    new_status: str
    note: str
    changed_at: datetime

    model_config = {"from_attributes": True}


class WebhookIn(BaseModel):
    source: str = Field(default="external")
    event_type: str = Field(min_length=1)
    payload: dict[str, Any]


class WebhookOut(BaseModel):
    id: int
    source: str
    event_type: str
    payload: str
    received_at: datetime

    model_config = {"from_attributes": True}


class DashboardOut(BaseModel):
    partner_count: int
    lecturer_count: int
    student_count: int
    active_partner_count: int
    active_student_count: int
