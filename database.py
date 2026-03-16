"""SQLite-Zugriffsschicht fuer das CRM-System."""

from __future__ import annotations

import csv
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Optional


PARTNER_STATUSES = (
    "Interessent",
    "In Gespraechen",
    "Verhandlung",
    "Aktiver Partner",
    "Alumni",
    "Alumni IRM",
)

STUDENT_STATUSES = ("Aktiv", "Alumni")

LECTURER_AFFILIATIONS = ("Company", "University")
LECTURER_QUALITY_EVALUATIONS = (
    "excellent",
    "good",
    "average",
    "poor",
    "not_evaluated",
)


class Database:
    """Kapselt alle Datenbankoperationen."""

    def __init__(self, db_path: str = "crm.db") -> None:
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        cursor = self.conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS partner_companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                industry TEXT NOT NULL,
                location TEXT NOT NULL,
                contact_person TEXT NOT NULL,
                status TEXT NOT NULL,
                topics TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS partner_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                partner_id INTEGER NOT NULL,
                contact_date TEXT NOT NULL,
                channel TEXT NOT NULL,
                summary TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(partner_id) REFERENCES partner_companies(id)
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS lecturers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact TEXT NOT NULL,
                nationality TEXT NOT NULL DEFAULT '',
                affiliation TEXT NOT NULL DEFAULT '',
                professional_experience TEXT NOT NULL DEFAULT '',
                remarks TEXT NOT NULL DEFAULT '',
                quality_evaluation TEXT NOT NULL DEFAULT 'not_evaluated',
                contact_from TEXT NOT NULL DEFAULT '',
                can_lecture INTEGER NOT NULL,
                can_supervise INTEGER NOT NULL,
                lectures_held TEXT NOT NULL DEFAULT '',
                focus_topics TEXT NOT NULL DEFAULT '',
                did_not_lecture_yet_but_interested INTEGER NOT NULL DEFAULT 0,
                did_not_supervise_yet_but_interested INTEGER NOT NULL DEFAULT 0,
                teaches_german INTEGER NOT NULL DEFAULT 0,
                teaches_english INTEGER NOT NULL DEFAULT 0,
                can_guest_lecture_only INTEGER NOT NULL DEFAULT 0,
                is_alumni_student INTEGER NOT NULL DEFAULT 0,
                alumni_student_id INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS students_alumni (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cohort TEXT NOT NULL,
                company TEXT NOT NULL,
                status TEXT NOT NULL,
                lecturer_potential INTEGER NOT NULL,
                became_lecturer INTEGER NOT NULL DEFAULT 0,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS notes_ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                note_date TEXT NOT NULL,
                tags TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS status_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id INTEGER NOT NULL,
                old_status TEXT NOT NULL,
                new_status TEXT NOT NULL,
                changed_at TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT ''
            )
            """
        )

        self.conn.commit()
        self._migrate_schema()

    def _column_exists(self, table: str, column: str) -> bool:
        cursor = self.conn.cursor()
        rows = cursor.execute(f"PRAGMA table_info({table})").fetchall()
        return any(row[1] == column for row in rows)

    def _add_column(self, table: str, column: str, definition: str) -> None:
        cursor = self.conn.cursor()
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    def _migrate_schema(self) -> None:
        # Partnerunternehmen: keine neuen Spalten aktuell
        # Lecturer Migrationen
        lecturer_columns = {
            "nationality": "TEXT NOT NULL DEFAULT ''",
            "affiliation": "TEXT NOT NULL DEFAULT ''",
            "professional_experience": "TEXT NOT NULL DEFAULT ''",
            "remarks": "TEXT NOT NULL DEFAULT ''",
            "quality_evaluation": "TEXT NOT NULL DEFAULT 'not_evaluated'",
            "contact_from": "TEXT NOT NULL DEFAULT ''",
            "did_not_lecture_yet_but_interested": "INTEGER NOT NULL DEFAULT 0",
            "did_not_supervise_yet_but_interested": "INTEGER NOT NULL DEFAULT 0",
            "teaches_german": "INTEGER NOT NULL DEFAULT 0",
            "teaches_english": "INTEGER NOT NULL DEFAULT 0",
            "can_guest_lecture_only": "INTEGER NOT NULL DEFAULT 0",
            "is_alumni_student": "INTEGER NOT NULL DEFAULT 0",
            "alumni_student_id": "INTEGER",
        }
        for column, definition in lecturer_columns.items():
            if not self._column_exists("lecturers", column):
                self._add_column("lecturers", column, definition)

        # Migration expertise -> professional_experience (falls alte Spalte vorhanden)
        if self._column_exists("lecturers", "expertise"):
            cursor = self.conn.cursor()
            cursor.execute(
                """
                UPDATE lecturers
                SET professional_experience = COALESCE(NULLIF(professional_experience, ''), expertise)
                WHERE expertise IS NOT NULL AND expertise != ''
                """
            )

        # Students: became_lecturer Spalte
        if not self._column_exists("students_alumni", "became_lecturer"):
            self._add_column("students_alumni", "became_lecturer", "INTEGER NOT NULL DEFAULT 0")

        # Notes & Ideas: Tabelle kann fehlen
        if not self._column_exists("notes_ideas", "id"):
            cursor = self.conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS notes_ideas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    note_date TEXT NOT NULL,
                    tags TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

        self.conn.commit()

    @staticmethod
    def _now() -> str:
        return datetime.utcnow().isoformat(timespec="seconds")

    @staticmethod
    def _rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
        return [dict(row) for row in rows]

    def create_partner(
        self, name: str, industry: str, location: str, contact_person: str, status: str, topics: str
    ) -> int:
        if status not in PARTNER_STATUSES:
            raise ValueError("Ungueltiger Partner-Status")
        now = self._now()
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO partner_companies (name, industry, location, contact_person, status, topics, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (name, industry, location, contact_person, status, topics, now, now),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

    def list_partners(self) -> list[dict[str, Any]]:
        cursor = self.conn.cursor()
        rows = cursor.execute(
            "SELECT * FROM partner_companies ORDER BY updated_at DESC, name ASC"
        ).fetchall()
        return self._rows_to_dicts(rows)

    def search_partners(self, query: str) -> list[dict[str, Any]]:
        pattern = f"%{query.strip()}%"
        cursor = self.conn.cursor()
        rows = cursor.execute(
            """
            SELECT *
            FROM partner_companies
            WHERE name LIKE ? OR industry LIKE ? OR location LIKE ? OR contact_person LIKE ? OR topics LIKE ?
            ORDER BY updated_at DESC
            """,
            (pattern, pattern, pattern, pattern, pattern),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def add_partner_contact(self, partner_id: int, channel: str, summary: str) -> int:
        now = self._now()
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO partner_contacts (partner_id, contact_date, channel, summary, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (partner_id, now, channel, summary, now),
        )
        cursor.execute(
            "UPDATE partner_companies SET updated_at = ? WHERE id = ?",
            (now, partner_id),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

    def get_partner_contacts(self, partner_id: int) -> list[dict[str, Any]]:
        cursor = self.conn.cursor()
        rows = cursor.execute(
            """
            SELECT *
            FROM partner_contacts
            WHERE partner_id = ?
            ORDER BY contact_date DESC
            """,
            (partner_id,),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def update_partner_status(self, partner_id: int, new_status: str, note: str = "") -> None:
        if new_status not in PARTNER_STATUSES:
            raise ValueError("Ungueltiger Partner-Status")
        cursor = self.conn.cursor()
        row = cursor.execute(
            "SELECT status FROM partner_companies WHERE id = ?", (partner_id,)
        ).fetchone()
        if row is None:
            raise ValueError("Partnerunternehmen nicht gefunden")

        old_status = row["status"]
        now = self._now()
        cursor.execute(
            "UPDATE partner_companies SET status = ?, updated_at = ? WHERE id = ?",
            (new_status, now, partner_id),
        )
        cursor.execute(
            """
            INSERT INTO status_history (entity_type, entity_id, old_status, new_status, changed_at, note)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("partner", partner_id, old_status, new_status, now, note),
        )
        self.conn.commit()

    def create_lecturer(
        self,
        name: str,
        contact: str,
        nationality: str,
        affiliation: str,
        professional_experience: str,
        remarks: str,
        quality_evaluation: str,
        contact_from: str,
        can_lecture: bool,
        can_supervise: bool,
        lectures_held: str,
        focus_topics: str,
        did_not_lecture_yet_but_interested: bool,
        did_not_supervise_yet_but_interested: bool,
        teaches_german: bool,
        teaches_english: bool,
        can_guest_lecture_only: bool,
        is_alumni_student: bool,
        alumni_student_id: Optional[int],
    ) -> int:
        if affiliation and affiliation not in LECTURER_AFFILIATIONS:
            raise ValueError("Ungueltige Zugehoerigkeit")
        if quality_evaluation not in LECTURER_QUALITY_EVALUATIONS:
            raise ValueError("Ungueltige Qualitaetseinschaetzung")
        now = self._now()
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO lecturers
            (
                name, contact, nationality, affiliation, professional_experience, remarks,
                quality_evaluation, contact_from, can_lecture, can_supervise,
                lectures_held, focus_topics, did_not_lecture_yet_but_interested,
                did_not_supervise_yet_but_interested, teaches_german, teaches_english,
                can_guest_lecture_only, is_alumni_student, alumni_student_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                contact,
                nationality,
                affiliation,
                professional_experience,
                remarks,
                quality_evaluation,
                contact_from,
                int(can_lecture),
                int(can_supervise),
                lectures_held,
                focus_topics,
                int(did_not_lecture_yet_but_interested),
                int(did_not_supervise_yet_but_interested),
                int(teaches_german),
                int(teaches_english),
                int(can_guest_lecture_only),
                int(is_alumni_student),
                alumni_student_id,
                now,
                now,
            ),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

    def list_lecturers(self) -> list[dict[str, Any]]:
        cursor = self.conn.cursor()
        rows = cursor.execute("SELECT * FROM lecturers ORDER BY name ASC").fetchall()
        return self._rows_to_dicts(rows)

    def search_lecturers(self, query: str) -> list[dict[str, Any]]:
        pattern = f"%{query.strip()}%"
        cursor = self.conn.cursor()
        rows = cursor.execute(
            """
            SELECT *
            FROM lecturers
            WHERE name LIKE ? OR contact LIKE ?
                OR professional_experience LIKE ?
                OR lectures_held LIKE ? OR focus_topics LIKE ? OR remarks LIKE ?
            ORDER BY name ASC
            """,
            (pattern, pattern, pattern, pattern, pattern, pattern),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def create_student(
        self,
        name: str,
        cohort: str,
        company: str,
        status: str,
        lecturer_potential: bool,
        became_lecturer: bool,
        notes: str,
        lecturer_payload: Optional[dict[str, Any]] = None,
    ) -> int:
        if status not in STUDENT_STATUSES:
            raise ValueError("Ungueltiger Studierenden-Status")
        now = self._now()
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO students_alumni
            (name, cohort, company, status, lecturer_potential, became_lecturer, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                cohort,
                company,
                status,
                int(lecturer_potential),
                int(became_lecturer),
                notes,
                now,
                now,
            ),
        )
        student_id = int(cursor.lastrowid)

        if became_lecturer:
            payload = lecturer_payload or {}
            self.create_lecturer(
                name=name,
                contact=payload.get("contact", ""),
                nationality=payload.get("nationality", ""),
                affiliation=payload.get("affiliation", ""),
                professional_experience=payload.get("professional_experience", ""),
                remarks=payload.get("remarks", ""),
                quality_evaluation=payload.get("quality_evaluation", "not_evaluated"),
                contact_from=payload.get("contact_from", ""),
                can_lecture=payload.get("can_lecture", False),
                can_supervise=payload.get("can_supervise", False),
                lectures_held=payload.get("lectures_held", ""),
                focus_topics=payload.get("focus_topics", ""),
                did_not_lecture_yet_but_interested=payload.get(
                    "did_not_lecture_yet_but_interested", True
                ),
                did_not_supervise_yet_but_interested=payload.get(
                    "did_not_supervise_yet_but_interested", True
                ),
                teaches_german=payload.get("teaches_german", False),
                teaches_english=payload.get("teaches_english", False),
                can_guest_lecture_only=payload.get("can_guest_lecture_only", False),
                is_alumni_student=True,
                alumni_student_id=student_id,
            )

        self.conn.commit()
        return student_id

    def list_students(self) -> list[dict[str, Any]]:
        cursor = self.conn.cursor()
        rows = cursor.execute("SELECT * FROM students_alumni ORDER BY name ASC").fetchall()
        return self._rows_to_dicts(rows)

    def search_students(self, query: str) -> list[dict[str, Any]]:
        pattern = f"%{query.strip()}%"
        cursor = self.conn.cursor()
        rows = cursor.execute(
            """
            SELECT *
            FROM students_alumni
            WHERE name LIKE ? OR cohort LIKE ? OR company LIKE ? OR notes LIKE ?
            ORDER BY name ASC
            """,
            (pattern, pattern, pattern, pattern),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def update_student_status(self, student_id: int, new_status: str, note: str = "") -> None:
        if new_status not in STUDENT_STATUSES:
            raise ValueError("Ungueltiger Studierenden-Status")
        cursor = self.conn.cursor()
        row = cursor.execute(
            "SELECT status FROM students_alumni WHERE id = ?", (student_id,)
        ).fetchone()
        if row is None:
            raise ValueError("Studierende/Alumni nicht gefunden")

        old_status = row["status"]
        now = self._now()
        cursor.execute(
            "UPDATE students_alumni SET status = ?, updated_at = ? WHERE id = ?",
            (new_status, now, student_id),
        )
        cursor.execute(
            """
            INSERT INTO status_history (entity_type, entity_id, old_status, new_status, changed_at, note)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("student", student_id, old_status, new_status, now, note),
        )
        self.conn.commit()

    def get_status_history(self, entity_type: str, entity_id: int) -> list[dict[str, Any]]:
        cursor = self.conn.cursor()
        rows = cursor.execute(
            """
            SELECT *
            FROM status_history
            WHERE entity_type = ? AND entity_id = ?
            ORDER BY changed_at DESC
            """,
            (entity_type, entity_id),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def create_note(self, title: str, content: str, note_date: str, tags: str) -> int:
        now = self._now()
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO notes_ideas (title, content, note_date, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (title, content, note_date, tags, now, now),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

    def list_notes(self) -> list[dict[str, Any]]:
        cursor = self.conn.cursor()
        rows = cursor.execute(
            "SELECT * FROM notes_ideas ORDER BY note_date DESC, updated_at DESC"
        ).fetchall()
        return self._rows_to_dicts(rows)

    def search_notes(self, query: str) -> list[dict[str, Any]]:
        pattern = f"%{query.strip()}%"
        cursor = self.conn.cursor()
        rows = cursor.execute(
            """
            SELECT *
            FROM notes_ideas
            WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
            ORDER BY note_date DESC, updated_at DESC
            """,
            (pattern, pattern, pattern),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def update_note(self, note_id: int, title: str, content: str, note_date: str, tags: str) -> None:
        now = self._now()
        cursor = self.conn.cursor()
        cursor.execute(
            """
            UPDATE notes_ideas
            SET title = ?, content = ?, note_date = ?, tags = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, content, note_date, tags, now, note_id),
        )
        self.conn.commit()

    def delete_note(self, note_id: int) -> None:
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM notes_ideas WHERE id = ?", (note_id,))
        self.conn.commit()

    def export_csv(self, output_dir: str) -> list[str]:
        base = Path(output_dir)
        base.mkdir(parents=True, exist_ok=True)

        exports = {
            "partner_companies.csv": "SELECT * FROM partner_companies",
            "partner_contacts.csv": "SELECT * FROM partner_contacts",
            "lecturers.csv": "SELECT * FROM lecturers",
            "students_alumni.csv": "SELECT * FROM students_alumni",
            "notes_ideas.csv": "SELECT * FROM notes_ideas",
            "status_history.csv": "SELECT * FROM status_history",
        }

        written_files: list[str] = []
        cursor = self.conn.cursor()

        for file_name, query in exports.items():
            rows = cursor.execute(query).fetchall()
            target = base / file_name
            with target.open("w", newline="", encoding="utf-8") as csvfile:
                writer = csv.writer(csvfile)
                if rows:
                    writer.writerow(rows[0].keys())
                    writer.writerows([tuple(row) for row in rows])
            written_files.append(str(target))

        return written_files

    def close(self) -> None:
        self.conn.close()
