import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import require_editor_or_admin

router = APIRouter(prefix="/api/export", tags=["export"])

EXPORT_QUERIES = {
    "partner_companies": "SELECT * FROM partner_companies",
    "partner_contacts": "SELECT * FROM partner_contacts",
    "lecturers": "SELECT * FROM lecturers",
    "students_alumni": "SELECT * FROM students_alumni",
    "status_history": "SELECT * FROM status_history",
    "webhook_events": "SELECT * FROM webhook_events",
    "notes_ideas": "SELECT * FROM notes_ideas",
}


@router.get("/{table_name}.csv")
def export_csv(
    table_name: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_editor_or_admin),
):
    query = EXPORT_QUERIES.get(table_name)
    if not query:
        raise HTTPException(status_code=404, detail="Table not exportable")

    result = db.execute(text(query))
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(result.keys())
    writer.writerows(result.fetchall())
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{table_name}.csv"'},
    )
