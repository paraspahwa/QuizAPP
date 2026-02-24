"""
Razorpay Payment Integration for QuizAPP
=========================================
Backend routes for one-time payments and subscriptions.

Setup:
    pip install razorpay

Environment Variables (add to .env):
    RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
    RAZORPAY_KEY_SECRET=your_secret_key
"""

import os
import razorpay
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import hmac
import hashlib

# ─────────────────────────────────────────────
# Initialize Razorpay Client
# ─────────────────────────────────────────────
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_xxxxxxxxxxxx")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "your_secret_key")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

router = APIRouter(prefix="/payment", tags=["Payment"])


# ─────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────
class OrderRequest(BaseModel):
    amount: int  # Amount in paise (e.g., 49900 = ₹499)
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Optional[dict] = None


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class SubscriptionRequest(BaseModel):
    plan_id: str
    total_count: int = 12  # Number of billing cycles
    notes: Optional[dict] = None


class SubscriptionVerification(BaseModel):
    razorpay_subscription_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ─────────────────────────────────────────────
# ONE-TIME PAYMENT ROUTES
# ─────────────────────────────────────────────

@router.post("/create-order")
async def create_order(order_req: OrderRequest):
    """
    Step 1: Create a Razorpay order.
    Frontend calls this before showing the checkout popup.
    """
    try:
        order_data = {
            "amount": order_req.amount,
            "currency": order_req.currency,
            "receipt": order_req.receipt or f"order_{os.urandom(8).hex()}",
            "notes": order_req.notes or {},
        }
        order = client.order.create(data=order_data)
        return {
            "status": "success",
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID,  # Frontend needs this
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-payment")
async def verify_payment(verification: PaymentVerification):
    """
    Step 2: Verify payment signature after user completes payment.
    This ensures the payment wasn't tampered with.
    """
    try:
        # Generate expected signature
        message = f"{verification.razorpay_order_id}|{verification.razorpay_payment_id}"
        expected_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        if expected_signature == verification.razorpay_signature:
            # ✅ Payment is verified!
            # TODO: Update your database here
            # e.g., mark user as "premium", unlock quiz features, etc.
            return {
                "status": "success",
                "message": "Payment verified successfully",
                "payment_id": verification.razorpay_payment_id,
            }
        else:
            raise HTTPException(status_code=400, detail="Payment verification failed")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# SUBSCRIPTION ROUTES
# ─────────────────────────────────────────────

@router.post("/create-plan")
async def create_plan():
    """
    Create subscription plans (run once to set up plans).
    You can also create plans from the Razorpay Dashboard.
    """
    try:
        # Monthly Plan
        monthly_plan = client.plan.create({
            "period": "monthly",
            "interval": 1,
            "item": {
                "name": "QuizAPP Pro - Monthly",
                "amount": 29900,  # ₹299/month
                "currency": "INR",
                "description": "Unlimited AI quiz generation",
            },
        })

        # Yearly Plan
        yearly_plan = client.plan.create({
            "period": "yearly",
            "interval": 1,
            "item": {
                "name": "QuizAPP Pro - Yearly",
                "amount": 249900,  # ₹2499/year
                "currency": "INR",
                "description": "Unlimited AI quiz generation - Annual",
            },
        })

        return {
            "status": "success",
            "monthly_plan_id": monthly_plan["id"],
            "yearly_plan_id": yearly_plan["id"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-subscription")
async def create_subscription(sub_req: SubscriptionRequest):
    """
    Create a subscription for a user.
    """
    try:
        subscription = client.subscription.create({
            "plan_id": sub_req.plan_id,
            "total_count": sub_req.total_count,
            "notes": sub_req.notes or {},
        })
        return {
            "status": "success",
            "subscription_id": subscription["id"],
            "short_url": subscription.get("short_url"),
            "key_id": RAZORPAY_KEY_ID,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-subscription")
async def verify_subscription(verification: SubscriptionVerification):
    """
    Verify subscription payment signature.
    """
    try:
        message = f"{verification.razorpay_payment_id}|{verification.razorpay_subscription_id}"
        expected_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        if expected_signature == verification.razorpay_signature:
            # ✅ Subscription verified!
            # TODO: Update user's subscription status in your DB
            return {
                "status": "success",
                "message": "Subscription verified successfully",
                "subscription_id": verification.razorpay_subscription_id,
            }
        else:
            raise HTTPException(status_code=400, detail="Subscription verification failed")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# WEBHOOK (for server-side event handling)
# ─────────────────────────────────────────────

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """
    Handle Razorpay webhooks for async events.
    Set up webhook URL in Razorpay Dashboard → Settings → Webhooks
    Webhook URL: https://yourdomain.com/payment/webhook
    """
    try:
        payload = await request.body()
        signature = request.headers.get("X-Razorpay-Signature", "")

        # Verify webhook signature
        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "your_webhook_secret")
        expected = hmac.new(
            webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        if expected != signature:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

        import json
        event = json.loads(payload)
        event_type = event.get("event")

        # Handle different webhook events
        if event_type == "payment.captured":
            payment = event["payload"]["payment"]["entity"]
            print(f"✅ Payment captured: {payment['id']} - ₹{payment['amount']/100}")
            # TODO: Fulfill the order

        elif event_type == "payment.failed":
            payment = event["payload"]["payment"]["entity"]
            print(f"❌ Payment failed: {payment['id']}")
            # TODO: Handle failed payment

        elif event_type == "subscription.activated":
            subscription = event["payload"]["subscription"]["entity"]
            print(f"✅ Subscription activated: {subscription['id']}")
            # TODO: Activate user's subscription

        elif event_type == "subscription.cancelled":
            subscription = event["payload"]["subscription"]["entity"]
            print(f"⚠️ Subscription cancelled: {subscription['id']}")
            # TODO: Deactivate user's subscription

        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
