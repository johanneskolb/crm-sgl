from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/partners", tags=["partners"])


@router.get("", response_model=list[schemas.PartnerOut])
def list_partners(
    q: str | None = Query(default=None, description="Search query"),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    query = db.query(models.PartnerCompany)
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.PartnerCompany.name.ilike(like)
            | models.PartnerCompany.industry.ilike(like)
            | models.PartnerCompany.location.ilike(like)
            | models.PartnerCompany.contact_person.ilike(like)
            | models.PartnerCompany.topics.ilike(like)
        )
    return query.order_by(models.PartnerCompany.updated_at.desc()).all()


@router.post("", response_model=schemas.PartnerOut)
def create_partner(
    payload: schemas.PartnerCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    if payload.status not in schemas.PARTNER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid partner status")
    record = models.PartnerCompany(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{partner_id}", response_model=schemas.PartnerOut)
def get_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.PartnerCompany, partner_id)
    if not record:
        raise HTTPException(status_code=404, detail="Partner not found")
    return record


@router.put("/{partner_id}", response_model=schemas.PartnerOut)
def update_partner(
    partner_id: int,
    payload: schemas.PartnerUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.PartnerCompany, partner_id)
    if not record:
        raise HTTPException(status_code=404, detail="Partner not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in schemas.PARTNER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid partner status")

    old_status = record.status
    for key, value in update_data.items():
        setattr(record, key, value)

    if "status" in update_data and old_status != record.status:
        db.add(
            models.StatusHistory(
                entity_type="partner",
                entity_id=record.id,
                old_status=old_status,
                new_status=record.status,
                note="Status updated via API",
            )
        )

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{partner_id}")
def delete_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    record = db.get(models.PartnerCompany, partner_id)
    if not record:
        raise HTTPException(status_code=404, detail="Partner not found")
    db.delete(record)
    db.commit()
    return {"ok": True}


@router.get("/{partner_id}/contacts", response_model=list[schemas.PartnerContactOut])
def list_partner_contacts(
    partner_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    _partner = db.get(models.PartnerCompany, partner_id)
    if not _partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    return (
        db.query(models.PartnerContact)
        .filter(models.PartnerContact.partner_id == partner_id)
        .order_by(models.PartnerContact.contact_date.desc())
        .all()
    )


@router.post("/{partner_id}/contacts", response_model=schemas.PartnerContactOut)
def add_partner_contact(
    partner_id: int,
    payload: schemas.PartnerContactCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    partner = db.get(models.PartnerCompany, partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    record = models.PartnerContact(partner_id=partner_id, **payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
