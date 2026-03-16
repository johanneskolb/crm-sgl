#!/usr/bin/env python3
"""Apply migration to add source column to notes_ideas table."""

import sqlite3
import sys
from pathlib import Path

def apply_migration(db_path: str = "database.db"):
    """Add source column to notes_ideas if it doesn't exist."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(notes_ideas)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'source' in columns:
            print(f"✓ Column 'source' already exists in notes_ideas table")
            return
        
        # Add the column
        print(f"Adding 'source' column to notes_ideas table...")
        cursor.execute("ALTER TABLE notes_ideas ADD COLUMN source VARCHAR(255) DEFAULT '' NOT NULL")
        conn.commit()
        print(f"✓ Successfully added 'source' column to notes_ideas table")
        
    except Exception as e:
        print(f"✗ Error applying migration: {e}", file=sys.stderr)
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "database.db"
    apply_migration(db_path)
