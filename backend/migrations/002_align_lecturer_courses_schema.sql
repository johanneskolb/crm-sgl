-- Rename columns in lecturer_courses to match models.py
-- short_name -> subject
-- cohort -> semester

-- SQLite doesn't support ALTER COLUMN RENAME directly pre-3.25.0
-- So we'll create a new table and copy data

CREATE TABLE lecturer_courses_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lecturer_id INTEGER NOT NULL,
    course_name VARCHAR(50) NOT NULL,
    subject VARCHAR(255) DEFAULT '',
    semester VARCHAR(50) DEFAULT '',
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE
);

-- Copy data (short_name -> subject, cohort -> semester)
INSERT INTO lecturer_courses_new (id, lecturer_id, course_name, subject, semester)
SELECT id, lecturer_id, course_name, short_name, cohort
FROM lecturer_courses;

-- Drop old table
DROP TABLE lecturer_courses;

-- Rename new table
ALTER TABLE lecturer_courses_new RENAME TO lecturer_courses;
