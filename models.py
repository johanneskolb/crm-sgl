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
    expertise: str
    can_lecture: bool
    can_supervise: bool
    lectures_held: str
    focus_topics: str
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
    notes: str
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
