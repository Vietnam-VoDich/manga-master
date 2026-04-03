"""
Auth — Clerk handles the frontend auth flow.
Backend just verifies Clerk JWT and syncs user to our Postgres DB.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User
from pydantic import BaseModel
import httpx, os

router = APIRouter()
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


async def get_clerk_user(authorization: str = Header(...)) -> dict:
    """Verify Clerk session token and return user info."""
    token = authorization.removeprefix("Bearer ")
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.clerk.com/v1/tokens/verify",
            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
            params={"token": token},
        )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid token")
    return r.json()


class UpsertUser(BaseModel):
    clerk_id: str
    email: str
    name: str | None = None


@router.post("/upsert")
def upsert_user(body: UpsertUser, db: Session = Depends(get_db)):
    """Called after Clerk login to sync user into our DB."""
    user = db.query(User).filter(User.clerk_id == body.clerk_id).first()
    if not user:
        user = User(clerk_id=body.clerk_id, email=body.email, name=body.name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"id": user.id, "is_subscribed": user.is_subscribed}


@router.get("/me/{clerk_id}")
def get_me(clerk_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user
