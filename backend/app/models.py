from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="editor")
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())


class PartnerCompany(Base):
    __tablename__ = "partner_companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    industry: Mapped[str] = mapped_column(String(255), default="")
    location: Mapped[str] = mapped_column(String(255), default="")
    contact_person: Mapped[str] = mapped_column(String(255), default="")
    contact_email: Mapped[str] = mapped_column(String(255), default="")
    contact_phone: Mapped[str] = mapped_column(String(80), default="")
    website: Mapped[str] = mapped_column(String(255), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(80), index=True)
    topics: Mapped[str] = mapped_column(Text, default="")
    reservierte_plaetze: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    contacts: Mapped[list["PartnerContact"]] = relationship(
        back_populates="partner", cascade="all,delete-orphan"
    )


class PartnerContact(Base):
    __tablename__ = "partner_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partner_companies.id"))
    channel: Mapped[str] = mapped_column(String(100))
    summary: Mapped[str] = mapped_column(Text)
    contact_date: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())

    partner: Mapped[PartnerCompany] = relationship(back_populates="contacts")


class Lecturer(Base):
    __tablename__ = "lecturers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    contact: Mapped[str] = mapped_column(String(255), default="")
    nationality: Mapped[str] = mapped_column(String(120), default="")
    affiliation: Mapped[str] = mapped_column(String(50), default="")
    organization: Mapped[str] = mapped_column(String(255), default="")
    professional_experience: Mapped[str] = mapped_column(Text, default="")
    remarks: Mapped[str] = mapped_column(Text, default="")
    quality_evaluation: Mapped[str] = mapped_column(String(40), default="not_evaluated")
    contact_from: Mapped[str] = mapped_column(String(120), default="")
    can_lecture: Mapped[bool] = mapped_column(Boolean, default=True)
    can_guest_lecture_only: Mapped[bool] = mapped_column(Boolean, default=False)
    can_supervise: Mapped[bool] = mapped_column(Boolean, default=False)
    did_not_lecture_yet_but_interested: Mapped[bool] = mapped_column(Boolean, default=False)
    did_not_supervise_yet_but_interested: Mapped[bool] = mapped_column(Boolean, default=False)
    teaches_german: Mapped[bool] = mapped_column(Boolean, default=False)
    teaches_english: Mapped[bool] = mapped_column(Boolean, default=False)
    lectures_held: Mapped[str] = mapped_column(Text, default="")
    focus_topics: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_alumni_student: Mapped[bool] = mapped_column(Boolean, default=False)
    alumni_student_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("students_alumni.id"), nullable=True
    )
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    alumni_student: Mapped[Optional["StudentAlumni"]] = relationship(
        back_populates="lecturer_profile", uselist=False
    )
    courses: Mapped[list["LecturerCourse"]] = relationship(
        back_populates="lecturer", cascade="all,delete-orphan"
    )


class LecturerCourse(Base):
    __tablename__ = "lecturer_courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lecturer_id: Mapped[int] = mapped_column(ForeignKey("lecturers.id", ondelete="CASCADE"))
    course_name: Mapped[str] = mapped_column(String(50))
    subject: Mapped[str] = mapped_column(String(255), default="")
    semester: Mapped[str] = mapped_column(String(50), default="")

    lecturer: Mapped["Lecturer"] = relationship(back_populates="courses")


class StudentAlumni(Base):
    __tablename__ = "students_alumni"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    cohort: Mapped[str] = mapped_column(String(120), default="")
    company: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(50), index=True)

    # Contacts
    dhbw_email: Mapped[str] = mapped_column(String(255), default="")
    private_email: Mapped[str] = mapped_column(String(255), default="")

    # Scientific works (Projektarbeiten + Bachelorarbeit)
    project1_title: Mapped[str] = mapped_column(Text, default="")
    project1_supervisor: Mapped[str] = mapped_column(String(255), default="")
    project2_title: Mapped[str] = mapped_column(Text, default="")
    project2_supervisor: Mapped[str] = mapped_column(String(255), default="")
    bachelor_title: Mapped[str] = mapped_column(Text, default="")
    bachelor_supervisor: Mapped[str] = mapped_column(String(255), default="")

    lecturer_potential: Mapped[bool] = mapped_column(Boolean, default=False)
    became_lecturer: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    lecturer_profile: Mapped[Optional["Lecturer"]] = relationship(
        back_populates="alumni_student", uselist=False
    )


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(30), index=True)
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    old_status: Mapped[str] = mapped_column(String(80))
    new_status: Mapped[str] = mapped_column(String(80))
    note: Mapped[str] = mapped_column(Text, default="")
    changed_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(120), index=True)
    event_type: Mapped[str] = mapped_column(String(120), index=True)
    payload: Mapped[str] = mapped_column(Text)
    received_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())


class NotesIdea(Base):
    __tablename__ = "notes_ideas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    content: Mapped[str] = mapped_column(Text, default="")
    note_date: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    tags: Mapped[str] = mapped_column(String(255), default="")
    source: Mapped[str] = mapped_column(String(255), default="")  # Who the note/idea is from
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
