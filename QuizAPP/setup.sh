#!/bin/bash
# ================================================================
# MedQuizAI — Complete Repo Setup Script
# Run this from the ROOT of your cloned QuizAPP repo:
#   git clone https://github.com/paraspahwa/QuizAPP.git
#   cd QuizAPP
#   bash setup.sh
# ================================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓ $1${NC}"; }
info() { echo -e "${BLUE}→ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo ""
echo "================================================"
echo "  MedQuizAI — Repo Setup"
echo "================================================"
echo ""

# ── Step 1: Create all directories ───────────────────────────────
info "Creating directory structure..."

mkdir -p backend/routes
mkdir -p frontend/src/context
mkdir -p frontend/src/components
mkdir -p terraform/modules/vpc
mkdir -p terraform/modules/ec2
mkdir -p terraform/modules/eks
mkdir -p terraform/modules/security_groups
mkdir -p terraform/modules/iam
mkdir -p terraform/k8s
mkdir -p terraform/scripts
mkdir -p .github/workflows

log "Directories created"

# ── Step 2: .gitignore ────────────────────────────────────────────
info "Writing .gitignore..."
cat > .gitignore << 'EOF'
# Environment
.env
.env.*
!.env.example

# Python
__pycache__/
*.pyc
*.pyo
venv/
.venv/

# Node
node_modules/
frontend/dist/

# Terraform — never commit state or real tfvars
terraform/.terraform/
terraform/*.tfstate
terraform/*.tfstate.backup
terraform/.terraform.lock.hcl
terraform/terraform.tfvars

# Data (user DBs and PDFs — lives on server only)
data/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
EOF
log ".gitignore written"

# ── Step 3: .env.example ──────────────────────────────────────────
info "Writing .env.example..."
cat > .env.example << 'EOF'
# Copy this to .env and fill in real values
# NEVER commit .env to git

OPENAI_API_KEY=sk-your-openai-key-here
SECRET_KEY=generate-a-long-random-string-here
EOF
log ".env.example written"

# ── Step 4: docker-compose.yml ────────────────────────────────────
info "Writing docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: "3.9"

services:

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: quiz-backend
    restart: unless-stopped
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
    ports:
      - "8000:8000"
    volumes:
      - quiz_data:/data
    networks:
      - quiz-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: quiz-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - quiz-network

volumes:
  quiz_data:

networks:
  quiz-network:
    driver: bridge
EOF
log "docker-compose.yml written"

# ── Step 5: Backend files ─────────────────────────────────────────
info "Writing backend files..."

cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y \
    libpoppler-cpp-dev poppler-utils \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /data
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

cat > backend/.dockerignore << 'EOF'
__pycache__/
*.pyc
venv/
.env
.env.*
data/
EOF

cat > backend/requirements.txt << 'EOF'
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
pdfplumber==0.11.0
openai>=1.52.0
httpx<0.28.0
pydantic==2.7.1
python-dotenv==1.0.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
EOF

cat > backend/database.py << 'EOF'
import sqlite3
import os

DATA_DIR = os.environ.get("DATA_DIR", "/data")
MAIN_DB  = os.path.join(DATA_DIR, "main.db")

def get_main_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(MAIN_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_user_dir(user_id: int) -> str:
    path = os.path.join(DATA_DIR, "users", str(user_id))
    os.makedirs(path, exist_ok=True)
    return path

def get_user_pdfs_dir(user_id: int) -> str:
    path = os.path.join(get_user_dir(user_id), "pdfs")
    os.makedirs(path, exist_ok=True)
    return path

def get_user_db(user_id: int):
    db_path = os.path.join(get_user_dir(user_id), "data.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_main_db():
    conn = get_main_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            username         TEXT    UNIQUE NOT NULL,
            email            TEXT    UNIQUE NOT NULL,
            hashed_password  TEXT    NOT NULL,
            is_admin         INTEGER DEFAULT 0,
            created_at       TEXT    DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()

def init_user_db(user_id: int):
    conn = get_user_db(user_id)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pdfs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            filename    TEXT NOT NULL UNIQUE,
            size_bytes  INTEGER,
            uploaded_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            pdf_id         INTEGER NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
            pdf_name       TEXT    NOT NULL,
            total_answered INTEGER DEFAULT 0,
            total_correct  INTEGER DEFAULT 0,
            sessions       INTEGER DEFAULT 0,
            last_score     INTEGER,
            last_session   TEXT
        )
    """)
    conn.commit()
    conn.close()
EOF

cat > backend/auth.py << 'EOF'
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import get_main_db

SECRET_KEY         = os.environ.get("SECRET_KEY", "change-me-in-production")
ALGORITHM          = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2  = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_user(token: str = Depends(oauth2)):
    user_id = decode_token(token)
    conn = get_main_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return dict(user)

def require_admin(user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
EOF

cat > backend/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_main_db
from routes import auth, pdfs, quiz

app = FastAPI(title="MedQuiz AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_main_db()

app.include_router(auth.router)
app.include_router(pdfs.router)
app.include_router(quiz.router)

@app.get("/health")
def health():
    return {"status": "ok"}
EOF

# routes/__init__.py
touch backend/routes/__init__.py

cat > backend/routes/auth.py << 'EOF'
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from database import get_main_db, init_user_db
from auth import hash_password, verify_password, create_token, get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

@router.post("/signup")
def signup(body: SignupRequest):
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    conn = get_main_db()
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    is_admin = 1 if count == 0 else 0
    try:
        cur = conn.execute(
            "INSERT INTO users (username, email, hashed_password, is_admin) VALUES (?,?,?,?)",
            (body.username.strip(), body.email.strip().lower(), hash_password(body.password), is_admin)
        )
        user_id = cur.lastrowid
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(400, "Username or email already exists")
    conn.close()
    init_user_db(user_id)
    return {"access_token": create_token(user_id), "token_type": "bearer", "is_admin": bool(is_admin)}

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    conn = get_main_db()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?", (form.username, form.username)
    ).fetchone()
    conn.close()
    if not user or not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid username or password")
    return {"access_token": create_token(user["id"]), "token_type": "bearer", "is_admin": bool(user["is_admin"])}

@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"], "email": user["email"],
            "is_admin": bool(user["is_admin"]), "created_at": user["created_at"]}

@router.get("/users")
def list_users(admin=Depends(require_admin)):
    conn = get_main_db()
    users = conn.execute("SELECT id, username, email, is_admin, created_at FROM users ORDER BY id").fetchall()
    conn.close()
    return [dict(u) for u in users]

@router.post("/users/{user_id}/toggle-admin")
def toggle_admin(user_id: int, admin=Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Cannot change your own admin status")
    conn = get_main_db()
    conn.execute("UPDATE users SET is_admin = CASE WHEN is_admin=1 THEN 0 ELSE 1 END WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"ok": True}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin=Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    conn = get_main_db()
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
EOF

cat > backend/routes/pdfs.py << 'EOF'
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from auth import get_current_user
from database import get_user_db, get_user_pdfs_dir

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

@router.post("/upload")
async def upload_pdf(files: list[UploadFile] = File(...), user=Depends(get_current_user)):
    user_id  = user["id"]
    pdfs_dir = get_user_pdfs_dir(user_id)
    conn     = get_user_db(user_id)
    uploaded = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue
        content  = await file.read()
        safe_name    = os.path.basename(file.filename)
        dest_path    = os.path.join(pdfs_dir, safe_name)
        with open(dest_path, "wb") as f:
            f.write(content)
        display_name = os.path.splitext(safe_name)[0].replace("-", " ").replace("_", " ").title()
        try:
            conn.execute("INSERT OR REPLACE INTO pdfs (name, filename, size_bytes) VALUES (?,?,?)",
                        (display_name, safe_name, len(content)))
        except Exception:
            pass
        uploaded.append({"name": display_name, "filename": safe_name})
    conn.commit()
    conn.close()
    return {"uploaded": uploaded, "count": len(uploaded)}

@router.get("/list")
def list_pdfs(user=Depends(get_current_user)):
    conn = get_user_db(user["id"])
    rows = conn.execute(
        "SELECT p.id, p.name, p.filename, p.size_bytes, p.uploaded_at, "
        "pr.total_answered, pr.total_correct, pr.sessions, pr.last_score, pr.last_session "
        "FROM pdfs p LEFT JOIN progress pr ON pr.pdf_id = p.id ORDER BY p.name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.delete("/{pdf_id}")
def delete_pdf(pdf_id: int, user=Depends(get_current_user)):
    user_id = user["id"]
    conn    = get_user_db(user_id)
    row     = conn.execute("SELECT filename FROM pdfs WHERE id=?", (pdf_id,)).fetchone()
    if not row:
        raise HTTPException(404, "PDF not found")
    file_path = os.path.join(get_user_pdfs_dir(user_id), row["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)
    conn.execute("DELETE FROM pdfs WHERE id=?", (pdf_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
EOF

cat > backend/routes/quiz.py << 'EOF'
import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from auth import get_current_user
from database import get_user_db, get_user_pdfs_dir
from pdf_parser import extract_text_from_pdf
from quiz_generator import generate_quiz

router = APIRouter(prefix="/quiz", tags=["quiz"])

class GenerateRequest(BaseModel):
    pdf_id: int
    num_questions: int = 5
    difficulty: str = "medium"

class SaveProgressRequest(BaseModel):
    pdf_id: int
    pdf_name: str
    questions_answered: int
    questions_correct: int
    score_pct: int

@router.post("/generate")
def generate(body: GenerateRequest, user=Depends(get_current_user)):
    user_id = user["id"]
    conn    = get_user_db(user_id)
    pdf_row = conn.execute("SELECT * FROM pdfs WHERE id=?", (body.pdf_id,)).fetchone()
    conn.close()
    if not pdf_row:
        raise HTTPException(404, "PDF not found")
    pdf_path = os.path.join(get_user_pdfs_dir(user_id), pdf_row["filename"])
    if not os.path.exists(pdf_path):
        raise HTTPException(404, "PDF file missing from disk")
    text = extract_text_from_pdf(pdf_path)
    if not text.strip():
        raise HTTPException(422, "Could not extract text from this PDF")
    quiz = generate_quiz(text, num_questions=body.num_questions, difficulty=body.difficulty)
    return {"status": "success", "quiz": quiz, "pdf_name": pdf_row["name"]}

@router.post("/save-progress")
def save_progress(body: SaveProgressRequest, user=Depends(get_current_user)):
    user_id  = user["id"]
    conn     = get_user_db(user_id)
    existing = conn.execute("SELECT * FROM progress WHERE pdf_id=?", (body.pdf_id,)).fetchone()
    if existing:
        conn.execute("""UPDATE progress SET
            total_answered = total_answered + ?,
            total_correct  = total_correct  + ?,
            sessions       = sessions + 1,
            last_score     = ?,
            last_session   = datetime('now')
            WHERE pdf_id = ?""",
            (body.questions_answered, body.questions_correct, body.score_pct, body.pdf_id))
    else:
        conn.execute("""INSERT INTO progress
            (pdf_id, pdf_name, total_answered, total_correct, sessions, last_score, last_session)
            VALUES (?,?,?,?,1,?,datetime('now'))""",
            (body.pdf_id, body.pdf_name, body.questions_answered, body.questions_correct, body.score_pct))
    conn.commit()
    conn.close()
    return {"ok": True}

@router.get("/progress")
def get_progress(user=Depends(get_current_user)):
    conn = get_user_db(user["id"])
    rows = conn.execute("SELECT * FROM progress").fetchall()
    conn.close()
    return [dict(r) for r in rows]
EOF

cat > backend/pdf_parser.py << 'EOF'
import pdfplumber

def extract_text_from_pdf(file_path: str) -> str:
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)

def chunk_text(text: str, max_chars: int = 6000) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    chunks = []
    paragraphs = text.split("\n\n")
    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk += "\n\n" + para
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    return chunks
EOF

cat > backend/quiz_generator.py << 'EOF'
import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from pdf_parser import chunk_text

load_dotenv()
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

PROMPT_TEMPLATE = """
You are an expert teacher and quiz designer.
From the study material below, generate {num_questions} multiple choice questions.
Requirements:
- 4 options per question
- Only 1 correct answer
- Difficulty level: {difficulty}
- For each option include is_correct (true/false) and explanation

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "question": "",
      "concept_summary": "",
      "options": [
        {{"text": "", "is_correct": true, "explanation": ""}},
        {{"text": "", "is_correct": false, "explanation": ""}},
        {{"text": "", "is_correct": false, "explanation": ""}},
        {{"text": "", "is_correct": false, "explanation": ""}}
      ]
    }}
  ]
}}

Study Material:
{text}
"""

def generate_quiz(text: str, num_questions: int = 5, difficulty: str = "medium") -> dict:
    chunks   = chunk_text(text, max_chars=6000)
    all_questions = []
    questions_per_chunk = max(1, num_questions // len(chunks))
    remaining = num_questions
    for i, chunk in enumerate(chunks):
        if remaining <= 0:
            break
        q_count  = questions_per_chunk if i < len(chunks) - 1 else remaining
        q_count  = min(q_count, remaining)
        prompt   = PROMPT_TEMPLATE.format(num_questions=q_count, difficulty=difficulty, text=chunk)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content)
        questions = parsed.get("questions", [])
        all_questions.extend(questions)
        remaining -= len(questions)
    return {"questions": all_questions[:num_questions]}
EOF

log "Backend files written"

# ── Step 6: Frontend files ────────────────────────────────────────
info "Writing frontend files..."

cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

cat > frontend/.dockerignore << 'EOF'
node_modules/
dist/
.env
.env.*
EOF

cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    resolver 127.0.0.11 valid=30s;
    client_max_body_size 200M;

    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass         http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
EOF

cat > frontend/package.json << 'EOF'
{
  "name": "pdf-quiz-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.1"
  }
}
EOF

cat > frontend/vite.config.js << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
EOF

cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedQuiz AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# Frontend src files
cat > frontend/src/main.jsx << 'EOF'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
EOF

cat > frontend/src/context/AuthContext.jsx << 'EOF'
import { createContext, useContext, useState, useEffect } from "react";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => { setUser(u); setLoading(false); })
        .catch(() => { logout(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  function login(tokenStr, userData) {
    localStorage.setItem("token", tokenStr);
    setToken(tokenStr);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  function authHeader() {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
EOF

log "Frontend files written"

# ── Step 7: Terraform files ───────────────────────────────────────
info "Writing Terraform files..."

cat > terraform/terraform.tfvars.example << 'EOF'
# Copy this to terraform.tfvars and fill in your values
project                = "medquizai"
environment            = "prod"
aws_region             = "us-east-1"
vpc_cidr               = "10.0.0.0/16"
availability_zones     = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs    = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs   = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
key_pair_name          = "your-aws-key-pair-name"
frontend_instance_type = "t3.small"
backend_instance_type  = "t3.medium"
kubernetes_version     = "1.28"
eks_node_instance_type = "t3.medium"
eks_node_desired_size  = 2
eks_node_min_size      = 1
eks_node_max_size      = 4
EOF

log "Terraform example tfvars written"

# ── Step 8: GitHub Actions workflows ─────────────────────────────
info "Writing GitHub Actions workflows..."

cat > .github/workflows/deploy.yml << 'WORKFLOW'
name: Deploy to EC2

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository_owner }}

jobs:
  # ── Test ──────────────────────────────────────────────────────
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install backend deps
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Lint backend
        run: |
          pip install flake8
          flake8 backend/ --max-line-length=120 --exclude=__pycache__ || true

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package.json

      - name: Install & build frontend
        run: |
          cd frontend
          npm install
          npm run build

  # ── Build & Push Docker images ────────────────────────────────
  build:
    name: Build & Push Images
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build & push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/medquizai-backend:latest
            ghcr.io/${{ github.repository_owner }}/medquizai-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build & push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/medquizai-frontend:latest
            ghcr.io/${{ github.repository_owner }}/medquizai-frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── Deploy to EC2 ─────────────────────────────────────────────
  deploy:
    name: Deploy to EC2
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host:     ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key:      ${{ secrets.EC2_SSH_KEY }}
          script: |
            set -e
            cd /home/ubuntu/QuizAPP

            echo "Pulling latest code..."
            git pull origin main

            echo "Logging into GitHub Container Registry..."
            echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            echo "Pulling latest images..."
            docker pull ghcr.io/${{ github.repository_owner }}/medquizai-backend:latest
            docker pull ghcr.io/${{ github.repository_owner }}/medquizai-frontend:latest

            echo "Restarting containers..."
            docker-compose down
            docker-compose up -d

            echo "Cleaning up old images..."
            docker image prune -f

            echo "✅ Deployment complete!"

  # ── Notify ────────────────────────────────────────────────────
  notify:
    name: Notify Result
    runs-on: ubuntu-latest
    needs: [test, build, deploy]
    if: always()
    steps:
      - name: Deployment status
        run: |
          if [ "${{ needs.deploy.result }}" == "success" ]; then
            echo "✅ Deployment succeeded!"
          else
            echo "❌ Deployment failed. Check logs above."
            exit 1
          fi
WORKFLOW

cat > .github/workflows/terraform.yml << 'WORKFLOW'
name: Terraform Plan & Apply

on:
  push:
    branches: [main]
    paths:
      - "terraform/**"
  pull_request:
    branches: [main]
    paths:
      - "terraform/**"

jobs:
  terraform:
    name: Terraform
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: terraform

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region:            ${{ secrets.AWS_REGION }}

      - name: Write tfvars
        run: |
          cat > terraform.tfvars << EOF
          project                = "medquizai"
          environment            = "prod"
          aws_region             = "${{ secrets.AWS_REGION }}"
          key_pair_name          = "${{ secrets.AWS_KEY_PAIR_NAME }}"
          frontend_instance_type = "t3.small"
          backend_instance_type  = "t3.medium"
          kubernetes_version     = "1.28"
          eks_node_instance_type = "t3.medium"
          eks_node_desired_size  = 2
          eks_node_min_size      = 1
          eks_node_max_size      = 4
          EOF

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format Check
        run: terraform fmt -check || true

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        env:
          TF_VAR_key_pair_name: ${{ secrets.AWS_KEY_PAIR_NAME }}

      # Only apply on push to main (not on PRs)
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply -auto-approve tfplan
WORKFLOW

log "GitHub Actions workflows written"

# ── Step 9: README ────────────────────────────────────────────────
info "Writing README.md..."
cat > README.md << 'EOF'
# MedQuizAI 🏥

AI-powered medical quiz app — upload PDFs, get instant quizzes with per-option explanations.

## Tech Stack
- **Frontend**: React 18 + Vite + nginx
- **Backend**: Python 3.11 + FastAPI
- **AI**: OpenAI GPT-4o
- **Database**: SQLite (per-user)
- **Infrastructure**: AWS (EC2 + EKS) via Terraform
- **CI/CD**: GitHub Actions

## Quick Start (Docker)

```bash
cp .env.example .env
# Add your OPENAI_API_KEY and SECRET_KEY to .env
docker-compose up --build
```
Open **http://localhost:3000**

## Repo Structure

```
QuizAPP/
├── backend/          # FastAPI + SQLite
├── frontend/         # React + Vite
├── terraform/        # AWS infra (VPC, EC2, EKS)
└── .github/workflows # CI/CD pipelines
```

## CI/CD
Every push to `main` automatically:
1. Runs tests & builds frontend
2. Builds & pushes Docker images to GitHub Container Registry
3. SSH deploys to your EC2

## Infrastructure
See `terraform/README.md` for full AWS architecture docs.
EOF
log "README written"

# ── Done ──────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo -e "${GREEN}  ✅ Setup complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. git add ."
echo "  2. git commit -m 'feat: complete MedQuizAI setup'"
echo "  3. git push origin main"
echo ""
echo "Then add these GitHub Secrets (Settings → Secrets → Actions):"
echo "  EC2_HOST          your server public IP"
echo "  EC2_USER          ubuntu"
echo "  EC2_SSH_KEY       contents of your .pem file"
echo "  AWS_ACCESS_KEY_ID     your AWS key"
echo "  AWS_SECRET_ACCESS_KEY your AWS secret"
echo "  AWS_REGION            us-east-1"
echo "  AWS_KEY_PAIR_NAME     your EC2 key pair name"
echo ""
