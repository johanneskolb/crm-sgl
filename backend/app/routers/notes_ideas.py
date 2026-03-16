from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=list[schemas.NotesIdeaOut])
def list_notes(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    query = db.query(models.NotesIdea)
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.NotesIdea.title.ilike(like)
            | models.NotesIdea.content.ilike(like)
            | models.NotesIdea.tags.ilike(like)
        )
    return query.order_by(models.NotesIdea.note_date.desc()).all()


@router.post("", response_model=schemas.NotesIdeaOut)
def create_note(
    payload: schemas.NotesIdeaCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    data = payload.model_dump()
    if data.get("note_date") is None:
        data.pop("note_date", None)
    record = models.NotesIdea(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{note_id}", response_model=schemas.NotesIdeaOut)
def update_note(
    note_id: int,
    payload: schemas.NotesIdeaUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.NotesIdea, note_id)
    if not record:
        raise HTTPException(status_code=404, detail="Note not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.NotesIdea, note_id)
    if not record:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(record)
    db.commit()
    return {"ok": True}
