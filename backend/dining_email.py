"""
SMTP notifications for dining availability alerts.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import logging
import os
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_dining_alert_email_sync(
    *,
    to_email: str,
    restaurant: str,
    reservation_date: str,
    party_size: int,
    matched_detail: str,
    restaurant_slug: str,
) -> None:
    host = os.environ.get("SMTP_HOST", "").strip()
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "").strip()
    from_addr = os.environ.get("EMAIL_FROM", user).strip()

    if not host or not from_addr:
        logger.warning("SMTP_HOST or EMAIL_FROM not set; skipping dining alert email.")
        return

    booking_url = f"https://disneyworld.disney.go.com/dining/{restaurant_slug}/"
    dining_hub = "https://disneyworld.disney.go.com/dining/"

    subject = f"A table just opened at {restaurant} on {reservation_date}!"
    body = (
        f"Hi!\n\n"
        f"Good news — we detected possible availability that may match your alert.\n\n"
        f"Restaurant: {restaurant}\n"
        f"Date: {reservation_date}\n"
        f"Party size: {party_size}\n"
        f"Detail: {matched_detail}\n\n"
        f"Book as soon as you can — popular times can disappear quickly.\n\n"
        f"Restaurant page:\n{booking_url}\n\n"
        f"All dining:\n{dining_hub}\n\n"
        f"— Mouse Mentor\n"
    )

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=30) as server:
            if user and password:
                server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
    else:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            if user and password:
                server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
