from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models
from .auth import get_password_hash
from .config import settings
from .database import SessionLocal, engine
from .routers import auth, dashboard, export, history, lecturers, partners, students, webhook

models.Base.metadata.create_all(bind=engine)

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
