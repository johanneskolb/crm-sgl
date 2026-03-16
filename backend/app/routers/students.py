from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/students", tags=["students"])


def _ensure_lecturer_from_student(db: Session, student: models.StudentAlumni) -> None:
    if not student.became_lecturer:
        return
    existing = (
        db.query(models.Lecturer)
        .filter(models.Lecturer.alumni_student_id == student.id)
        .first()
    )
    if existing:
        return
    lecturer = models.Lecturer(
        name=student.name,
        contact=student.company,
        professional_experience="",
        remarks=student.notes or "",
        can_lecture=False,
        can_guest_lecture_only=False,
        can_supervise=False,
        is_alumni_student=True,
        alumni_student_id=student.id,
    )
    db.add(lecturer)


@router.get("", response_model=list[schemas.StudentOut])
def list_students(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    query = db.query(models.StudentAlumni)
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.StudentAlumni.name.ilike(like)
            | models.StudentAlumni.cohort.ilike(like)
            | models.StudentAlumni.company.ilike(like)
            | models.StudentAlumni.notes.ilike(like)
        )
    return query.order_by(models.StudentAlumni.name.asc()).all()


@router.post("", response_model=schemas.StudentOut)
def create_student(
    payload: schemas.StudentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    if payload.status not in schemas.STUDENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid student status")
    record = models.StudentAlumni(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    if record.became_lecturer:
        _ensure_lecturer_from_student(db, record)
        db.commit()
    return record


@router.put("/{student_id}", response_model=schemas.StudentOut)
def update_student(
    student_id: int,
    payload: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.StudentAlumni, student_id)
    if not record:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in schemas.STUDENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid student status")

    old_status = record.status
    became_lecturer_before = record.became_lecturer
    for key, value in update_data.items():
        setattr(record, key, value)

    if "status" in update_data and old_status != record.status:
        db.add(
            models.StatusHistory(
                entity_type="student",
                entity_id=record.id,
                old_status=old_status,
                new_status=record.status,
                note="Status updated via API",
            )
        )

    if not became_lecturer_before and record.became_lecturer:
        _ensure_lecturer_from_student(db, record)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.StudentAlumni, student_id)
    if not record:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(record)
    db.commit()
    return {"ok": True}
