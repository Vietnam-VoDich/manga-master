from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User
from fastapi import Depends
import stripe, os

router = APIRouter()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid signature")

    if event["type"] == "checkout.session.completed":
        data = event["data"]["object"]
        user_id = data["metadata"].get("user_id")
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_subscribed = True
            user.stripe_customer_id = data.get("customer")
            user.stripe_subscription_id = data.get("subscription")
            db.commit()

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        sub = event["data"]["object"]
        user = db.query(User).filter(User.stripe_subscription_id == sub["id"]).first()
        if user:
            user.is_subscribed = False
            db.commit()

    return {"ok": True}
