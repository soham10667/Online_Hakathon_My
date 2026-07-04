<img width="4320" height="1440" alt="hh26 main poster 2 with sponsors 3x1 (4320 x 1440 px) (2)" src="https://github.com/user-attachments/assets/c698b2cd-da84-4cb0-9276-125c6a7244aa" />




# 🚀 AI Meeting Copilot For Remote Teams

> Interactive, real-time AI Meeting Copilot that streams conversations, extracts action items dynamically, identifies blockers/risks, and compiles professional meeting summaries and analytics.

---

## 📌 Problem & Domain

- **Meeting Fatigue & Context Gaps:** Remote teams suffer from meeting fatigue, leading to manual note-taking errors and lost context or key decisions.
- **Accent & Transcription Barriers:** Traditional speech-to-text tools struggle with diverse regional accents and code-mixed languages (such as Hinglish).
- **Timezone Complexity:** Managing deadlines and action items across distributed global timezones makes post-meeting tracking complex.

**Themes Selected (at least one):**
- [x] Human Experience & Productivity  
- [ ] Climate & Sustainability Systems  
- [ ] HealthTech & Bio Platforms  
- [ ] Learning & Knowledge Systems  
- [x] Work, Finance & Digital Economy  
- [ ] Infrastructure, Mobility & Smart Systems  
- [ ] Trust, Identity & Security  
- [ ] Media, Social & Interactive Platforms  
- [ ] Public Systems, Governance and Civic Tech  
- [x] Developer Tools & Software Infrastructure  

*(You can select multiple themes if applicable)*

---

## 🎯 Objective

Our project streamlines collaboration for distributed teams by converting live meeting streams into structured, actionable databases. It serves:
- **Target users:** Remote engineers, product managers, global stakeholders, and team leads.
- **The pain point:** Missed deadlines, verbal agreements lost to history, accent-related communication gaps, and manual ClickUp ticket creation.
- **The value:** Live speech-to-text with timezone-aware action lists, multi-agent AI digests, and direct Slack/ClickUp integrations.

---

## 🧠 Team & Approach

### Team Name:  
`Quantum Coders`

