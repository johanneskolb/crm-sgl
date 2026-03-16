"""Datenmodelle fuer das CRM-System."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass(slots=True)
class PartnerCompany:
    """Repräsentiert ein Partnerunternehmen."""

    id: Optional[int]
    name: str
    industry: str
    location: str
    contact_person: str
    status: str
    topics: str
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class PartnerContact:
    """Ein Kontaktpunkt mit einem Partnerunternehmen."""

    id: Optional[int]
    partner_id: int
    contact_date: datetime
    channel: str
    summary: str
    created_at: datetime


@dataclass(slots=True)
class Lecturer:
    """Repräsentiert eine dozierende Person."""

    id: Optional[int]
    name: str
    contact: str
    nationality: str
    affiliation: str
    professional_experience: str
    remarks: str
    quality_evaluation: str
    contact_from: str
    can_lecture: bool
    can_supervise: bool
    lectures_held: str
    focus_topics: str
    did_not_lecture_yet_but_interested: bool
    did_not_supervise_yet_but_interested: bool
    teaches_german: bool
    teaches_english: bool
    can_guest_lecture_only: bool
    is_alumni_student: bool
    alumni_student_id: Optional[int]
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class StudentAlumni:
    """Repräsentiert Studierende oder Alumni."""

    id: Optional[int]
    name: str
    cohort: str
    company: str
    status: str
    lecturer_potential: bool
    became_lecturer: bool
    notes: str
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class NoteIdea:
    """Notizen und Ideen."""

    id: Optional[int]
    title: str
    content: str
    note_date: datetime
    tags: str
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class StatusHistory:
    """Statusaenderung mit Zeitstempel."""

    id: Optional[int]
    entity_type: str
    entity_id: int
    old_status: str
    new_status: str
    changed_at: datetime
    note: str
