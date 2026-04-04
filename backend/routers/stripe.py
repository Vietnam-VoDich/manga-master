from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User
from core.config import STRIPE_SECRET_KEY, STRIPE_PRICE_ID, FRONTEND_URL
from core.auth import verify_clerk_token
from pydantic import BaseModel
import stripe

router = APIRouter()
stripe.api_key = STRIPE_SECRET_KEY

class UserIdBody(BaseModel):
    user_id: str

@router.post("/checkout")
def create_checkout(body: UserIdBody, db: Session = Depends(get_db), _claims: dict = Depends(verify_clerk_token)):
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    session = stripe.checkout.Session.create(
        customer_email=user.email,
        line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
        mode="subscription",
        success_url=f"{FRONTEND_URL}/payment-success",
        cancel_url=f"{FRONTEND_URL}/pricing",
        metadata={"user_id": body.user_id},
    )
    return {"url": session.url}

@router.post("/portal")
def billing_portal(body: UserIdBody, db: Session = Depends(get_db), _claims: dict = Depends(verify_clerk_token)):
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user or not user.stripe_customer_id:
        raise HTTPException(404, "No billing info")
    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{FRONTEND_URL}/dashboard",
    )
    return {"url": session.url}
