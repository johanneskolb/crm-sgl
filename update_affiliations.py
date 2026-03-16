import csv
import sys
sys.path.insert(0, '/home/clawdy/.openclaw/workspace/crm_sgl/backend')

from app.database import SessionLocal, engine
from app import models

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

def determine_affiliation(organization):
    """Determine if Company or University based on organization name"""
    if not organization:
        return "Company"
    
    org_lower = organization.lower()
    
    # University keywords
    uni_keywords = ['university', 'universität', 'college', 'institute', 'institut', 
                    'hochschule', 'school', 'academy', 'academia']
    
    for keyword in uni_keywords:
        if keyword in org_lower:
            return "University"
    
    # Company keywords (default)
    return "Company"

def update_lecturers():
    db = SessionLocal()
    updated = 0
    
    # CSV data
    csv_data = [
        ("Walter Dr. Döring", "Wirtschaftsminister a.D. BW", "Company"),
        ("Sebastian Vermeyen", "Kaufland", "Company"),
        ("Marcel Mekelburg", "Lidl", "Company"),
        ("Harald Schüller", "Lidl", "Company"),
        ("Martin Furling", "INSTITUTO TECNOLÓGICO Y DE ESTUDIOS SUPERIORES DE MONTERREY (TEC), Monterrey, Mexico", "University"),
        ("Martin Schlumberger", "Selbständig", "Company"),
        ("Finn Heuchert", "Tecis Finanzdienstleistungen", "Company"),
        ("Felix Köhler", "", ""),
        ("Franziska Noll", "Lidl", "Company"),
        ("Tereza Wiest", "Ex-Lidl", "Company"),
        ("Tamar Magalashvili", "Ilia State University Tbilisi, Georgia", "University"),
        ("Lars Plonz", "", ""),
    ]
    
    for name, organization, affiliation in csv_data:
        if not organization:
            continue
            
        # Find lecturer by name
        lecturer = db.query(models.Lecturer).filter(models.Lecturer.name == name).first()
        
        if lecturer:
            # Determine affiliation if not provided
            if not affiliation:
                affiliation = determine_affiliation(organization)
            
            lecturer.organization = organization
            lecturer.affiliation = affiliation
            print(f"✅ Updated: {name}")
            print(f"   Organization: {organization}")
            print(f"   Affiliation: {affiliation}")
            updated += 1
        else:
            print(f"⚠️  Not found: {name}")
    
    db.commit()
    db.close()
    
    print(f"\n{'='*50}")
    print(f"Updated {updated} lecturers")
    print(f"{'='*50}")

if __name__ == '__main__':
    update_lecturers()
