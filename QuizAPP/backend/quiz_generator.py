import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from pdf_parser import chunk_text

load_dotenv()
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# ── COST OPTIMIZATION ──────────────────────────────────────────
# Using gpt-4o-mini instead of gpt-4o
# gpt-4o-mini: ~$0.15 / 1M input tokens vs gpt-4o: ~$2.50 / 1M input tokens
# That's roughly 15-17x cheaper with nearly identical quiz quality
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

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
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content)
        questions = parsed.get("questions", [])
        all_questions.extend(questions)
        remaining -= len(questions)
    return {"questions": all_questions[:num_questions]}
