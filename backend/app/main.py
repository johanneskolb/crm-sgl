from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import models
from .auth import get_password_hash
from .config import settings
from .database import SessionLocal, engine
from .routers import auth, dashboard, export, history, lecturers, notes_ideas, partners, students, webhook


def ensure_sqlite_schema() -> None:
    with engine.begin() as conn:
        inspector = inspect(conn)
        tables = set(inspector.get_table_names())

        if "lecturers" in tables:
            cols = {
                row["name"]
                for row in conn.execute(text("PRAGMA table_info(lecturers)"))
                .mappings()
                .all()
            }

            def add_col(column_name: str, ddl: str) -> None:
                if column_name not in cols:
                    conn.execute(text(f"ALTER TABLE lecturers ADD COLUMN {ddl}"))
                    cols.add(column_name)

            add_col("nationality", "nationality TEXT DEFAULT ''")
            add_col("affiliation", "affiliation TEXT DEFAULT ''")
            add_col("professional_experience", "professional_experience TEXT DEFAULT ''")
            add_col("remarks", "remarks TEXT DEFAULT ''")
            add_col("quality_evaluation", "quality_evaluation TEXT DEFAULT 'not_evaluated'")
            add_col("contact_from", "contact_from TEXT DEFAULT ''")
            add_col("can_guest_lecture_only", "can_guest_lecture_only INTEGER DEFAULT 0")
            add_col("did_not_lecture_yet_but_interested", "did_not_lecture_yet_but_interested INTEGER DEFAULT 0")
            add_col("did_not_supervise_yet_but_interested", "did_not_supervise_yet_but_interested INTEGER DEFAULT 0")
            add_col("teaches_german", "teaches_german INTEGER DEFAULT 0")
            add_col("teaches_english", "teaches_english INTEGER DEFAULT 0")
            add_col("is_alumni_student", "is_alumni_student INTEGER DEFAULT 0")
            add_col("alumni_student_id", "alumni_student_id INTEGER")
            add_col("organization", "organization VARCHAR(255) DEFAULT ''")

            if "expertise" in cols and "professional_experience" in cols:
                conn.execute(
                    text(
                        """
                        UPDATE lecturers
                        SET professional_experience = expertise
                        WHERE (professional_experience IS NULL OR professional_experience = '')
                        """
                    )
                )

        if "partner_companies" in tables:
            cols = {
                row["name"]
                for row in conn.execute(text("PRAGMA table_info(partner_companies)"))
                .mappings()
                .all()
            }
            def add_partner_col(col: str, ddl: str) -> None:
                if col not in cols:
                    conn.execute(text(f"ALTER TABLE partner_companies ADD COLUMN {ddl}"))

            add_partner_col("contact_email", "contact_email VARCHAR(255) DEFAULT ''")
            add_partner_col("contact_phone", "contact_phone VARCHAR(80) DEFAULT ''")
            add_partner_col("website", "website VARCHAR(255) DEFAULT ''")
            add_partner_col("notes", "notes TEXT DEFAULT ''")

        if "students_alumni" in tables:
            cols = {
                row["name"]
                for row in conn.execute(text("PRAGMA table_info(students_alumni)"))
                .mappings()
                .all()
            }
            if "became_lecturer" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE students_alumni ADD COLUMN became_lecturer INTEGER DEFAULT 0"
                    )
                )


models.Base.metadata.create_all(bind=engine)
ensure_sqlite_schema()

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


def seed_users() -> None:
    db: Session = SessionLocal()
    try:
        defaults = [
            ("Hannes", settings.hannes_password, "admin"),
            ("Diana", settings.diana_password, "editor"),
        ]
        for username, password, role in defaults:
            user = db.query(models.User).filter(models.User.username == username).first()
            if not user:
                db.add(
                    models.User(
                        username=username,
                        hashed_password=get_password_hash(password),
                        role=role,
                    )
                )
        db.commit()
    finally:
        db.close()


seed_users()

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(partners.router)
app.include_router(lecturers.router)
app.include_router(students.router)
app.include_router(history.router)
app.include_router(webhook.router)
app.include_router(export.router)
app.include_router(notes_ideas.router)
