# CRM SGL Webapp

Full CRM web application for Studiengangsleitung with:
- FastAPI backend + SQLite (DB path via `.env`)
- JWT auth with seeded users `Hannes` (admin) and `Diana` (editor)
- CRUD REST API for partners, lecturers, students/alumni
- Status history timeline
- Webhook ingest endpoint
- CSV export endpoints
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

### Lecturers
- `GET /api/lecturers?q=...` - list/search
- `POST /api/lecturers` - create
- `PUT /api/lecturers/{lecturer_id}` - update
- `DELETE /api/lecturers/{lecturer_id}` - delete

### Students/Alumni
- `GET /api/students?q=...` - list/search
- `POST /api/students` - create
- `PUT /api/students/{student_id}` - update (status changes tracked)
- `DELETE /api/students/{student_id}` - delete

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

## Notes

- SQLite DB file location is controlled by `DB_PATH` in `backend/.env`.
- CORS origins are configured through `CORS_ORIGINS` in `backend/.env`.
- API docs available at `http://localhost:8000/docs`.
