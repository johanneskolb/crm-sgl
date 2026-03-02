from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/lecturers", tags=["lecturers"])


@router.get("", response_model=list[schemas.LecturerOut])
def list_lecturers(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    query = db.query(models.Lecturer)
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.Lecturer.name.ilike(like)
            | models.Lecturer.contact.ilike(like)
            | models.Lecturer.expertise.ilike(like)
            | models.Lecturer.lectures_held.ilike(like)
            | models.Lecturer.focus_topics.ilike(like)
        )
    return query.order_by(models.Lecturer.name.asc()).all()


@router.post("", response_model=schemas.LecturerOut)
def create_lecturer(
    payload: schemas.LecturerCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = models.Lecturer(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{lecturer_id}", response_model=schemas.LecturerOut)
def update_lecturer(
    lecturer_id: int,
    payload: schemas.LecturerUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.Lecturer, lecturer_id)
    if not record:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{lecturer_id}")
def delete_lecturer(
    lecturer_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.Lecturer, lecturer_id)
    if not record:
        raise HTTPException(status_code=404, detail="Lecturer not found")
    db.delete(record)
    db.commit()
    return {"ok": True}
