from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/lecturers", tags=["lecturers"])


class LecturerCourseCreate(BaseModel):
    course_name: str
    subject: str = ""
    semester: str = ""


def _validate_lecturer_payload(payload: dict) -> None:
    if "affiliation" in payload and payload["affiliation"]:
        if payload["affiliation"] not in schemas.LECTURER_AFFILIATIONS:
            raise HTTPException(status_code=400, detail="Invalid affiliation")
    if "quality_evaluation" in payload and payload["quality_evaluation"]:
        if payload["quality_evaluation"] not in schemas.QUALITY_EVALUATIONS:
            raise HTTPException(status_code=400, detail="Invalid quality evaluation")


@router.get("", response_model=list[schemas.LecturerOut])
def list_lecturers(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    query = db.query(models.Lecturer)
    if q:
        like = f"%{q}%"
        # Search in lecturer fields
        lecturer_match = (
            models.Lecturer.name.ilike(like)
            | models.Lecturer.contact.ilike(like)
            | models.Lecturer.nationality.ilike(like)
            | models.Lecturer.professional_experience.ilike(like)
            | models.Lecturer.lectures_held.ilike(like)
            | models.Lecturer.focus_topics.ilike(like)
            | models.Lecturer.contact_from.ilike(like)
            | models.Lecturer.remarks.ilike(like)
        )
        
        # Also match lecturers who supervised theses containing the search term
        # We use a join to find students with matching thesis titles and then check if
        # any of their supervisors match lecturer names (using LIKE for fuzzy match)
        thesis_match_subquery = (
            db.query(models.StudentAlumni)
            .filter(
                models.StudentAlumni.project1_title.ilike(like)
                | models.StudentAlumni.project2_title.ilike(like)
                | models.StudentAlumni.bachelor_title.ilike(like)
            )
        )
        
        matching_students = thesis_match_subquery.all()
        supervisor_patterns = set()
        for student in matching_students:
            for supervisor in [student.project1_supervisor, student.project2_supervisor, student.bachelor_supervisor]:
                if supervisor:
                    supervisor_patterns.add(supervisor.strip())
        
        # Build a filter that checks if lecturer name appears in any supervisor name
        # (handles cases like "Bodo Kluxen" matching "Prof. Dr. Bodo Kluxen")
        supervisor_match = None
        if supervisor_patterns:
            supervisor_conditions = []
            for pattern in supervisor_patterns:
                # Split pattern into words and check if all appear in lecturer name
                words = pattern.replace('Prof.', '').replace('Dr.', '').replace('.', '').split()
                for word in words:
                    if len(word) > 2:  # Skip titles and short words
                        supervisor_conditions.append(models.Lecturer.name.ilike(f"%{word}%"))
            
            if supervisor_conditions:
                from sqlalchemy import or_
                supervisor_match = or_(*supervisor_conditions)
        
        # Combine lecturer match with supervisor match
        if supervisor_match is not None:
            query = query.filter(lecturer_match | supervisor_match)
        else:
            query = query.filter(lecturer_match)
    
    return query.order_by(models.Lecturer.name.asc()).all()


@router.post("", response_model=schemas.LecturerOut)
def create_lecturer(
    payload: schemas.LecturerCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    data = payload.model_dump()
    if data.get("alumni_student_id"):
        data["is_alumni_student"] = True
    _validate_lecturer_payload(data)
    record = models.Lecturer(**data)
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

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("alumni_student_id"):
        update_data.setdefault("is_alumni_student", True)
    _validate_lecturer_payload(update_data)

    for key, value in update_data.items():
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


@router.post("/{lecturer_id}/courses", response_model=schemas.LecturerCourseOut)
def add_lecturer_course(
    lecturer_id: int,
    payload: LecturerCourseCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    lecturer = db.get(models.Lecturer, lecturer_id)
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found")
    
    course = models.LecturerCourse(
        lecturer_id=lecturer_id,
        course_name=payload.course_name,
        subject=payload.subject,
        semester=payload.semester,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{lecturer_id}/courses/{course_id}")
def delete_lecturer_course(
    lecturer_id: int,
    course_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    course = db.get(models.LecturerCourse, course_id)
    if not course or course.lecturer_id != lecturer_id:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.delete(course)
    db.commit()
    return {"ok": True}
