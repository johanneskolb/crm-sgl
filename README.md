# CRM SGL Webapp

Full CRM web application for Studiengangsleitung with:
- FastAPI backend + SQLite (DB path via `.env`)
- JWT auth with seeded users `Hannes` (admin) and `Diana` (editor)
- CRUD REST API for partners, lecturers, students/alumni
- Lecturer enhancements (affiliation, nationality, professional experience, language flags, quality evaluation, alumni link)
- Student -> lecturer conversion via `became_lecturer`
- Notes & Ideas module (title/content/date/tags)
- Status history timeline
- Webhook ingest endpoint
- CSV export endpoints (incl. Notes & Ideas)
- React frontend with responsive dashboard/forms/search/status badges/timeline
- CORS support and Docker Compose setup

## Project Structure

```text
crm_sgl/
  backend/
    app/
    requirements.txt
    .env.example
    Dockerfile
  frontend/
    src/
    package.json
    .env.example
    Dockerfile
  docker-compose.yml
  .env.example
  .gitignore
```

## Quick Start (Local)

### 1) Backend

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

In a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8000`

## Default Users

Users are seeded automatically on backend startup:
- `Hannes` (role: `admin`, password from `HANNES_PASSWORD`)
- `Diana` (role: `editor`, password from `DIANA_PASSWORD`)

Change both passwords in `backend/.env` before production use.

## Docker Compose

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

## CLI (lokal)

Die CLI nutzt dieselbe SQLite-Datenbank (Standard: `crm.db`) und fuehrt beim Start eine leichte Migration aus (z.B. `expertise` -> `professional_experience`, neue Dozentenfelder, Notes & Ideas). Start:

```bash
python3 main.py
```

Features in der CLI:
- Partnerstatus inkl. `Alumni IRM`
- Dozentenfelder inkl. Nationalitaet, Zugehoerigkeit, Berufserfahrung, Sprachflags, Qualitaet, Alumni-Link
- Studierende/Alumni inkl. `became_lecturer` (erstellt automatisch ein Dozentenprofil)
- Notes & Ideas CRUD
- CSV-Export inkl. Notes & Ideas

## API Overview

Auth required for all `/api/*` endpoints except `/health` and `/api/auth/login`.

### Auth
- `POST /api/auth/login` - OAuth2 password login, returns JWT
- `GET /api/auth/me` - current user

### Dashboard
- `GET /api/dashboard` - aggregate counts

### Partners
- `GET /api/partners?q=...` - list/search
- `POST /api/partners` - create
- `GET /api/partners/{partner_id}` - get one
- `PUT /api/partners/{partner_id}` - update
- `DELETE /api/partners/{partner_id}` - delete
- `GET /api/partners/{partner_id}/contacts` - contact timeline
- `POST /api/partners/{partner_id}/contacts` - add contact
- Status list includes `Alumni IRM`

### Lecturers
- `GET /api/lecturers?q=...` - list/search (incl. professional experience, languages, remarks)
- `POST /api/lecturers` - create
- `PUT /api/lecturers/{lecturer_id}` - update
- `DELETE /api/lecturers/{lecturer_id}` - delete
- Fields: nationality, affiliation, professional_experience, remarks, quality_evaluation, contact_from, language flags, guest lecture only, alumni link

### Students/Alumni
- `GET /api/students?q=...` - list/search
- `POST /api/students` - create
- `PUT /api/students/{student_id}` - update (status changes tracked)
- `DELETE /api/students/{student_id}` - delete
- `became_lecturer=true` auto-creates a lecturer profile linked back to the student

### Notes & Ideas
- `GET /api/notes?q=...` - list/search
- `POST /api/notes` - create
- `PUT /api/notes/{note_id}` - update
- `DELETE /api/notes/{note_id}` - delete

### Status History (Timeline)
- `GET /api/history?entity_type=partner|student&entity_id={id}` - status changes

### Webhooks
- `POST /api/webhooks/ingest` - store incoming event payload
- `GET /api/webhooks` - list latest events

### CSV Export
- `GET /api/export/partner_companies.csv`
- `GET /api/export/partner_contacts.csv`
- `GET /api/export/lecturers.csv`
- `GET /api/export/students_alumni.csv`
- `GET /api/export/status_history.csv`
- `GET /api/export/webhook_events.csv`
- `GET /api/export/notes_ideas.csv`

## Notes

- SQLite DB file location is controlled by `DB_PATH` in `backend/.env`.
- Backend startup performs a lightweight SQLite schema update (adds new columns, keeps existing data intact).
- CORS origins are configured through `CORS_ORIGINS` in `backend/.env`.
- API docs available at `http://localhost:8000/docs`.
