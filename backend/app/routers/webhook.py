import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/ingest", response_model=schemas.WebhookOut)
def ingest_webhook(
    payload: schemas.WebhookIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    event = models.WebhookEvent(
        source=payload.source,
        event_type=payload.event_type,
        payload=json.dumps(payload.payload, ensure_ascii=False),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[schemas.WebhookOut])
def list_webhook_events(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    return db.query(models.WebhookEvent).order_by(models.WebhookEvent.received_at.desc()).limit(100).all()
