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
    status: Mapped[str] = mapped_column(String(80), index=True)
    topics: Mapped[str] = mapped_column(Text, default="")
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
    expertise: Mapped[str] = mapped_column(Text, default="")
    can_lecture: Mapped[bool] = mapped_column(Boolean, default=True)
    can_supervise: Mapped[bool] = mapped_column(Boolean, default=False)
    lectures_held: Mapped[str] = mapped_column(Text, default="")
    focus_topics: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class StudentAlumni(Base):
    __tablename__ = "students_alumni"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    cohort: Mapped[str] = mapped_column(String(120), default="")
    company: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(50), index=True)
    lecturer_potential: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


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
