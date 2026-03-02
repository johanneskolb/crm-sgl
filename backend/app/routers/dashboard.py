from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardOut)
def dashboard(db: Session = Depends(get_db), _: models.User = Depends(require_editor_or_admin)):
    partner_count = db.query(func.count(models.PartnerCompany.id)).scalar() or 0
    lecturer_count = db.query(func.count(models.Lecturer.id)).scalar() or 0
    student_count = db.query(func.count(models.StudentAlumni.id)).scalar() or 0
    active_partner_count = (
        db.query(func.count(models.PartnerCompany.id))
        .filter(models.PartnerCompany.status == "Aktiver Partner")
        .scalar()
        or 0
    )
    active_student_count = (
        db.query(func.count(models.StudentAlumni.id))
        .filter(models.StudentAlumni.status == "Aktiv")
        .scalar()
        or 0
    )

    return schemas.DashboardOut(
        partner_count=partner_count,
        lecturer_count=lecturer_count,
        student_count=student_count,
        active_partner_count=active_partner_count,
        active_student_count=active_student_count,
    )
