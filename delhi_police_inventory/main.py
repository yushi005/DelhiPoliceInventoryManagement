"""
main.py – FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routes import auth, submissions, approvals, analytics, users, districts, chat
from routes import custom_fields as custom_fields_router
import custom_fields_models

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Delhi Police Digital Inventory System",
    description=(
        "A role-based inventory management API for Delhi Police. "
        "Supports officers, district admins, and superadmins with "
        "JWT-secured endpoints for submissions, approvals, and analytics."
    ),
    version="1.0.0",
    contact={"name": "Delhi Police IT Cell"},
    license_info={"name": "Internal Use Only"},
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(submissions.router)
app.include_router(approvals.router)
app.include_router(analytics.router)
app.include_router(users.router)
app.include_router(districts.router)
app.include_router(chat.router)
app.include_router(custom_fields_router.router)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="Health check")
def root():
    return {"status": "ok", "service": "Delhi Police Inventory API", "version": "1.0.0"}
