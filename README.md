# AI Meeting Copilot for Remote Teams

An interactive, real-time AI Meeting Copilot that streams meeting conversations, extracts action items dynamically, identifies blockers and risks, and compiles professional meeting summaries and analytics using **FastAPI (Python)**, **Socket.IO WebSockets**, **SQLAlchemy**, **Qdrant**, **Redis**, **AWS S3**, **Groq API**, and **LangGraph**.

---

## Capabilities

### AI Capabilities
* **Real-time Transcription & Summarization**: Process speech streams chunk-by-chunk and translate/transcribe multilingual dialogues.
* **Accent & Speaker Handling**: Gracefully handle diverse accents and automatically map dialogue turns through speaker diarization.
* **Summaries for Absent Participants**: Generate highly structured meeting minutes and overview briefs, allowing absent team members to quickly catch up.
* **Semantic Search Knowledge Base**: Store dialogue embeddings inside **Qdrant** and run semantic queries across all past discussions, decisions, and tasks.
* **Distributed Time Zone Support**: Format all deadlines, action items, and schedules into timezone-aware UTC timestamps for remote global teams.

### Analytics Capabilities
* **Meeting Attendance Tracker**: Auto-detect participating speakers and track meeting presence.
* **Participant Engagement Metrics**: Measure meeting engagement scores based on turn distribution balance and dialogue interactivity.
* **Action Item Tracking**: Track responsibilities and task assignments.
* **Collaboration Productivity Trends**: Estimate cooperation productivity scores (0-100) per session to monitor team performance over time.

---

## MVP Priority Focus (Hackathon / Hack-Project Scope)
To maintain a tight, high-impact scope for a hackathon or college MVP, we prioritized:
1. **Real-time socket-based transcription**
2. **Multi-agent AI Summarization**
3. **Action item responsibility and deadline assignment**
4. **Qdrant-based Semantic Search**
5. **Follow-up recommendation automation**
6. **Dockerized PostgreSQL, Redis, and Qdrant setup**

*Advanced third-party connectors (Slack, Jira, Trello, ClickUp, Google Calendar) and full analytics dashboards can be scaled incrementally.*

---

## Tech Stack

* **Frontend**: React (Vite), TypeScript, Vanilla CSS (Premium dark mode glassmorphism theme), and Socket.IO client.
* **Backend**: FastAPI (Python), Socket.IO ASGI Gateway, JWT Auth.
* **Database**: PostgreSQL (Production) / SQLite (Local file development).
* **Vector Store**: Qdrant Vector DB (for semantic transcript search).
* **Cache & Pub/Sub**: Redis.
* **Object Store**: AWS S3 (for archiving raw meeting transcripts).
* **Orchestration & LLM**: LangGraph multi-agent network using the Groq API (fallback to Gemini or Mock parser if keys are missing).

---

## Project Structure

```
├── backend/
│   ├── prisma/              # Prisma DB Schemas & Migrations
│   ├── src/                 # Active NestJS Backend
│   │   ├── main.ts          # NestJS Server entry point
│   │   ├── app.module.ts    # Main NestJS Application Module
│   │   ├── ai/              # Gemini/LLM analysis services
│   │   ├── auth/            # JWT authentication controller & guards
│   │   ├── email/           # Email invites & notifications (Nodemailer)
│   │   ├── integrations/    # External app connectors
│   │   ├── livekit/         # LiveKit audio/video session management
│   │   ├── meetings/        # Meeting controllers, Socket.IO gateway, services
│   │   ├── recordings/      # Meeting recording database service
│   │   └── teams/           # Workspace, Channels & DM group logic
│   ├── app/                 # FastAPI Backend (Python service)
│   │   ├── main.py          # FastAPI application bootstrapper
│   │   ├── api/             # JWT auth & endpoints
│   │   └── ai_workflow/     # LangGraph multi-agent systems
│   ├── tsconfig.json        # TypeScript configuration
│   ├── package.json         # Node.js dependencies & dev scripts
│   └── docker-compose.yml   # Dev DB, Redis, and Qdrant setup
└── frontend/
    ├── src/                 # React Frontend
    │   ├── main.tsx         # Frontend entry point
    │   ├── App.tsx          # App routing, layout & sidebar navigation
    │   ├── index.css        # Theme styles & global layout definitions
    │   ├── config.ts        # Frontend URL variables
    │   ├── hooks/           # Custom React hooks (e.g. useSpeechRecognition)
    │   └── pages/           # Application views
    │       ├── Login.tsx            # Login Page
    │       ├── Dashboard.tsx        # Meeting workspace list & creation dashboard
    │       ├── CreateMeeting.tsx    # Live/Scheduled meeting room wizard
    │       ├── JoinMeeting.tsx      # Landing page code joining form
    │       ├── MeetingView.tsx      # Real-time WebRTC room, transcription, & notes
    │       ├── WaitingRoom.tsx      # Lobby prior to entering video meetings
    │       ├── RecordingsPage.tsx   # Saved recordings player
    │       ├── CalendarView.tsx     # Team scheduled session scheduler calendar
    │       ├── Tasks.tsx            # Board tracking tasks extracted by AI
    │       ├── ChannelView.tsx      # Thread-based team channel workspace
    │       ├── DirectMessageView.tsx# Chat messaging dialogs
    │       ├── Integrations.tsx     # Connected external platforms configuration
    │       ├── EmailInviteModal.tsx # Dialog to send out invite URLs
    │       └── LandingPage.tsx      # Introductory product showcase website
    ├── package.json         # React packages & scripts
    └── vite.config.ts       # Vite compilation settings
├── ai_copilot/              # AI Speech & Voice Agent Helper (Python)
│   ├── main.py              # Main voice agent loop
│   ├── agent.py             # Agent LLM reasoning & prompt logic
│   ├── stt_engine.py        # Speech-to-Text (STT) transcription handler
│   ├── tts_engine.py        # Text-to-Speech (TTS) audio generator
│   └── requirements.txt     # Python requirements for the voice agent
```

