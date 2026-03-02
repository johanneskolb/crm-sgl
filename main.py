"""Einstiegspunkt fuer das CRM-System."""

from __future__ import annotations

from cli import CRMCLI
from database import Database


def main() -> None:
    """Startet die CRM-CLI."""
    db = Database(db_path="crm.db")
    try:
        CRMCLI(db).run()
    finally:
        db.close()


if __name__ == "__main__":
    main()
