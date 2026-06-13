# Delhi Police — Unified Digital Inventory System

> A centralized, role-based software inventory management platform for Delhi Police, covering 62 districts and units across Delhi with JWT-secured access, structured data capture, an approval workflow, and an AI chatbot assistant.

---

## ⚠️ Data Disclaimer

All data used in this project — including user names, badge IDs, submission entries, and software references — is either publicly available information or synthetically generated mock data created solely for demonstration purposes. No confidential, classified, or internal Delhi Police data has been used or included at any point. District and unit names are publicly listed on the Delhi Police official website. Software names referenced (CCTNS, ZIPNET, Dial 112 etc.) are publicly known government systems mentioned in public reports and news articles. This prototype does not represent any official Delhi Police system or product.

## Problem Statement

62 districts and units across Delhi Police each run different digital and software solutions with zero central visibility. There is no way to track what software exists, who owns it, what data it handles, or whether it was ever formally approved. This creates serious confidentiality, integrity, and accountability risks across the organization.

---

## Solution

A full-stack web portal where every software deployment gets registered by an officer via a structured 4-section form, monitored by an admin, and approved or rejected by a superadmin — with complete audit logging at every step and an AI chatbot assistant scoped to each role.

---

## Key Numbers

| Metric | Value |
|---|---|
| Districts and units covered | 62 |
| Districts seeded | 15 |
| Units seeded | 45 |
| User roles | 3 (officer, admin, superadmin) |
| Database tables | 7 |
| API endpoints | 15+ |
| Seeded submissions | 25+ |
| Seeded users | 12 |
| Submission form sections | 4 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, Vite |
| Backend | FastAPI (Python) |
| Database | SQLite + SQLAlchemy ORM |
| Authentication | JWT (role baked into token) |
| Password hashing | bcrypt |
| AI Chatbot | Pluggable (Anthropic / Gemini ready) |

---

## Features

### Officer
- Submit software entries via a 4-section structured form
- Track submission status in real time (pending / approved / rejected)
- Click any submission to open a full detail modal with all fields, rejection reason, and status timeline
- Edit and resubmit rejected entries
- AI chatbot scoped strictly to own submissions data

### Admin
- Global view of all submissions across all 62 districts and units
- Filter by district, status, app type, and data type
- Full detail modal on any submission (read-only, no approve/reject)
- Analytics tab with breakdown by data type, app type, server type
- AI chatbot with analytical scope across all submissions

### Superadmin
- Approve or reject any submission with a mandatory reason on rejection
- Full analytics dashboard with 4 summary cards and 3 breakdown charts
- User management — view all users, change roles, add new users
- Custom form builder (My Fields) — create dynamic fields that appear on the officer submission form
- AI chatbot with deepest access (submissions + users + audit data) with a visual Deep Access indicator

### Public Portal
- Accessible without login
- Live system stats pulled from backend
- Full submission form visible to browse, submit locked behind login
- Embedded login with automatic role-based dashboard redirect after login

---

## CIA Triad Implementation

| Principle | Implementation |
|---|---|
| Confidentiality | Role-based data gating at API level. Data classification on every submission (public / restrictive / confidential). Officers cannot see other officers' data. |
| Integrity | Approval workflow enforced. Every status change logged to audit_logs with actor and timestamp. Officers cannot approve their own submissions. |
| Availability | Real-time status tracking on officer dashboard. Always-queryable analytics. Audit trail always accessible to superadmin. |

---

## Database Schema

| Table | Purpose |
|---|---|
| `districts` | 15 Delhi Police districts |
| `units` | 45 units distributed across districts |
| `users` | Badge ID, hashed password, role, rank, district, unit |
| `submissions` | Full 4-section form data + approval tracking fields |
| `audit_logs` | Every status change with actor, timestamp, old and new status |
| `custom_fields` | Superadmin-defined dynamic fields for the submission form |
| `custom_field_responses` | Officer responses to custom fields per submission |

---

## Submission Form — 4 Sections

| Section | Fields |
|---|---|
| App Details | App name, type (in-house / vendor / commercial), vendor name, version, purpose, district, unit |
| Deployment Info | Storage location, device config, custodian name, custodian badge ID, number of users |
| Server Details | Server type (cloud / on-prem / hybrid), provider, capacity, physical location |
| Data Classification | Data type (public / restrictive / confidential), justification text |

---

## Project Structure

delhi_police_inventory/

├── main.py                    # FastAPI app entry point

├── auth.py                    # JWT helpers, password hashing, role dependencies

├── models.py                  # SQLAlchemy ORM models

├── schemas.py                 # Pydantic request/response schemas

├── database.py                # DB engine and session setup

├── custom_fields_models.py    # ORM models for custom fields feature

├── seed.py                    # Seeds all mock data

├── requirements.txt

└── routes/

├── auth.py                # Login endpoint

├── submissions.py         # Full CRUD for submissions

├── approvals.py           # Approve/reject workflow

├── analytics.py           # Summary and breakdown analytics

├── users.py               # User management (superadmin only)

├── districts.py           # Districts and units endpoints

├── custom_fields.py       # Custom fields CRUD + responses

└── chat.py                # Chatbot endpoints for all 3 roles
frontend/

├── src/

│   ├── pages/

│   │   ├── Login.jsx

│   │   ├── OfficerDashboard.jsx

│   │   ├── AdminPanel.jsx

│   │   ├── SuperAdminDashboard.jsx

│   │   ├── SubmissionForm.jsx

│   │   └── Portal.jsx

│   ├── components/

│   │   ├── ChatWidget.jsx

│   │   ├── MyFieldsTab.jsx

│   │   ├── SubmissionDetailModal.jsx

│   │   └── AddUserModal.jsx

│   └── api.js                 # All axios API calls

---

## Running Locally

### 1. Backend

```bash
cd delhi_police_inventory
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
./node_modules/.bin/vite
```

Frontend runs at `http://localhost:5174`

---

## Demo Credentials

| Badge ID | Role | Password |
|---|---|---|
| DP0001 | Superadmin | Delhi@1234 |
| DP0002 | Admin | Delhi@1234 |
| DP0005 | Officer | Delhi@1234 |

---

*Built as a prototype for educational and portfolio purposes only. All data is synthetic. Not an official Delhi Police product.*
