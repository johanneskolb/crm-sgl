import csv
import re
import sys
sys.path.insert(0, '/home/clawdy/.openclaw/workspace/crm_sgl/backend')

from app.database import SessionLocal, engine
from app import models

# Create tables if they don't exist
print("Ensuring database tables exist...")
models.Base.metadata.create_all(bind=engine)
print("Tables ready!")

def extract_email(email_str):
    """Extract email from string like 'Name <email@domain.com>'"""
    if not email_str or email_str.strip() == '':
        return None
    match = re.search(r'<([^>]+)>', email_str)
    if match:
        return match.group(1)
    # If no angle brackets, check if it's a valid email
    if '@' in email_str and '.' in email_str:
        return email_str.strip()
    return None

def parse_languages(lang_str):
    """Parse language string to boolean flags"""
    if not lang_str:
        return False, False
    lang_lower = lang_str.lower()
    teaches_german = 'deutsch' in lang_lower or 'german' in lang_lower
    teaches_english = 'englisch' in lang_lower or 'english' in lang_lower
    return teaches_german, teaches_english

def parse_interest_pa_ba(interest_str):
    """Parse interest in PAs/BAs"""
    if not interest_str:
        return False, False
    interest_lower = interest_str.lower().strip()
    if interest_lower == 'ja' or interest_lower == 'yes':
        return True, True
    return False, False

def import_lecturers():
    db = SessionLocal()
    imported = 0
    skipped = 0
    
    with open('/home/clawdy/.openclaw/media/inbound/file_186---24b56ef3-348c-44f5-a449-f14c3d72bc77.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip empty rows
            if not row.get('Name') or row['Name'].strip() == '':
                continue
            # Skip non-lecturer rows (like "Ideen von...")
            if row['Name'].startswith('Ideen') or row['Name'].startswith('Super'):
                continue
                
            name = f"{row.get('Vorname', '').strip()} {row.get('Name', '').strip()}".strip()
            if not name or name == 'None':
                continue
            
            # Check if lecturer already exists
            existing = db.query(models.Lecturer).filter(models.Lecturer.name == name).first()
            if existing:
                print(f"⚠️  Skipping (already exists): {name}")
                skipped += 1
                continue
                
            email = extract_email(row.get('Email', ''))
            contact = email if email else row.get('Email', '')
            
            nationality = row.get('Nationalität', '')
            if '(' in nationality:
                nationality = nationality.split('(')[0].strip()
            
            professional_experience = row.get('Themen', '')
            remarks = row.get('Kommentar', '')
            affiliation = row.get('Unternehmen / Uni', '')
            contact_from = row.get('Kontakt über', '')
            
            teaches_german, teaches_english = parse_languages(row.get('Sprachen', ''))
            
            interest_pa, interest_ba = parse_interest_pa_ba(row.get('Interesse an PAs / BAs', ''))
            
            lecturer = models.Lecturer(
                name=name,
                contact=contact,
                nationality=nationality,
                affiliation=affiliation if affiliation else 'Extern',
                professional_experience=professional_experience,
                remarks=remarks,
                quality_evaluation='not_evaluated',
                contact_from=contact_from,
                can_lecture=True,
                can_supervise=False,
                lectures_held=row.get('eingesetzt in / Bereitschaft zu', ''),
                focus_topics=professional_experience,
                did_not_lecture_yet_but_interested=False,
                did_not_supervise_yet_but_interested=interest_ba,
                teaches_german=teaches_german,
                teaches_english=teaches_english,
                can_guest_lecture_only=False,
                is_alumni_student=False
            )
            
            db.add(lecturer)
            print(f"✅ Imported: {name} ({nationality}) - {affiliation}")
            imported += 1
    
    db.commit()
    db.close()
    
    print(f"\n{'='*50}")
    print(f"Import complete!")
    print(f"Imported: {imported}")
    print(f"Skipped (already exists): {skipped}")
    print(f"{'='*50}")

if __name__ == '__main__':
    import_lecturers()
