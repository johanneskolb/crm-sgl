from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[schemas.StatusHistoryOut])
def get_history(
    entity_type: str = Query(..., pattern="^(partner|student)$"),
    entity_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    return (
        db.query(models.StatusHistory)
        .filter(
            models.StatusHistory.entity_type == entity_type,
            models.StatusHistory.entity_id == entity_id,
        )
        .order_by(models.StatusHistory.changed_at.desc())
        .all()
    )
