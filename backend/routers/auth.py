from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User
from pydantic import BaseModel

router = APIRouter()

class UpsertUser(BaseModel):
    supabase_id: str
    email: str
    name: str | None = None

@router.post("/upsert")
def upsert_user(body: UpsertUser, db: Session = Depends(get_db)):
    """Called after Supabase login to sync user to our DB."""
    user = db.query(User).filter(User.supabase_id == body.supabase_id).first()
    if not user:
        user = User(supabase_id=body.supabase_id, email=body.email, name=body.name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"id": user.id, "is_subscribed": user.is_subscribed}

@router.get("/me/{supabase_id}")
def get_me(supabase_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.supabase_id == supabase_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user
