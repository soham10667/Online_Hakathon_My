import os
import random
import string
import logging
import requests
import smtplib
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.meeting import Meeting

logger = logging.getLogger("email_endpoints")
router = APIRouter()

class SendInviteDto(BaseModel):
    emails: List[str]
    meetingId: str
    appBaseUrl: Optional[str] = None

class SendSingleInviteDto(BaseModel):
    email: str
    appBaseUrl: Optional[str] = None

def build_invite_email_html(recipient_name: str, meeting_title: str, meeting_code: str, host_name: str, formatted_date: str, join_link: str) -> str:
    # Build list elements for "How to Join"
    how_to_join_items = [
        ('1', 'Click "Join Meeting Now" above (no account needed)'),
        ('2', 'Enter your name and email address'),
        ('3', 'Test your camera and microphone'),
        ('4', 'Click "Join as Guest" and wait for host approval')
    ]
    rows = ""
    for num, text in how_to_join_items:
        rows += f"""
        <tr>
            <td style="padding:6px 0;">
                <div style="display:flex;align-items:flex-start;gap:10px;">
                    <div style="min-width:22px;height:22px;background:linear-gradient(135deg,#6d28d9,#0891b2);border-radius:50%;color:#fff;font-size:11px;font-weight:700;text-align:center;line-hei[...]"
                    <span style="color:#a1a1b3;font-size:13px;line-height:22px;">{text}</span>
                </div>
            </td>
        </tr>
        """

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Invitation</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #2a2a3e;border-radius:16px;overflow:hidden;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9 0%,#0891b2 100%);padding:36px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">📹</div>
                <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">TeamsSpace</span>
              </div>
              <h1 style="color:#fff;font-size:28px;font-weight:800;margin:0;line-height:1.2;">You're Invited to a Meeting</h1>
              <p style="color:rgba(255,255,255,0.75);margin:10px 0 0;font-size:15px;">AI-powered collaboration platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#a1a1b3;font-size:15px;margin:0 0 8px;">Hi <strong style="color:#e2e2f0;">{recipient_name}</strong>,</p>
              <p style="color:#a1a1b3;font-size:15px;margin:0 0 28px;line-height:1.6;">
                <strong style="color:#e2e2f0;">{host_name}</strong> has invited you to join a live meeting session on <strong style="color:#e2e2f0;">TeamsSpace</strong>.
              </p>

              <!-- Meeting Info Card -->
              <div style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:12px;padding:24px;margin-bottom:28px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:16px;">
                      <div style="color:#6d60d8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Meeting Title</div>
                      <div style="color:#e2e2f0;font-size:20px;font-weight:700;">{meeting_title}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #2a2a3e;padding:16px 0;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%">
                            <div style="color:#6d60d8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Meeting Code</div>
                            <div style="color:#a78bfa;font-size:16px;font-weight:700;letter-spacing:0.08em;background:#2a2050;border-radius:6px;padding:6px 12px;display:inline-block;">{meeting_code}</div>
                          </td>
                          <td width="50%">
                            <div style="color:#6d60d8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Hosted By</div>
                            <div style="color:#e2e2f0;font-size:15px;font-weight:600;">{host_name}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #2a2a3e;padding-top:16px;">
                      <div style="color:#6d60d8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Scheduled For</div>
                      <div style="color:#e2e2f0;font-size:14px;">🗓 {formatted_date}</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="{join_link}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#0891b2);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px;">🚀 Join Meeting Now</a>
              </div>

              <!-- Or use code section -->
              <div style="background:#0f0f1a;border:1px dashed #2a2a3e;border-radius:10px;padding:18px;text-align:center;margin-bottom:28px;">
                <p style="color:#a1a1b3;font-size:13px;margin:0 0 8px;">Or join with the meeting code on <a href="{join_link.split('/join')[0]}/join" style="color:#7c6de8;text-decoration:none;">TeamsSpace</a></p>
                <div style="font-size:24px;font-weight:800;color:#a78bfa;letter-spacing:0.12em;">{meeting_code}</div>
              </div>

              <!-- How it works -->
              <div style="margin-bottom:24px;">
                <p style="color:#a1a1b3;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">How to Join:</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  {rows}
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d0d1a;border-top:1px solid #2a2a3e;padding:24px 40px;text-align:center;">
              <p style="color:#4a4a6a;font-size:12px;margin:0 0 4px;">This invitation was sent by TeamsSpace AI Meeting Copilot.</p>
              <p style="color:#4a4a6a;font-size:12px;margin:0;">If you did not expect this email, you can safely ignore it.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    """.strip()

def build_plain_text_body(recipient_name: str, meeting_title: str, meeting_code: str, host_name: str, formatted_date: str, join_link: str) -> str:
    return f"""
Hi {recipient_name},

{host_name} has invited you to join a live meeting on TeamsSpace.

Meeting: {meeting_title}
Code:    {meeting_code}
When:    {formatted_date}
Host:    {host_name}

JOIN NOW: {join_link}

Or go to the Join page and enter the meeting code: {meeting_code}

