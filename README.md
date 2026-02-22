
# 📄 MedQuizAI — PDF Quiz Generator

Upload any PDF and instantly get a smart multiple-choice quiz with **per-option explanations** — every answer tells you exactly why it's correct or why it's wrong.

![Tech Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![Tech Stack](https://img.shields.io/badge/AI-GPT--4o--mini-412991?logo=openai)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![Cost](https://img.shields.io/badge/Hosting-$0--6%2Fmo-brightgreen)

---

## ✨ Features

- 📤 Drag & drop PDF upload
- 🤖 AI-generated MCQs with 4 options each
- ✅ Per-option explanations (why correct / why wrong)
- 📚 Concept summary after each question
- 🎯 Difficulty selector (Easy / Medium / Hard)
- 🔢 Question count selector (5 / 10 / 15 / 20)
- 📊 Score + grade summary screen
- 🔀 Large PDF chunking (handles 100+ page docs)
- 💾 Quiz caching (no repeat OpenAI calls for same PDF)
- 🔒 Auto HTTPS via Caddy + Let's Encrypt

---

## 🗂️ Project Structure

```
QuizAPP/
├── backend/                    # FastAPI + SQLite + quiz caching
│   ├── main.py                 # API routes
│   ├── pdf_parser.py           # PDF text extraction + chunking
│   ├── quiz_generator.py       # OpenAI prompt (gpt-4o-mini)
│   ├── database.py             # SQLite + cache tables
│   ├── auth.py                 # JWT authentication
│   ├── routes/                 # API route modules
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
│
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── UploadSection.jsx
│   │       ├── QuizSection.jsx
│   │       ├── QuizCard.jsx
│   │       └── ResultsSummary.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
│
├── deploy/                     # Production deployment
│   ├── Caddyfile               # Reverse proxy + auto HTTPS
│   └── vps-setup.sh            # One-time VPS provisioning
│
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production (with Caddy)
├── .env.example
├── .gitignore
├── .github/workflows/deploy.yml
└── README.md
```

---

## 🚀 Quick Start (Docker — Local Dev)

### 1. Clone the repo
```bash
git clone https://github.com/paraspahwa/QuizAPP.git
cd QuizAPP
```

### 2. Set up your environment
```bash
cp .env.example .env
```
Open `.env` and add your keys:
```
OPENAI_API_KEY=sk-your-key-here
SECRET_KEY=run-openssl-rand-hex-32
```

### 3. Build and run
```bash
docker compose up --build
```

### 4. Open the app
Visit **http://localhost:3000**

---

## 🌐 Deploy to Production ($0–6/month)

This app is designed to run on a **single cheap VPS** — no Kubernetes, no AWS EKS, no multi-server setup needed.

### Recommended hosting (pick one):

| Provider | Plan | Cost | Notes |
|---|---|---|---|
| **Oracle Cloud** | Free Tier ARM (4 OCPU, 24GB) | **$0/mo** | Best value, forever free |
| **Hetzner** | CX22 (2 vCPU, 4GB) | ~€4.5/mo | Best EU option |
| **AWS Lightsail** | 1 vCPU, 1GB | $5/mo | Familiar if you use AWS |
| **DigitalOcean** | Basic (1 vCPU, 2GB) | $6/mo | Simple UI |

### Step 1: Provision your VPS
```bash
ssh root@your-server-ip
bash <(curl -sSL https://raw.githubusercontent.com/paraspahwa/QuizAPP/main/deploy/vps-setup.sh)
```

### Step 2: Configure
```bash
cd /home/appuser/QuizAPP

# Add your API keys
nano .env

# Set your domain for auto HTTPS
nano deploy/Caddyfile
```

### Step 3: Launch
```bash
# With domain + HTTPS:
docker compose -f docker-compose.prod.yml up -d --build

# Without domain (IP-only):
docker compose up -d --build
```

---

## 💻 Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Backend runs at: http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:5173

---

## 💰 Cost Breakdown

| Item | Monthly Cost |
|---|---|
| VPS hosting | $0–6 |
| OpenAI API (gpt-4o-mini + caching) | ~$0.50–5 |
| Domain name (optional) | ~$1 |
| SSL certificate | **Free** (auto via Caddy) |
| **Total** | **$1.50–12/month** |

### Cost-saving features built in:
- **GPT-4o-mini** instead of GPT-4o (~15x cheaper, nearly identical quiz quality)
- **Quiz caching** in SQLite — same PDF + same settings = instant cached response
- **Configurable model** — set `OPENAI_MODEL=gpt-4o` in `.env` to upgrade if needed
- **`?fresh=true`** query param to force regeneration when you want new questions

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key | (required) |
| `SECRET_KEY` | JWT signing secret | (required) |
| `OPENAI_MODEL` | AI model to use | `gpt-4o-mini` |

---

## 🔄 CI/CD (Auto-deploy)

Every push to `main` auto-deploys to your VPS.

Add these GitHub Secrets (Settings → Secrets → Actions):
- `VPS_HOST` — your server public IP
- `VPS_USER` — `appuser` (or `ubuntu`)
- `VPS_SSH_KEY` — contents of your SSH private key

---

## 📡 API Reference

### `POST /quiz/generate`
Generate a quiz from a previously uploaded PDF.

**Body (JSON):**
```json
{
  "pdf_id": 1,
  "num_questions": 5,
  "difficulty": "medium"
}
```

**Query params:**
- `fresh` (bool, default: false) — bypass cache and regenerate

### `POST /pdfs/upload`
Upload PDF file(s). Multipart form data.

### `GET /pdfs/list`
List all uploaded PDFs with progress stats.

### `POST /quiz/save-progress`
Save quiz attempt results.

### `DELETE /quiz/cache/{pdf_id}`
Clear cached quizzes for a specific PDF.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Backend | Python 3.11, FastAPI |
| PDF Parsing | pdfplumber |
| AI | OpenAI GPT-4o-mini |
| Database | SQLite (per-user) |
| Containerization | Docker, Docker Compose |
| Reverse Proxy | Caddy (prod) / nginx (dev) |
| HTTPS | Let's Encrypt (auto via Caddy) |
| CI/CD | GitHub Actions |

---

## 📄 License

MIT
