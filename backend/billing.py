"""
Stripe Checkout (one-time Pro) + webhook to set is_pro.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import os
from typing import Any, Optional

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

import auth
from database import async_session_maker, get_session
from deps import require_user
from schemas import TokenResponse

router = APIRouter()

STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "").strip()
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()


def _get_stripe() -> None:
    key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured (STRIPE_SECRET_KEY).",
        )
    stripe.api_key = key


class CreateCheckoutBody(BaseModel):
    success_url: str
    cancel_url: str


class CreateCheckoutResponse(BaseModel):
    url: str


class CompleteSessionBody(BaseModel):
    session_id: str


@router.post("/create-checkout-session", response_model=CreateCheckoutResponse)
async def create_checkout_session(
    body: CreateCheckoutBody,
    user_id: int = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Start Stripe Checkout for one-time Pro upgrade ($12)."""
    if not STRIPE_PRICE_ID:
        raise HTTPException(
            status_code=503,
            detail="Stripe price not configured (STRIPE_PRICE_ID).",
        )
    _get_stripe()
    user = await auth.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    if user.get("is_pro"):
        raise HTTPException(status_code=400, detail="Already Pro")

    try:
        checkout_session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "price": STRIPE_PRICE_ID,
                    "quantity": 1,
                }
            ],
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            client_reference_id=str(user_id),
            metadata={"user_id": str(user_id)},
            customer_email=user["email"],
        )
    except Exception as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(
            status_code=502,
            detail=f"Could not start checkout: {msg}",
        ) from e

    url = checkout_session.url
    if not url:
        raise HTTPException(
            status_code=502, detail="Stripe did not return a checkout URL."
        )
    return CreateCheckoutResponse(url=url)


@router.post("/complete-session", response_model=TokenResponse)
async def complete_checkout_session(
    body: CompleteSessionBody,
    user_id: int = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """After Stripe redirect: verify payment and issue a new JWT with is_pro."""
    _get_stripe()
    try:
        cs = stripe.checkout.Session.retrieve(body.session_id)
    except Exception as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid session: {msg}",
        ) from e

    if cs.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Payment not completed.")

    meta_uid = (cs.metadata or {}).get("user_id")
    if meta_uid != str(user_id):
        raise HTTPException(
            status_code=403,
            detail="This checkout session does not belong to your account.",
        )

    await auth.set_user_pro(session, user_id)
    await session.commit()

    user = await auth.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=500, detail="User not found after upgrade.")
    token = auth.create_access_token(user_id, is_pro=True)
    return TokenResponse(
        access_token=token,
        email=user["email"],
        is_pro=True,
    )


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
):
    """
    Stripe webhook: mark Pro on successful payment (backup if user closes tab before redirect).
    """
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook secret not configured.")

    _get_stripe()
    payload = await request.body()
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload") from e
    except Exception as e:
        if type(e).__name__ == "SignatureVerificationError":
            raise HTTPException(status_code=400, detail="Invalid signature") from e
        raise

    if event["type"] == "checkout.session.completed":
        sess: dict[str, Any] = event["data"]["object"]
        if sess.get("payment_status") == "paid":
            uid = (sess.get("metadata") or {}).get("user_id")
            if uid:
                try:
                    user_id_int = int(uid)
                except (TypeError, ValueError):
                    user_id_int = 0
                if user_id_int:
                    async with async_session_maker() as db:
                        await auth.set_user_pro(db, user_id_int)
                        await db.commit()

    return {"received": True}
