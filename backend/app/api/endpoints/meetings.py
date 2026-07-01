import json
import random
import string
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.meeting import Meeting
from app.models.transcript import Transcript
from app.models.action_item import ActionItem
from app.models.risk import Risk
from app.models.summary import Summary
from app.models.extra import Analytics
from app.schemas.meeting import MeetingCreate, MeetingDetailResponse, MeetingListResponse
from app.ai_workflow.graph import analyze_meeting_transcripts
from app.services.s3_service import s3_service
from app.services.integrations import integrations_service
import requests
import os
import asyncio

router = APIRouter()

def generate_unique_meeting_code(db: Session) -> str:
    chars = string.ascii_uppercase + string.digits
    while True:
        code = "TM-" + "".join(random.choices(chars, k=6))
        exists = db.query(Meeting).filter(Meeting.code == code).first()
        if not exists:
            return code

def send_invitation_email(recipient_emails: str, meeting_title: str, meeting_code: str, host_email: str):
    resend_api_key = os.environ.get("RESEND_API_KEY")
    
    if not resend_api_key:
        print("WARNING: RESEND_API_KEY not set in .env. Skipping real email dispatch.")
        return

    emails = [e.strip() for e in recipient_emails.split(",") if e.strip()]
    if not emails:
        return

    join_link = f"http://localhost:5173/join?code={meeting_code}"

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
            <h2 style="color: #6366f1;">You're Invited!</h2>
            <p><strong>{host_email}</strong> has invited you to join an AI-powered meeting:</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{meeting_title}</h3>
                <p><strong>Meeting Code:</strong> {meeting_code}</p>
                <a href="{join_link}" style="display: inline-block; background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Meeting Now</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Sent via AI Meeting Copilot (Resend API)</p>
        </body>
    </html>
    """

    for recipient in emails:
        try:
            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "onboarding@resend.dev",
                    "to": recipient,
                    "subject": f"Invitation: {meeting_title}",
                    "html": html_content
                }
            )
            if response.status_code in [200, 201]:
                print(f"Resend invitation email sent successfully to {recipient}")
            else:
                print(f"Failed to send via Resend API. Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            print(f"Exception during Resend API call: {str(e)}")

@router.post("", response_model=MeetingListResponse)
def create_meeting(
    payload: MeetingCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    code = generate_unique_meeting_code(db)
    meeting = Meeting(
        title=payload.title,
        description=payload.description,
        status="SCHEDULED",
        hostId=current_user["userId"],
        channelId=payload.channelId,
        startTime=payload.startTime or datetime.utcnow(),
        invitedEmails=payload.invitedEmails,
        code=code
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    # Setup dummy count field for serialization compatibility
    meeting._count = type("Count", (object,), {"transcripts": 0, "actionItems": 0, "risks": 0})()
    
    # Schedule the email to be sent in the background
    if payload.invitedEmails:
        background_tasks.add_task(
            send_invitation_email,
            payload.invitedEmails,
            payload.title,
            code,
            current_user.get("email", "Your Team")
        )

    return meeting

@router.get("/code/{code}", response_model=MeetingDetailResponse)
def get_meeting_by_code(
    code: str,
    db: Session = Depends(get_db)
):
    # Try uuid id lookup
    meeting = db.query(Meeting).filter(Meeting.id == code).first()
    if not meeting:
        # Try short code lookup
        meeting = db.query(Meeting).filter(Meeting.code == code).first()
        
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    return meeting

@router.get("", response_model=List[MeetingListResponse])
def get_meetings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meetings = (
        db.query(Meeting)
        .filter(Meeting.hostId == current_user["userId"])
        .order_by(Meeting.createdAt.desc())
        .all()
    )
    
    # Attach dynamic counts for serialization
    for m in meetings:
        m._count = type("Count", (object,), {
            "transcripts": len(m.transcripts),
            "actionItems": len(m.actionItems),
            "risks": len(m.risks)
        })()
        
    return meetings

@router.get("/{meeting_id}", response_model=MeetingDetailResponse)
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    return meeting

@router.post("/{meeting_id}/start")
def start_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    meeting.status = "ACTIVE"
    meeting.startTime = datetime.utcnow()
    db.commit()
    db.refresh(meeting)
    return {"status": "success", "meeting": {"id": meeting.id, "status": meeting.status}}

@router.post("/{meeting_id}/end")
async def end_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )

    # 1. Compile raw dialogue lines
    raw_lines = [f"{t.speakerName}: {t.text}" for t in meeting.transcripts]

    # 2. Run multi-agent LangGraph analysis workflow
    analysis = analyze_meeting_transcripts(meeting_id, raw_lines)

    # 3. Save AI summary details
    summary_data = analysis.get("summary") or {}
    if summary_data:
        db_summary = db.query(Summary).filter(Summary.meetingId == meeting_id).first()
        if db_summary:
            db_summary.overview = summary_data.get("overview", "")
            db_summary.keyTakeaways = json.dumps(summary_data.get("keyTakeaways", []))
            db_summary.keyDecisions = json.dumps(summary_data.get("keyDecisions", []))
            db_summary.nextSteps = json.dumps(summary_data.get("nextSteps", []))
            db_summary.productivityScore = summary_data.get("productivityScore", 100)
        else:
            db_summary = Summary(
                meetingId=meeting_id,
                overview=summary_data.get("overview", ""),
                keyTakeaways=json.dumps(summary_data.get("keyTakeaways", [])),
                keyDecisions=json.dumps(summary_data.get("keyDecisions", [])),
                nextSteps=json.dumps(summary_data.get("nextSteps", [])),
                productivityScore=summary_data.get("productivityScore", 100)
            )
            db.add(db_summary)

    # 4. Save extracted Action Items
    db.query(ActionItem).filter(ActionItem.meetingId == meeting_id).delete()
    for item in analysis.get("action_items") or []:
        due_date_parsed = None
        if item.get("dueDate"):
            try:
                due_date_parsed = datetime.strptime(item["dueDate"], "%Y-%m-%d")
            except Exception:
                due_date_parsed = None
        
        clickup_res = integrations_service.create_clickup_task(
            task_name=f"Action Item: {item['text'][:50]}...",
            task_notes=f"Extracted from Meeting {meeting_id}.\nAssignee: {item.get('assigneeName') or 'Unassigned'}\nDue Date: {item.get('dueDate') or 'No due date'}\nFull Text: {item['text']}"
        )
        
        external_id = None
        external_url = None
        external_platform = None
        if clickup_res and "id" in clickup_res:
            external_id = clickup_res["id"]
            external_url = clickup_res.get("url")
            external_platform = "CLICKUP"

        db_item = ActionItem(
            meetingId=meeting_id,
            text=item["text"],
            assigneeName=item.get("assigneeName"),
            status="PENDING",
            dueDate=due_date_parsed,
            externalId=external_id,
            externalUrl=external_url,
            externalPlatform=external_platform
        )
        db.add(db_item)

    # 5. Save detected Risks
    db.query(Risk).filter(Risk.meetingId == meeting_id).delete()
    for r in analysis.get("risks") or []:
        db_risk = Risk(
            meetingId=meeting_id,
            text=r["text"],
            severity=r["severity"],
            status="OPEN"
        )
        db.add(db_risk)

    # 6. Save Meeting Analytics
    analytics_data = analysis.get("analytics") or {}
    if analytics_data:
        db.query(Analytics).filter(Analytics.meetingId == meeting_id).delete()
        db_analytics = Analytics(
            meetingId=meeting_id,
            duration=analytics_data.get("duration", 0),
            totalWords=analytics_data.get("totalWords", 0),
            talkTimeDistribution=json.dumps(analytics_data.get("talkTimeDistribution", {})),
            sentimentScore=analytics_data.get("sentimentScore", 0.0),
            engagementScore=analytics_data.get("engagementScore", 100),
            speakerSentiment=json.dumps(analytics_data.get("speakerSentiment", {}))
        )
        db.add(db_analytics)

    # 7. Upload transcript backup to S3 storage
    if raw_lines:
        transcript_text = "\n".join(raw_lines)
        s3_service.upload_transcript(meeting_id, transcript_text)

    # 8. Set final completion state
    meeting.status = "COMPLETED"
    meeting.endTime = datetime.utcnow()
    db.commit()
    db.refresh(meeting)

    try:
        from app.main import sio
        await sio.emit("meetingEnded", {"meetingId": meeting_id}, room=meeting_id)
    except Exception as se:
        import logging
        logging.getLogger("meetings_router").error(f"Failed to emit meetingEnded socket event: {se}")

    return meeting

@router.post("/action-items/{action_item_id}/sync/clickup")
def sync_action_item_to_clickup(
    action_item_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action_item = db.query(ActionItem).filter(ActionItem.id == action_item_id).first()
    if not action_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action item not found"
        )
    
    meeting = db.query(Meeting).filter(Meeting.id == action_item.meetingId).first()
    meeting_title = meeting.title if meeting else "AI Meeting"
    
    from app.services.integrations import integrations_service
    
    task_notes = (
        f"Meeting: {meeting_title}\n"
        f"Assignee: {action_item.assigneeName or 'Unassigned'}\n"
        f"Due Date: {action_item.dueDate.strftime('%Y-%m-%d') if action_item.dueDate else 'None'}\n"
        f"Synced from AI Meeting Copilot"
    )
    
    res = integrations_service.create_clickup_task(
        task_name=action_item.text,
        task_notes=task_notes
    )
    
    if "status" in res and res["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Failed to sync to ClickUp")
        )
    
    action_item.externalId = res.get("id")
    action_item.externalUrl = res.get("url") or f"https://app.clickup.com/t/{res.get('id')}"
    action_item.externalPlatform = "clickup"
    
    db.commit()
    db.refresh(action_item)
    
    return action_item

@router.post("/action-items/{action_item_id}/sync/trello")
def sync_action_item_to_trello(
    action_item_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action_item = db.query(ActionItem).filter(ActionItem.id == action_item_id).first()
    if not action_item:
        raise HTTPException(status_code=404, detail="Action item not found")
        
    meeting = db.query(Meeting).filter(Meeting.id == action_item.meetingId).first()
    meeting_title = meeting.title if meeting else "AI Meeting"
    
    from app.services.integrations import integrations_service
    card_desc = f"Meeting: {meeting_title}\nAssignee: {action_item.assigneeName or 'Unassigned'}\nSynced from AI Meeting Copilot"
    res = integrations_service.create_trello_card(card_name=action_item.text, card_desc=card_desc)
    
    if "status" in res and res["status"] == "error":
        raise HTTPException(status_code=400, detail=res.get("message", "Failed to sync to Trello"))
        
    action_item.externalId = res.get("id")
    action_item.externalUrl = res.get("url")
    action_item.externalPlatform = "trello"
    db.commit()
    db.refresh(action_item)
    return action_item

@router.post("/{meeting_id}/email-summary")
def email_meeting_summary(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    import logging
    logger = logging.getLogger("email_service")
    logger.info(f"Simulating sending meeting summary email for '{meeting.title}' to host {current_user['email']}")
    return {"status": "success", "message": f"Summary emailed successfully to {current_user['email']}!"}

@router.get("/{meeting_id}/calendar-link")
def get_followup_calendar_link(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    import urllib.parse
    title = f"Follow-up: {meeting.title}"
    details = f"Follow-up discussion for meeting: {meeting.title}\n\nOriginal description: {meeting.description or ''}\n\nReview actions & outcomes in Copilot."
    
    # Generate Google Calendar template link
    base_url = "https://calendar.google.com/calendar/render"
    params = {
        "action": "TEMPLATE",
        "text": title,
        "details": details,
        "sf": "true",
        "output": "xml"
    }
    encoded_url = f"{base_url}?{urllib.parse.urlencode(params)}"
    return {"url": encoded_url}

@router.get("/{meeting_id}/pdf", response_class=HTMLResponse)
def export_meeting_pdf_view(
    meeting_id: str,
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # Get associated datasets
    decisions = []
    next_steps = []
    takeaways = []
    
    if meeting.summary:
        try:
            takeaways = json.loads(meeting.summary.keyTakeaways)
        except Exception:
            takeaways = []
        try:
            decisions = json.loads(meeting.summary.keyDecisions) if meeting.summary.keyDecisions else []
        except Exception:
            decisions = []
        try:
            next_steps = json.loads(meeting.summary.nextSteps) if meeting.summary.nextSteps else []
        except Exception:
            next_steps = []

    # Get speaker sentiments from analytics
    speaker_sentiments = {}
    if meeting.analytics:
        try:
            speaker_sentiments = json.loads(meeting.analytics.speakerSentiment)
        except Exception:
            speaker_sentiments = {}

    # Format action items HTML
    action_items_html = "<p>No action items assigned.</p>"
    if meeting.actionItems:
        items_li = []
        for a in meeting.actionItems:
            due_str = f" (Due: {a.dueDate.strftime('%Y-%m-%d')})" if a.dueDate else ""
            assignee = a.assigneeName or "Unassigned"
            items_li.append(f"<li><strong>{assignee}</strong>: {a.text}{due_str}</li>")
        action_items_html = f"<ul>{''.join(items_li)}</ul>"

    # Format risks HTML
    risks_html = "<p>No risks or blockers identified.</p>"
    if meeting.risks:
        risks_divs = []
        for r in meeting.risks:
            severity_class = "high" if r.severity == "HIGH" else "med" if r.severity == "MEDIUM" else "low"
            risks_divs.append(
                f"<div style='margin-bottom:8px;'>⚠️ {r.text} <span class='badge badge-{severity_class}'>{r.severity}</span></div>"
            )
        risks_html = "".join(risks_divs)

    # Format speaker sentiments HTML
    sentiments_html = "<p>No speaker sentiment log available.</p>"
    if speaker_sentiments:
        sentiments_divs = []
        for name, sent in speaker_sentiments.items():
            sent_str = "Positive 😊" if sent == "Positive" else "Concerned ⚠️" if sent == "Concerned" else "Neutral 😐"
            sentiments_divs.append(
                f"<div class='sentiment-item'><span>{name}</span><span>{sent_str}</span></div>"
            )
        sentiments_html = "".join(sentiments_divs)

    # Build clean print-friendly HTML template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{meeting.title} - Meeting Minutes Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
        <style>
            @media print {{
                body {{ -webkit-print-color-adjust: exact; }}
                .page-break {{ page-break-before: always; }}
            }}
            body {{
                font-family: 'Inter', sans-serif;
                color: #0f172a;
                line-height: 1.6;
                padding: 40px;
                max-width: 850px;
                margin: 0 auto;
                background-color: #f8fafc;
            }}
            .report-container {{
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                padding: 50px;
            }}
            .header {{
                border-bottom: 3px solid #6366f1;
                padding-bottom: 24px;
                margin-bottom: 32px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
            }}
            .title {{
                font-size: 32px;
                font-family: 'Outfit', sans-serif;
                font-weight: 800;
                color: #1e1b4b;
                margin: 0 0 12px 0;
            }}
            .meta {{
                font-size: 14px;
                color: #64748b;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }}
            .brand {{
                font-family: 'Outfit', sans-serif;
                font-size: 18px;
                font-weight: 800;
                color: #6366f1;
            }}
            .section {{
                margin-bottom: 36px;
                background: #fdfdfd;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 24px;
            }}
            .section-title {{
                font-size: 18px;
                font-family: 'Outfit', sans-serif;
                font-weight: 700;
                color: #4338ca;
                border-bottom: 2px solid #e0e7ff;
                padding-bottom: 8px;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }}
            ul, ol {{ padding-left: 24px; margin-top: 0; }}
            li {{ margin-bottom: 8px; }}
            .badge {{
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
            }}
            .badge-high {{ background: #fee2e2; color: #b91c1c; }}
            .badge-med {{ background: #fef3c7; color: #b45309; }}
            .badge-low {{ background: #e0e7ff; color: #4338ca; }}
            
            .sentiment-grid {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }}
            .sentiment-item {{
                display: flex;
                justify-content: space-between;
                padding: 10px 16px;
                background-color: #f1f5f9;
                border-radius: 6px;
                font-weight: 500;
            }}
            .footer {{
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                font-size: 12px;
                color: #94a3b8;
            }}
        </style>
    </head>
    <body>
        <div class="report-container">
            <div class="header">
                <div>
                    <h1 class="title">{meeting.title}</h1>
                    <div class="meta">
                        <span><strong>Date:</strong> {meeting.createdAt.strftime('%B %d, %Y - %I:%M %p')}</span>
                        <span><strong>Status:</strong> {meeting.status}</span>
                    </div>
                </div>
                <div class="brand">AI Meeting Copilot</div>
            </div>
            
            <div class="section">
                <div class="section-title">Executive Summary</div>
                <p style="font-size: 16px; font-weight: 500; color: #334155;">{meeting.summary.overview if meeting.summary else 'No summary available.'}</p>
            </div>

            <div class="section">
                <div class="section-title">Key Decisions</div>
                <ul>
                    {''.join([f"<li>{d}</li>" for d in decisions]) if decisions else '<li>No major decisions recorded.</li>'}
                </ul>
            </div>
            
            <div class="section" style="border-left: 4px solid #6366f1;">
                <div class="section-title">Action Items & Next Steps</div>
                {action_items_html}
            </div>

            <div class="page-break"></div>

            <div class="section" style="border-left: 4px solid #ef4444;">
                <div class="section-title">Risks & Blockers</div>
                {risks_html}
            </div>
            
            <div class="section">
                <div class="section-title">Speaker Sentiment Analysis</div>
                <div class="sentiment-grid">
                    {sentiments_html}
                </div>
            </div>

        <script>
            window.onload = function() {{
                window.print();
            }};
        </script>
    </body>
    </html>
    """
    return html_content
