"""
routes/chat.py – Chatbot endpoints for all 3 roles.
NEW FILE. Reuses existing JWT auth. AI call is a placeholder — 
swap the _ai_response function later with Gemini or Anthropic.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from database import get_db
from models import Submission, User, StatusEnum
from auth import get_current_user, require_role

router = APIRouter(prefix="/chat", tags=["Chat"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


# ── Placeholder AI function (swap this later for real API) ────────────────────

def _ai_response(system_context: str, message: str, history: List[ChatMessage]) -> str:
    """
    Placeholder — returns a canned response.
    To integrate Gemini or Anthropic later, replace this function only.
    """
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["status", "pending", "approved", "rejected"]):
        return "I can see your submission statuses in the system. Please check the table on your dashboard for the latest status of each entry."
    if any(w in msg_lower for w in ["how", "submit", "form", "fill"]):
        return "To submit a new entry, click 'New Submission' in the top navigation. Fill all 4 sections and click Submit."
    if any(w in msg_lower for w in ["reject", "reason", "why"]):
        return "If a submission was rejected, the reason is shown in red on your dashboard. You can edit and resubmit it."
    if any(w in msg_lower for w in ["hello", "hi", "hey"]):
        return "Hello! I'm your inventory assistant. Ask me about your submissions, their status, or how to fill the form."
    return "I'm here to help with your inventory submissions. Ask me about status, rejection reasons, or how to submit."


# ── Officer chatbot ───────────────────────────────────────────────────────────

@router.post("/officer")
def officer_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("officer")),
):
    # Fetch only this officer's submissions
    subs = db.query(Submission).filter(Submission.user_id == current_user.id).all()
    
    context_lines = [
        f"You are a helpful assistant for Delhi Police officers.",
        f"Officer: {current_user.name}, Badge: {current_user.badge_id}",
        f"Total submissions: {len(subs)}",
        f"Pending: {sum(1 for s in subs if s.status == StatusEnum.pending)}",
        f"Approved: {sum(1 for s in subs if s.status == StatusEnum.approved)}",
        f"Rejected: {sum(1 for s in subs if s.status == StatusEnum.rejected)}",
    ]
    for s in subs:
        context_lines.append(
            f"- #{s.id} '{s.app_name}' | status={s.status.value} | type={s.app_type} | data={s.data_type}"
            + (f" | rejection='{s.rejection_reason}'" if s.rejection_reason else "")
        )
    
    context = "\n".join(context_lines)
    response = _ai_response(context, payload.message, payload.history)
    return {"response": response}


# ── Admin / Superadmin chatbot ────────────────────────────────────────────────

@router.post("/admin")
def admin_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin or superadmin only")

    subs = db.query(Submission).all()
    users = db.query(User).all() if current_user.role.value == "superadmin" else []

    pending = sum(1 for s in subs if s.status == StatusEnum.pending)
    approved = sum(1 for s in subs if s.status == StatusEnum.approved)
    rejected = sum(1 for s in subs if s.status == StatusEnum.rejected)

    context_lines = [
        f"You are an analytical assistant for Delhi Police inventory management.",
        f"Role: {current_user.role.value} | Name: {current_user.name}",
        f"Total submissions: {len(subs)} | Pending: {pending} | Approved: {approved} | Rejected: {rejected}",
    ]

    if current_user.role.value == "superadmin":
        context_lines.append(f"Total users in system: {len(users)}")
        context_lines.append(f"Officers: {sum(1 for u in users if u.role.value == 'officer')}")
        context_lines.append(f"Admins: {sum(1 for u in users if u.role.value == 'admin')}")

    context = "\n".join(context_lines)
    response = _ai_response(context, payload.message, payload.history)
    return {"response": response, "scope": current_user.role.value}

    