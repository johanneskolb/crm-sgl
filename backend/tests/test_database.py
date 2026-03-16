import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database import Database
from models import Lecturer, Student, Partner, NoteIdea, LecturerAffiliation, QualityEvaluation

class TestDatabase:
    @pytest.fixture
    def db(self):
        test_db = Database(db_path=':memory:')
        yield test_db
        test_db.close()
    
    def test_create_lecturer_with_new_fields(self, db):
        lecturer = db.create_lecturer(
            name="Test Professor",
            contact="test@example.com",
            nationality="German",
            affiliation=LecturerAffiliation.UNIVERSITY,
            professional_experience="10 Jahre Erfahrung",
            remarks="Sehr guter Dozent",
            quality_evaluation=QualityEvaluation.EXCELLENT,
            contact_from="LinkedIn",
            teaches_german=True,
            teaches_english=True,
            can_guest_lecture_only=False
        )
        assert lecturer is not None
        assert lecturer['nationality'] == "German"
        assert lecturer['affiliation'] == "university"
    
    def test_student_becomes_lecturer(self, db):
        student = db.create_student(
            name="Max Mustermann",
            cohort="2023",
            company="Test GmbH",
            became_lecturer=False
        )
        
        # Simulate update
        db.update_student(student['id'], became_lecturer=True)
        
        # Check if lecturer was created
        lecturers = db.list_lecturers()
        assert len(lecturers) == 1
        assert lecturers[0]['is_alumni_student'] == True
    
    def test_create_note_idea(self, db):
        note = db.create_note_idea(
            title="Test Idee",
            content="Das ist eine Testidee",
            tags="strategie, wichtig"
        )
        assert note is not None
        assert note['title'] == "Test Idee"
    
    def test_partner_status_alumni_irm(self, db):
        partner = db.create_partner(
            name="Test Partner",
            status="Alumni IRM"
        )
        assert partner['status'] == "Alumni IRM"

if __name__ == '__main__':
    pytest.main([__file__, '-v'])