### Team Members:  
- Soham Sirpurwar ([GitHub](https://github.com/soham10667/Online_Hakathon_My.git) / [LinkedIn](https://www.linkedin.com/in/soham-sirpurwar-5b5b4a366/) / College Student)  
- Sarang Channe  
- Sujal Pawar 
- Dipti Khobragade

### Your Approach:
- **Why we chose this problem:** Productive collaboration is the backbone of remote work, yet hours are wasted manually documenting meetings or chasing down post-meeting alignment.
- **Key challenges addressed:** Handling real-time low-latency audio transmission, processing Hinglish and regional speech with Sarvam AI, and building deterministic tasks from non-deterministic meeting summaries using LangGraph.
- **Iterations & Breakthroughs:** Evolved from simple transcription to an agentic multi-stage pipeline utilizing Qdrant for semantic vector memory and Resend for automatic notification invite links.

---

## 🛠️ Tech Stack

### Core Technologies Used:
- **Frontend:** React (Vite), TypeScript, Socket.IO client, Tailwind / Vanilla CSS
- **Backend:** FastAPI (Python), Socket.IO ASGI Gateway, JWT Auth
- **Database:** PostgreSQL / SQLite (Development)
- **APIs:** Google Gemini API, Groq API, Sarvam AI API, LiveKit API, Resend API
- **Hosting / Storage:** AWS S3 (audio archives), Qdrant Cloud (vector index), Redis (cache)

### Additional Technologies Used (Optional):
- [x] AI / ML  
- [ ] Web3 / Blockchain  
- [ ] Cyber Security 
- [x] Cloud  

---

## 🏆 Sponsored Track (Optional)

Select if your project participates in any track:

- [ ] **Expo Track** – Built using Expo  
- [ ] **Neo4j Track** – Uses AuraDB as primary database  
- [ ] **Base44 Track** – Prototype/Final Product built using Base44  
- [x] **Render Track** – Project services deployed and managed via Render cloud hosting configuration (`render.yaml`)

Provide a short note on how you used the partner technology:

> *We integrated **Sarvam AI's** advanced models (`saaras:v3` and `bulbul:v3`) for Indian-accent transcription, Hinglish code-mixed support, and a text-to-speech voice assistant to read back meeting alerts and summaries. We also utilized **Google Gemini & Groq APIs** to power our LangGraph agentic reasoning backend, and **Qdrant Vector DB** for semantic memory. Additionally, we configured the entire application infrastructure (FastAPI backend, React static site, and Redis database caching services) for streamlined deployment on **Render** using our [`render.yaml`](file:///e:/Online_Hakathon_Fresh/render.yaml) file.*

---

## ✨ Key Features

Highlight the most important features of your project:

- ✅ **Real-Time Transcription & Translation:** Real-time speech stream translation & transcription handling Hinglish/regional dialects.
- ✅ **Multi-Agent AI Summarization:** LangGraph network generating key summaries, next steps, and absent-member catch-up notes.
- ✅ **Dynamic Action Item & Risk Tracker:** Automated task delegation and timezone-aware deadlines posted straight to ClickUp/Slack.
- ✅ **Semantic Knowledge Search:** Natural language search powered by Qdrant across all historical meetings.
- ✅ **Collaboration Analytics Dashboard:** Turn-taking ratio, attendance tracker, and automatic speaker sentiment analysis.

---

## 📽️ Demo & Deliverables

- **Demo Video Link (Mandatory):** [Paste link]  
- **Deployment Link (Recommended):** [https://online-hakathon-my.onrender.com/](https://online-hakathon-my.onrender.com/)
- **Pitch Deck / PPT (Optional):** [Paste link]  

---

## ✅ Tasks & Bonus Checklist

- [ ] All team members completed the mandatory social task  
- [ ] Bonus Task 1 – Badge sharing  
- [ ] Bonus Task 2 – Blog/article  

---

## 🧪 How to Run the Project

### Requirements:
- **Node.js** (v18+)
- **Python** (3.10+)
- **Docker** (for PostgreSQL, Redis, Qdrant setup)
- **API Keys:** `GEMINI_API_KEY`, `GROQ_API_KEY`, `SARVAM_API_KEY`, `LIVEKIT_API_KEY` (or runs in **Mock AI Mode** if keys are omitted).

### Local Setup:
1. **Clone the Repository & Install Dependencies**:
   ```bash
   npm install
   npm run install:all
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   DATABASE_URL="sqlite:///./dev.db"
   JWT_SECRET="super-secret-copilot-key-change-in-production"
   GROQ_API_KEY="your-groq-key"
   GEMINI_API_KEY="your-gemini-key"
   SARVAM_API_KEY="your-sarvam-key"
   ```

3. **Run Dev Servers (Concurrently)**:
   ```bash
   npm run dev
   ```
   *Frontend starts on http://localhost:5173 and Backend runs on http://localhost:5000.*

---

## 🧬 Future Scope

List improvements, extensions, or follow-up features:

- 📈 **More integrations:** Native integrations for Slack webhook enhancements, Clickup, and Google Calendar.
- 🛡️ **Security enhancements:** Secure audio stream encryption and role-based transcription access.
- 🌐 **Localization / broader accessibility:** Real-time multi-lingual speech output translation using additional Sarvam models.

---

## 📎 Resources / Credits

- **Sarvam AI** for regional speech processing & synthesis.
- **LangGraph & LangChain** for multi-agent workflows.
- **Qdrant Vector DB** for semantic database capabilities.
- **LiveKit** for WebRTC connection streams.

---

## 🏁 Final Words

Built during the hackathon, this project pushed us to combine real-time WebSockets, multi-agent frameworks, and vector search to build a polished, production-grade productivity suite. Designing for diverse local dialects and global timezones was challenging but highly rewarding!
