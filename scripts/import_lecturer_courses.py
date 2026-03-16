#!/usr/bin/env python3
"""
Import lecturer-course assignments from semester plan CSVs.
Reads CSV files from ~/Downloads/, matches lecturers to DB, and populates lecturer_courses table.
"""

import csv
import re
import sqlite3
from pathlib import Path
from typing import List, Dict, Tuple
import sys

# Database path
DB_PATH = Path.home() / ".openclaw/workspace/crm_sgl/backend/data/crm.db"

# CSV directory
CSV_DIR = Path.home() / "Downloads"

# Semester plan CSV files
SEMESTER_FILES = [
    "HD21A21 - 2. Semester 21_22 - Veranstaltungsübersicht.csv",
    "HD23A23 - 2. Semester 23_24 - Veranstaltungsübersicht.csv",
    "HD23A23 - 5. Semester 25_26 - Veranstaltungsübersicht.csv",
]

# Known cohort mappings from filenames
COHORT_MAP = {
    "HD21A21": "HD21A21",
    "HD22A21": "HD22A21",
    "HD23A23": "HD23A23",
    "HD24B21": "HD24B21",
    "HD25A23": "HD25A23",
}


def extract_cohort_from_filename(filename: str) -> str:
    """Extract cohort code from filename."""
    for code in COHORT_MAP.keys():
        if code in filename:
            return COHORT_MAP[code]
    return "UNKNOWN"


def parse_csv_file(filepath: Path, cohort: str) -> List[Dict]:
    """
    Parse a semester plan CSV and extract course assignments.
    Returns list of dicts: {lecturer, course_name, subject, semester}
    
    CSV Structure:
    - Column 0: Module name (only on module header rows)
    - Column 1: Veranstaltung (course name)
    - Column 2: Kurzform (abbreviation/subject)
    - Column 3: Dozent (lecturer name)
    - Column 4+: CP, UE Soll, etc.
    
    Course rows have EMPTY column 0; module rows have text in column 0.
    """
    assignments = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    # Find header row (contains "Modul", "Veranstaltung", "Dozent")
    header_idx = None
    for i, row in enumerate(rows):
        if len(row) > 3 and 'Modul' in row and 'Veranstaltung' in row:
            header_idx = i
            break
    
    if header_idx is None:
        print(f"⚠️  Warning: No header found in {filepath.name}")
        return assignments
    
    # Process rows after header
    for i in range(header_idx + 1, len(rows)):
        row = rows[i]
        
        if len(row) < 5:  # Need at least 5 columns for course rows
            continue
        
        # Detect row type by checking first two columns:
        # - Module rows: col[0] empty, col[1] has text (module name)
        # - Course rows: col[0] AND col[1] both empty, col[2] has course name
        
        col0 = row[0].strip() if len(row) > 0 else ""
        col1 = row[1].strip() if len(row) > 1 else ""
        col2 = row[2].strip() if len(row) > 2 else ""
        col3 = row[3].strip() if len(row) > 3 else ""
        col4 = row[4].strip() if len(row) > 4 else ""
        
        # Skip module header rows (col0 empty, col1 not empty)
        if not col0 and col1:
            continue
        
        # Course rows: col0 and col1 both empty
        if not col0 and not col1:
            course_name = col2  # Veranstaltung
            subject = col3      # Kurzform
            lecturer = col4     # Dozent
        else:
            # Unexpected format - skip
            continue
        
        # Skip empty course rows
        if not course_name or not lecturer:
            continue
        
        # Skip rows with "1. Semester", "6. Sem.", etc. (references to other semesters)
        if re.search(r'\d+\.\s*Sem', lecturer, re.IGNORECASE):
            continue
        
        # Skip placeholder/TBD lecturers
        if lecturer.lower() in ['tbd', 'n.n.', 'offen', '']:
            continue
        
        # Skip rows where lecturer is just numbers or special chars
        if not re.search(r'[A-Za-zÄÖÜäöüß]', lecturer):
            continue
        
        assignments.append({
            'lecturer': lecturer,
            'course_name': course_name,
            'subject': subject,
            'semester': cohort
        })
    
    return assignments


def normalize_lecturer_name(name: str) -> str:
    """
    Normalize lecturer name for matching.
    - Remove titles (Prof., Dr., etc.)
    - Strip whitespace
    - Convert to lowercase
    """
    name = re.sub(r'\b(Prof\.|Dr\.|B\.?A\.?|M\.?A\.?|M\.?Sc\.?)\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+', ' ', name).strip()
    return name.lower()


