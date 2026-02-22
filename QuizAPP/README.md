# MedQuizAI 🏥

AI-powered medical quiz app — upload PDFs, get instant quizzes with per-option explanations.

## Tech Stack
- **Frontend**: React 18 + Vite + nginx
- **Backend**: Python 3.11 + FastAPI
- **AI**: OpenAI GPT-4o-mini (cost-optimized, ~15x cheaper than GPT-4o)
- **Database**: SQLite (per-user) + quiz caching
- **Infrastructure**: Single VPS + Docker Compose + Caddy (auto HTTPS)
- **CI/CD**: GitHub Actions (SSH deploy)

## Quick Start (Local / Docker)

```bash
git clone https://github.com/paraspahwa/QuizAPP.git
cd QuizAPP
cp .env.example .env
# Edit .env → add your OPENAI_API_KEY and SECRET_KEY
docker compose up --build
```
Open **http://localhost:3000**

## Deploy to Production (Single VPS — $0–6/month)

### Recommended cheap hosting:
| Provider | Plan | Cost |
|---|---|---|
| Oracle Cloud Free Tier | 4 OCPU, 24GB ARM | **$0/month** |
| Hetzner CX22 | 2 vCPU, 4GB RAM | ~$5/month |
| AWS Lightsail | 1 vCPU, 1GB RAM | $5/month |
| DigitalOcean | 1 vCPU, 2GB RAM | $6/month |

### One-time server setup:
```bash
ssh root@your-server-ip
# Run the VPS setup script
bash <(curl -sSL https://raw.githubusercontent.com/paraspahwa/QuizAPP/main/deploy/vps-setup.sh)
`Every push to main auto-deploys to your VPS.

Add these GitHub Secrets (Settings → Secrets → Actions):

VPS_HOST — your server public IP
VPS_USER — appuser (or ubuntu)
VPS_SSH_KEY — contents of your SSH private key
``

### Configure and launch:
```bash
cd /home/appuser/QuizAPP

# 1. Add your secrets
nano .env

# 2. Set your domain (for free HTTPS via Caddy)
nano deploy/Caddyfile

# 3. Launch!
docker compose -f docker-compose.prod.yml up -d --build
```

### No domain? IP-only mode:
```bash
docker compose up -d --build
# App available at http://your-server-ip:3000
```

## CI/CD (Auto-deploy on push)

Add these GitHub Secrets (Settings → Secrets → Actions):
- `VPS_HOST` — your server IP
- `VPS_USER` — `appuser` (or `ubuntu`)
- `VPS_SSH_KEY` — contents of your SSH private key

Every push to `main` auto-deploys via SSH.

## Cost Breakdown

| Item | Monthly Cost |
|---|---|
| VPS hosting | $0–6 |
| OpenAI API (gpt-4o-mini + caching) | ~$0.50–5 |
| Domain (optional) | ~$1 |
| SSL certificate | **Free** (Caddy auto-provisions) |
| **Total** | **$1.50–12/month** |

## Cost-Saving Features Built In
- **GPT-4o-mini** instead of GPT-4o (~15x cheaper, same quiz quality)
- **Quiz caching** — same PDF + settings = cached result, no repeat API calls
- **Configurable model** — set `OPENAI_MODEL` in `.env` to switch models
- **`?fresh=true`** — force regenerate quiz when needed

## Repo Structure

```
QuizAPP/
├── backend/           # FastAPI + SQLite + quiz caching
├── frontend/          # React + Vite
├── deploy/            # Production configs
│   ├── Caddyfile      # Reverse proxy + auto HTTPS
│   └── vps-setup.sh   # One-time server provisioning
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production (with Caddy)
└── .github/workflows/deploy.yml # CI/CD pipeline
```
