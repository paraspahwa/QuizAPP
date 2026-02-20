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