def match_lecturer_to_db(lecturer_name: str, cursor) -> int | None:
    """
    Try to match lecturer name from CSV to a DB entry.
    Returns lecturer_id or None if no match.
    """
    normalized = normalize_lecturer_name(lecturer_name)
    
    # Get all lecturers from DB
    cursor.execute("SELECT id, name FROM lecturers WHERE is_active = 1")
    lecturers = cursor.fetchall()
    
    for lec_id, db_name in lecturers:
        db_normalized = normalize_lecturer_name(db_name)
        
        # Try full name match (bidirectional substring)
        if normalized in db_normalized or db_normalized in normalized:
            return lec_id
        
        # Try last name extraction (assume last word is last name)
        csv_parts = normalized.split()
        db_parts = db_normalized.split()
        
        if len(csv_parts) > 0 and len(db_parts) > 0:
            csv_last = csv_parts[-1]
            db_last = db_parts[-1]
            
            # Match if last names match and are significant (>3 chars)
            if len(csv_last) > 3 and len(db_last) > 3 and csv_last == db_last:
                return lec_id
    
    return None


def import_assignments(dry_run=False):
    """Main import function."""
    
    # Connect to DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Collect all assignments from CSV files
    all_assignments = []
    
    print("📂 Reading semester plan CSV files...\n")
    
    for filename in SEMESTER_FILES:
        filepath = CSV_DIR / filename
        
        if not filepath.exists():
            print(f"⚠️  Skipping {filename} (not found)")
            continue
        
        cohort = extract_cohort_from_filename(filename)
        assignments = parse_csv_file(filepath, cohort)
        
        print(f"✅ {filename}")
        print(f"   Cohort: {cohort}, Assignments found: {len(assignments)}")
        
        all_assignments.extend(assignments)
    
    print(f"\n📊 Total assignments extracted: {len(all_assignments)}\n")
    
    # Match and import
    matched = 0
    unmatched = []
    duplicates = 0
    inserted = 0
    
    print("🔄 Matching lecturers and importing...\n")
    
    for assignment in all_assignments:
        lecturer_name = assignment['lecturer']
        course_name = assignment['course_name']
        subject = assignment['subject']
        semester = assignment['semester']
        
        # Match lecturer
        lecturer_id = match_lecturer_to_db(lecturer_name, cursor)
        
        if lecturer_id is None:
            unmatched.append(f"{lecturer_name} → {course_name} ({semester})")
            continue
        
        matched += 1
        
        # Check if assignment already exists
        cursor.execute("""
            SELECT id FROM lecturer_courses
            WHERE lecturer_id = ? AND course_name = ? AND semester = ?
        """, (lecturer_id, course_name, semester))
        
        existing = cursor.fetchone()
        
        if existing:
            duplicates += 1
            continue
        
        # Insert new assignment
        if not dry_run:
            cursor.execute("""
                INSERT INTO lecturer_courses (lecturer_id, course_name, subject, semester)
                VALUES (?, ?, ?, ?)
            """, (lecturer_id, course_name, subject, semester))
            inserted += 1
        else:
            print(f"  [DRY RUN] Would insert: {lecturer_name} → {course_name} ({semester})")
            inserted += 1
    
    if not dry_run:
        conn.commit()
    
    # Summary
    print("\n" + "="*60)
    print("📊 IMPORT SUMMARY")
    print("="*60)
    print(f"Total assignments extracted:  {len(all_assignments)}")
    print(f"✅ Matched to DB lecturers:    {matched}")
    print(f"❌ Unmatched (no DB entry):    {len(unmatched)}")
    print(f"🔁 Duplicates (already exist): {duplicates}")
    print(f"➕ New assignments inserted:   {inserted}")
    print("="*60)
    
    if unmatched:
        print("\n⚠️  UNMATCHED LECTURERS:")
        for item in unmatched[:20]:  # Show first 20
            print(f"  - {item}")
        if len(unmatched) > 20:
            print(f"  ... and {len(unmatched) - 20} more")
    
    conn.close()
    
    return {
        'total': len(all_assignments),
        'matched': matched,
        'unmatched': len(unmatched),
        'duplicates': duplicates,
        'inserted': inserted,
        'unmatched_list': unmatched
    }


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    
    if dry_run:
        print("🧪 DRY RUN MODE (no DB changes)\n")
    
    try:
        result = import_assignments(dry_run=dry_run)
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
