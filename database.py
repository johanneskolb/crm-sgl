"""SQLite-Zugriffsschicht fuer das CRM-System."""

from __future__ import annotations

import csv
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any


PARTNER_STATUSES = (
    "Interessent",
    "In Gespraechen",
    "Verhandlung",
    "Aktiver Partner",
    "Alumni",
)

STUDENT_STATUSES = ("Aktiv", "Alumni")


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
                expertise TEXT NOT NULL,
                can_lecture INTEGER NOT NULL,
                can_supervise INTEGER NOT NULL,
                lectures_held TEXT NOT NULL DEFAULT '',
                focus_topics TEXT NOT NULL DEFAULT '',
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
                notes TEXT NOT NULL DEFAULT '',
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
        expertise: str,
        can_lecture: bool,
        can_supervise: bool,
        lectures_held: str,
        focus_topics: str,
    ) -> int:
        now = self._now()
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO lecturers
            (name, contact, expertise, can_lecture, can_supervise, lectures_held, focus_topics, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                contact,
                expertise,
                int(can_lecture),
                int(can_supervise),
                lectures_held,
                focus_topics,
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
            WHERE name LIKE ? OR contact LIKE ? OR expertise LIKE ? OR lectures_held LIKE ? OR focus_topics LIKE ?
            ORDER BY name ASC
            """,
            (pattern, pattern, pattern, pattern, pattern),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def create_student(
        self,
        name: str,
        cohort: str,
        company: str,
        status: str,
        lecturer_potential: bool,
        notes: str,
    ) -> int:
        if status not in STUDENT_STATUSES:
            raise ValueError("Ungueltiger Studierenden-Status")
        now = self._now()
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO students_alumni
            (name, cohort, company, status, lecturer_potential, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (name, cohort, company, status, int(lecturer_potential), notes, now, now),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

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

    def export_csv(self, output_dir: str) -> list[str]:
        base = Path(output_dir)
        base.mkdir(parents=True, exist_ok=True)

        exports = {
            "partner_companies.csv": "SELECT * FROM partner_companies",
            "partner_contacts.csv": "SELECT * FROM partner_contacts",
            "lecturers.csv": "SELECT * FROM lecturers",
            "students_alumni.csv": "SELECT * FROM students_alumni",
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
