from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


PARTNER_STATUSES = [
    "Interessent",
    "In Gespraechen",
    "Verhandlung",
    "Aktiver Partner",
    "Alumni",
    "Alumni IRM",
]
STUDENT_STATUSES = ["Aktiv", "Alumni"]
LECTURER_AFFILIATIONS = ["Company", "University"]
QUALITY_EVALUATIONS = ["excellent", "good", "average", "poor", "not_evaluated"]


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
    contact_email: str = ""
    contact_phone: str = ""
    website: str = ""
    notes: str = ""
    status: str = "Interessent"
    topics: str = ""
    reservierte_plaetze: int = 0


class PartnerCreate(PartnerBase):
    last_contact_date: Optional[date] = None
    last_contact_type: Optional[str] = None


class PartnerUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    location: str | None = None
    contact_person: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    website: str | None = None
    notes: str | None = None
    status: str | None = None
    topics: str | None = None
    reservierte_plaetze: int | None = None


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


class LecturerCourseOut(BaseModel):
    id: int
    course_name: str
    subject: str
    semester: str

    model_config = {"from_attributes": True}


class LecturerBase(BaseModel):
    name: str = Field(min_length=1)
    contact: str = ""
    nationality: str = ""
    affiliation: str = ""
    organization: str = ""
    professional_experience: str = ""
    remarks: str = ""
    quality_evaluation: str = "not_evaluated"
    contact_from: str = ""
    can_lecture: bool = True
    can_guest_lecture_only: bool = False
    can_supervise: bool = False
    did_not_lecture_yet_but_interested: bool = False
    did_not_supervise_yet_but_interested: bool = False
    teaches_german: bool = False
    teaches_english: bool = False
    lectures_held: str = ""
    focus_topics: str = ""
    is_active: bool = True
    is_alumni_student: bool = False
    alumni_student_id: int | None = None


class LecturerCreate(LecturerBase):
    pass


class LecturerUpdate(BaseModel):
    name: str | None = None
    contact: str | None = None
    nationality: str | None = None
    affiliation: str | None = None
    organization: str | None = None
    professional_experience: str | None = None
    remarks: str | None = None
    quality_evaluation: str | None = None
    contact_from: str | None = None
    can_lecture: bool | None = None
    can_guest_lecture_only: bool | None = None
    can_supervise: bool | None = None
    did_not_lecture_yet_but_interested: bool | None = None
    did_not_supervise_yet_but_interested: bool | None = None
    teaches_german: bool | None = None
    teaches_english: bool | None = None
    lectures_held: str | None = None
    focus_topics: str | None = None
    is_alumni_student: bool | None = None
    alumni_student_id: int | None = None


class LecturerOut(LecturerBase):
    id: int
    courses: list[LecturerCourseOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StudentBase(BaseModel):
    name: str = Field(min_length=1)
    cohort: str = ""
    company: str = ""
    status: str = "Aktiv"

    # Contacts
    dhbw_email: str = ""
    private_email: str = ""

    # Scientific works
    project1_title: str = ""
    project1_supervisor: str = ""
    project2_title: str = ""
    project2_supervisor: str = ""
    bachelor_title: str = ""
    bachelor_supervisor: str = ""

    lecturer_potential: bool = False
    became_lecturer: bool = False
    notes: str = ""


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = None
    cohort: str | None = None
    company: str | None = None
    status: str | None = None

    dhbw_email: str | None = None
    private_email: str | None = None

    project1_title: str | None = None
    project1_supervisor: str | None = None
    project2_title: str | None = None
    project2_supervisor: str | None = None
    bachelor_title: str | None = None
    bachelor_supervisor: str | None = None

    lecturer_potential: bool | None = None
    became_lecturer: bool | None = None
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


class NotesIdeaBase(BaseModel):
    title: str = Field(min_length=1)
    content: str = ""
    note_date: datetime | None = None
    tags: str = ""
    source: str = ""  # Who the note/idea is from


class NotesIdeaCreate(NotesIdeaBase):
    pass


class NotesIdeaUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    note_date: datetime | None = None
    tags: str | None = None
    source: str | None = None


class NotesIdeaOut(NotesIdeaBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardOut(BaseModel):
    partner_count: int
    lecturer_count: int
    student_count: int
    active_partner_count: int
    active_student_count: int
