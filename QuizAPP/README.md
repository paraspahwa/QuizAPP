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
