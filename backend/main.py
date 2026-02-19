from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os

from pdf_parser import extract_text_from_pdf
from quiz_generator import generate_quiz

app = FastAPI(title="PDF Quiz Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Docker / nginx
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload-and-generate")
async def upload_and_generate(
    file: UploadFile = File(...),
    num_questions: int = 5,
    difficulty: str = "medium",
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Save to a temp file so pdfplumber can open it
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        text = extract_text_from_pdf(tmp_path)
        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from this PDF.")

        quiz = generate_quiz(text, num_questions=num_questions, difficulty=difficulty)
        return {"status": "success", "quiz": quiz}
    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok"}
