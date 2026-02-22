import os
import json
from fastapi import APIRouter, HTTPException, Depends, Query
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
def generate(body: GenerateRequest, user=Depends(get_current_user), fresh: bool = Query(False)):
    user_id = user["id"]
    conn    = get_user_db(user_id)
    pdf_row = conn.execute("SELECT * FROM pdfs WHERE id=?", (body.pdf_id,)).fetchone()
    if not pdf_row:
        conn.close()
        raise HTTPException(404, "PDF not found")

    # ── Check quiz cache first (saves OpenAI API costs!) ──
    if not fresh:
        cached = conn.execute(
            "SELECT quiz_json FROM quiz_cache WHERE pdf_id=? AND num_questions=? AND difficulty=?",
            (body.pdf_id, body.num_questions, body.difficulty)
        ).fetchone()
        if cached:
            conn.close()
            return {"status": "success", "quiz": json.loads(cached["quiz_json"]),
                    "pdf_name": pdf_row["name"], "cached": True}

    pdf_path = os.path.join(get_user_pdfs_dir(user_id), pdf_row["filename"])
    if not os.path.exists(pdf_path):
        conn.close()
        raise HTTPException(404, "PDF file missing from disk")
    text = extract_text_from_pdf(pdf_path)
    if not text.strip():
        conn.close()
        raise HTTPException(422, "Could not extract text from this PDF")

    quiz = generate_quiz(text, num_questions=body.num_questions, difficulty=body.difficulty)

    # ── Cache the result ──
    try:
        conn.execute(
            "INSERT OR REPLACE INTO quiz_cache (pdf_id, num_questions, difficulty, quiz_json) VALUES (?,?,?,?)",
            (body.pdf_id, body.num_questions, body.difficulty, json.dumps(quiz))
        )
        conn.commit()
    except Exception:
        pass
    conn.close()

    return {"status": "success", "quiz": quiz, "pdf_name": pdf_row["name"], "cached": False}

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

@router.delete("/cache/{pdf_id}")
def clear_cache(pdf_id: int, user=Depends(get_current_user)):
    """Clear cached quizzes for a PDF so fresh ones are generated next time."""
    conn = get_user_db(user["id"])
    conn.execute("DELETE FROM quiz_cache WHERE pdf_id=?", (pdf_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
