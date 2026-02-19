
# 📄 PDF Quiz Generator

Upload any PDF and instantly get a smart multiple-choice quiz with **per-option explanations** — every answer tells you exactly why it's correct or why it's wrong.

![Tech Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![Tech Stack](https://img.shields.io/badge/AI-OpenAI%20GPT--4o-412991?logo=openai)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

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

---

## 🗂️ Project Structure

```
pdf-quiz-app/
├── backend/                  # FastAPI Python backend
│   ├── main.py               # API routes
│   ├── pdf_parser.py         # PDF text extraction + chunking
│   ├── quiz_generator.py     # OpenAI prompt + quiz generation
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile
│   └── .dockerignore
│
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx           # Stage manager
│   │   ├── main.jsx          # React entry point
│   │   ├── index.css         # Global styles
│   │   └── components/
│   │       ├── UploadSection.jsx    # PDF upload UI
│   │       ├── QuizSection.jsx      # Quiz renderer
│   │       ├── QuizCard.jsx         # Per-question card with explanations
│   │       └── ResultsSummary.jsx   # Final score screen
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
│
├── docker-compose.yml        # Run everything with one command
├── .env.example              # Environment variable template
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start (Docker — Recommended)

### 1. Clone the repo
```bash
git clone https://github.com/your-username/pdf-quiz-app.git
cd pdf-quiz-app
```

### 2. Set up your environment
```bash
cp .env.example .env
```
Open `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-key-here
```

### 3. Build and run
```bash
docker compose up --build
```

### 4. Open the app
Visit **http://localhost:3000**

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

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key (required) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Backend | Python 3.11, FastAPI |
| PDF Parsing | pdfplumber |
| AI | OpenAI GPT-4o |
| Containerization | Docker, Docker Compose |
| Reverse Proxy | nginx |

---

## 📡 API Reference

### `POST /upload-and-generate`

Accepts a PDF file and returns a quiz.

**Query params:**
- `num_questions` (int, default: 5) — number of questions to generate
- `difficulty` (string, default: `medium`) — `easy` | `medium` | `hard`

**Form data:**
- `file` — the PDF file

**Response:**
```json
{
  "status": "success",
  "quiz": {
    "questions": [
      {
        "question": "What is photosynthesis?",
        "concept_summary": "Photosynthesis converts sunlight into energy.",
        "options": [
          {
            "text": "Process by which plants make food using sunlight",
            "is_correct": true,
            "explanation": "This is correct because..."
          },
          {
            "text": "Process of water evaporation",
            "is_correct": false,
            "explanation": "This is incorrect because..."
          }
        ]
      }
    ]
  }
}
```

---

## 🔮 Roadmap

- [ ] Export quiz to PDF
- [ ] Timer / exam mode
- [ ] User auth + quiz history
- [ ] True/False and short answer question types
- [ ] Highlight source text in PDF

---

## 📄 License

MIT