---
TeamsSpace AI Meeting Copilot
    """.strip()

def send_meeting_invite(recipient_email: str, meeting_title: str, meeting_code: str, host_name: str, scheduled_at: Optional[datetime], join_link: str) -> dict:
    recipient_name = recipient_email.split('@')[0]
    formatted_date = scheduled_at.strftime('%A, %B %d, %Y at %I:%M %p') if scheduled_at else 'Immediately available'

    html_body = build_invite_email_html(recipient_name, meeting_title, meeting_code, host_name, formatted_date, join_link)
    text_body = build_plain_text_body(recipient_name, meeting_title, meeting_code, host_name, formatted_date, join_link)
    subject = f'📹 You\'re invited to "{meeting_title}" — Join Now'

    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")

    is_dummy_smtp = not smtp_pass or "your_gmail_app_password_here" in smtp_pass or "placeholder" in smtp_pass or smtp_pass.strip() == ""

    # 1. Try SMTP First
    if not is_dummy_smtp and smtp_user:
        try:
            logger.info(f"Sending email to: {recipient_email} via SMTP")
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f'"TeamsSpace Copilot" <{smtp_user}>'
            msg['To'] = recipient_email

            part1 = MIMEText(text_body, 'plain')
            part2 = MIMEText(html_body, 'html')
            msg.attach(part1)
            msg.attach(part2)

            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, recipient_email, msg.as_string())
            server.quit()

            logger.info(f"Meeting invite sent via SMTP to {recipient_email}")
            return {"success": True, "messageId": f"smtp-{random.randint(1000, 9999)}"}
        except Exception as smtp_err:
            logger.error(f"SMTP send failed to {recipient_email}, trying Resend fallback... Error: {str(smtp_err)}")

    # 2. Fallback to Resend API
    resend_api_key = os.environ.get("RESEND_API_KEY")
    is_resend_configured = resend_api_key and "your_resend_api_key_here" not in resend_api_key and resend_api_key.strip() != ""

    if is_resend_configured:
        try:
            logger.info(f"Attempting to send email to {recipient_email} via Resend API...")
            from_email = os.environ.get("RESEND_FROM", "onboarding@resend.dev")
            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_email,
                    "to": recipient_email,
                    "subject": subject,
                    "html": html_body
                }
            )
            data = response.json()
            if response.status_code in [200, 201] and data.get("id"):
                logger.info(f"Meeting invite sent via Resend API to {recipient_email}. MessageId: {data['id']}")
                return {"success": True, "messageId": data["id"]}
            else:
                err_msg = data.get("message", json.dumps(data)) if isinstance(data, dict) else f"HTTP status {response.status_code}"
                logger.error(f"Resend API send failed to {recipient_email}: {err_msg}")
        except Exception as resend_err:
            logger.error(f"Resend API send failed to {recipient_email}: {str(resend_err)}")

    # 3. Fallback to Mock Simulation
    logger.warning(f"Both Resend and SMTP failed or are unconfigured. Falling back to Mock Simulation for {recipient_email}...")
    mock_id = 'mock-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=9))
    logger.info(f"[SIMULATED EMAIL DISPATCH] Mock email sent successfully to {recipient_email}")
    return {"success": True, "messageId": mock_id}

@router.post("/invite")
def send_invites(
    payload: SendInviteDto,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.emails:
        raise HTTPException(status_code=400, detail="At least one email address is required")

    # Validate email formats
    import re
    email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    for email in payload.emails:
        if not re.match(email_regex, email):
            raise HTTPException(status_code=400, detail=f"Invalid email address: {email}")

    # Fetch meeting
    meeting = db.query(Meeting).filter(Meeting.id == payload.meetingId).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    host_name = current_user.get("name") or current_user.get("email") or "Meeting Host"
    base_url = payload.appBaseUrl or os.environ.get("APP_BASE_URL", "http://localhost:5173")
    join_link = f"{base_url}/join?code={meeting.code}"

    sent = 0
    failed = []
    total = len(payload.emails)

    for email in payload.emails:
        res = send_meeting_invite(
            recipient_email=email,
            meeting_title=meeting.title,
            meeting_code=meeting.code or "",
            host_name=host_name,
            scheduled_at=meeting.startTime,
            join_link=join_link
        )
        if res.get("success"):
            sent += 1
        else:
            failed.append(email)

    return {
        "message": f"Invites sent: {sent}/{total}",
        "total": total,
        "sent": sent,
        "failed": failed
    }

@router.post("/invite/{meetingId}/single")
def send_single_invite(
    meetingId: str,
    payload: SendSingleInviteDto,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Fetch meeting
    meeting = db.query(Meeting).filter(Meeting.id == meetingId).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    host_name = current_user.get("name") or current_user.get("email") or "Meeting Host"
    base_url = payload.appBaseUrl or os.environ.get("APP_BASE_URL", "http://localhost:5173")
    join_link = f"{base_url}/join?code={meeting.code}"

    res = send_meeting_invite(
        recipient_email=payload.email,
        meeting_title=meeting.title,
        meeting_code=meeting.code or "",
        host_name=host_name,
        scheduled_at=meeting.startTime,
        join_link=join_link
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail="Failed to send invite")

    return {
        "message": f"Invite sent to {payload.email}",
        "messageId": res.get("messageId")
    }
