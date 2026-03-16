-- Migration: Add source column to notes_ideas table
-- Date: 2024-03-15
-- Description: Add a 'source' field to track who the note/idea is from

ALTER TABLE notes_ideas ADD COLUMN source VARCHAR(255) DEFAULT '' NOT NULL;