---

## Configured APIs & Integrations (Environment Variables)

The project integrates **11 key third-party APIs and services** configured in the `backend/.env` file:

1. **Google Gemini API** (`GEMINI_API_KEY`): Used for LLM-based meeting transcript analysis and summary generation.
2. **Groq API** (`GROQ_API_KEY`): Fallback or alternative LLM processor.
3. **Sarvam AI API** (`SARVAM_API_KEY`): Handles advanced speech-to-text, real-time voice translation, and text-to-speech.
4. **LiveKit API** (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`): Powers real-time WebRTC audio and video streaming rooms.
5. **Qdrant Vector DB** (`QDRANT_URL`, `QDRANT_API_KEY`): Secure cloud-hosted vector storage for semantic transcript searching.
6. **Slack Integration Webhook** (`SLACK_WEBHOOK_URL`): Transmits meeting action items and alerts directly to Slack channels.
7. **Jira Integration API** (`JIRA_API_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`): Automates task generation and status updates in Jira boards.
8. **Trello Integration API** (`TRELLO_API_KEY`, `TRELLO_TOKEN`): Synchronizes extracted action items onto Trello boards.
9. **ClickUp Integration API** (`CLICKUP_ACCESS_TOKEN`, `CLICKUP_LIST_ID`): Publishes meeting tasks directly onto ClickUp task lists.
10. **Resend Email API** (`RESEND_API_KEY`): Dispatches transaction-based emails.
11. **Nodemailer SMTP Gateway** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`): Integrates with Gmail App Passwords to deliver meeting invitations.

---

## Setup & Running Guide

There are two ways to setup and run the application: **Quick Start (Root Folder)** or **Manual Component Start (Backend / Frontend separately)**.

---

### Method A: Quick Start (Root Folder)
You can set up and run the entire project (both backend and frontend) directly from the root directory:

1. **Install Root and Project Dependencies**:
   ```bash
   npm install
   npm run install:all
   ```

2. **Configure Environment Variables**:
   Create or verify the `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   DATABASE_URL="sqlite:///./dev.db"
   JWT_SECRET="super-secret-copilot-key-change-in-production"
   GROQ_API_KEY=""
   GEMINI_API_KEY=""
   ```

3. **Run the Project**:
   ```bash
   npm run dev
   ```
   This will concurrently start the backend server on [http://localhost:5000](http://localhost:5000) and the frontend dev server on [http://localhost:5173](http://localhost:5173).

---

### Method B: Manual Component Start

#### 1. Configure Environment Variables
Create or verify the `.env` file in the `backend/` directory:
```env
PORT=5000
DATABASE_URL="sqlite:///./dev.db"
JWT_SECRET="super-secret-copilot-key-change-in-production"
GROQ_API_KEY=""
GEMINI_API_KEY=""
```
*Note: If no API keys are provided, the app will run in **Mock AI Mode**, generating fully structured outputs so you can test all features.*

#### 2. Initialize & Start Backend
Navigate to the `backend/` directory, install packages, and start the development server:
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:socket_app --port 5000 --reload
```
The FastAPI server starts on [http://localhost:5000](http://localhost:5000). Swagger documentation is available at [http://localhost:5000/docs](http://localhost:5000/docs).

#### 3. Start Frontend
Navigate to the `frontend/` directory, install packages, and start the dev server:
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

