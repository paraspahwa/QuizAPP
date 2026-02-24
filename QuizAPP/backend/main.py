"""
StudyQuizAI — Backend (FastAPI)
================================
Rebranded from QuizAPP with:
  • Razorpay one-time + subscription payments
  • Usage limits (free: 3 quizzes/day, pro: unlimited)
  • All original quiz generation logic preserved
"""

import os
import json
import hmac
import hashlib
import time
from datetime import datetime, timedelta
from typing import Optional
from collections import defaultdict

import razorpay
from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_parser import extract_text_from_pdf, chunk_text
from quiz_generator import generate_quiz

# ─────────────────────────────────────────────
# App Init
# ─────────────────────────────────────────────
app = FastAPI(title="StudyQuizAI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        # Add your production domain:
        # "https://studyquizai.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Razorpay Client
# ─────────────────────────────────────────────
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_xxxxxxxxxxxx")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "your_secret_key")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# ─────────────────────────────────────────────
# In-Memory Store (replace with DB in production)
# ─────────────────────────────────────────────
# Tracks free usage per IP: { "ip": { "date": "2026-02-24", "count": 2 } }
free_usage_tracker: dict = defaultdict(lambda: {"date": "", "count": 0})

# Tracks pro users: { "user_id_or_ip": True }
pro_users: set = set()

FREE_DAILY_LIMIT = 3


# ─────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────
class OrderRequest(BaseModel):
    amount: int  # in paise (49900 = ₹499)
    currency: str = "INR"
    plan_type: str = "lifetime"  # lifetime | monthly | yearly
    notes: Optional[dict] = None


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: Optional[str] = None


class SubscriptionRequest(BaseModel):
    plan_id: str
    total_count: int = 12
    notes: Optional[dict] = None


class SubscriptionVerification(BaseModel):
    razorpay_subscription_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: Optional[str] = None


# ─────────────────────────────────────────────
# Usage Limit Helpers
# ─────────────────────────────────────────────
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host


def check_usage_limit(client_id: str) -> dict:
    """Check if a user can generate a quiz."""
    if client_id in pro_users:
        return {"allowed": True, "is_pro": True, "remaining": -1}

    today = datetime.utcnow().strftime("%Y-%m-%d")
    tracker = free_usage_tracker[client_id]

    if tracker["date"] != today:
        tracker["date"] = today
        tracker["count"] = 0

    remaining = FREE_DAILY_LIMIT - tracker["count"]
    return {
        "allowed": remaining > 0,
        "is_pro": False,
        "remaining": max(0, remaining),
        "limit": FREE_DAILY_LIMIT,
    }


def increment_usage(client_id: str):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    tracker = free_usage_tracker[client_id]
    if tracker["date"] != today:
        tracker["date"] = today
        tracker["count"] = 0
    tracker["count"] += 1


# ─────────────────────────────────────────────
# QUIZ ROUTES (original functionality)
# ─────────────────────────────────────────────
@app.post("/upload-and-generate")
async def upload_and_generate(
    request: Request,
    file: UploadFile = File(...),
    num_questions: int = Query(default=5),
    difficulty: str = Query(default="medium"),
):
    """Original quiz generation endpoint with usage limits."""
    client_id = get_client_ip(request)
    usage = check_usage_limit(client_id)

    if not usage["allowed"]:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "daily_limit_reached",
                "message": f"Free limit of {FREE_DAILY_LIMIT} quizzes/day reached. Upgrade to Pro for unlimited access!",
                "remaining": 0,
                "limit": FREE_DAILY_LIMIT,
            },
        )

    # Extract text from PDF
    contents = await file.read()
    text = extract_text_from_pdf(contents)

    if not text or len(text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from the PDF.")

    # Chunk large PDFs
    chunks = chunk_text(text)

    # Generate quiz
    quiz = generate_quiz(chunks, num_questions=num_questions, difficulty=difficulty)

    # Increment usage for free users
    if not usage["is_pro"]:
        increment_usage(client_id)

    updated_usage = check_usage_limit(client_id)

    return {
        "status": "success",
        "quiz": quiz,
        "usage": {
            "is_pro": updated_usage["is_pro"],
            "remaining": updated_usage["remaining"],
            "limit": FREE_DAILY_LIMIT,
        },
    }


@app.get("/usage-status")
async def usage_status(request: Request):
    """Check current usage status for the client."""
    client_id = get_client_ip(request)
    usage = check_usage_limit(client_id)
    return usage


# ─────────────────────────────────────────────
# PAYMENT ROUTES — One-Time
# ─────────────────────────────────────────────
@app.post("/payment/create-order")
async def create_order(order_req: OrderRequest):
    try:
        order_data = {
            "amount": order_req.amount,
            "currency": order_req.currency,
            "receipt": f"studyquizai_{int(time.time())}",
            "notes": {
                "plan_type": order_req.plan_type,
                **(order_req.notes or {}),
            },
        }
        order = razorpay_client.order.create(data=order_data)
        return {
            "status": "success",
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/payment/verify-payment")
async def verify_payment(request: Request, verification: PaymentVerification):
    try:
        message = f"{verification.razorpay_order_id}|{verification.razorpay_payment_id}"
        expected_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()

        if expected_signature == verification.razorpay_signature:
            # Mark user as Pro
            client_id = verification.user_id or get_client_ip(request)
            pro_users.add(client_id)

            return {
                "status": "success",
                "message": "Payment verified! You are now a Pro user.",
                "payment_id": verification.razorpay_payment_id,
                "is_pro": True,
            }
        else:
            raise HTTPException(status_code=400, detail="Payment verification failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# PAYMENT ROUTES — Subscriptions
# ─────────────────────────────────────────────
@app.post("/payment/create-plan")
async def create_plan():
    """Run once to create plans. Or create from Razorpay Dashboard."""
    try:
        monthly = razorpay_client.plan.create({
            "period": "monthly",
            "interval": 1,
            "item": {
                "name": "StudyQuizAI Pro — Monthly",
                "amount": 19900,  # ₹199/month
                "currency": "INR",
                "description": "Unlimited AI quiz generation",
            },
        })
        yearly = razorpay_client.plan.create({
            "period": "yearly",
            "interval": 1,
            "item": {
                "name": "StudyQuizAI Pro — Yearly",
                "amount": 149900,  # ₹1499/year
                "currency": "INR",
                "description": "Unlimited AI quiz generation — Annual",
            },
        })
        return {
            "monthly_plan_id": monthly["id"],
            "yearly_plan_id": yearly["id"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/payment/create-subscription")
async def create_subscription(sub_req: SubscriptionRequest):
    try:
        sub = razorpay_client.subscription.create({
            "plan_id": sub_req.plan_id,
            "total_count": sub_req.total_count,
            "notes": sub_req.notes or {},
        })
        return {
            "status": "success",
            "subscription_id": sub["id"],
            "key_id": RAZORPAY_KEY_ID,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/payment/verify-subscription")
async def verify_subscription(request: Request, verification: SubscriptionVerification):
    try:
        message = f"{verification.razorpay_payment_id}|{verification.razorpay_subscription_id}"
        expected_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()

        if expected_signature == verification.razorpay_signature:
            client_id = verification.user_id or get_client_ip(request)
            pro_users.add(client_id)
            return {
                "status": "success",
                "message": "Subscription verified! You are now a Pro user.",
                "is_pro": True,
            }
        else:
            raise HTTPException(status_code=400, detail="Subscription verification failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# WEBHOOK
# ─────────────────────────────────────────────
@app.post("/payment/webhook")
async def razorpay_webhook(request: Request):
    try:
        payload = await request.body()
        signature = request.headers.get("X-Razorpay-Signature", "")
        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "your_webhook_secret")

        expected = hmac.new(
            webhook_secret.encode(), payload, hashlib.sha256
        ).hexdigest()

        if expected != signature:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

        event = json.loads(payload)
        event_type = event.get("event")

        if event_type == "payment.captured":
            print(f"✅ Payment captured: {event['payload']['payment']['entity']['id']}")
        elif event_type == "subscription.activated":
            print(f"✅ Subscription activated: {event['payload']['subscription']['entity']['id']}")
        elif event_type == "subscription.cancelled":
            print(f"⚠️ Subscription cancelled: {event['payload']['subscription']['entity']['id']}")

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "app": "StudyQuizAI", "version": "2.0.0"}
