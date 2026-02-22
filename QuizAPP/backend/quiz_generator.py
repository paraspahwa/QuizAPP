import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv
from pdf_parser import chunk_text

load_dotenv()
client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

PROMPT_TEMPLATE = """You are an expert teacher and quiz designer.
From the study material below, generate {num_questions} multiple choice questions.

Requirements:
- 4 options per question
- Only 1 correct answer
- Difficulty level: {difficulty}
- For each option include is_correct (true/false) and explanation (why correct or why wrong)

Return ONLY valid JSON with no extra text, no markdown, no code fences:
{{
  "questions": [
    {{
      "question": "question text here",
      "concept_summary": "brief concept explanation here",
      "options": [
        {{"text": "option text", "is_correct": true,  "explanation": "why this is correct"}},
        {{"text": "option text", "is_correct": false, "explanation": "why this is wrong"}},
        {{"text": "option text", "is_correct": false, "explanation": "why this is wrong"}},
        {{"text": "option text", "is_correct": false, "explanation": "why this is wrong"}}
      ]
    }}
  ]
}}

Study Material:
{text}"""


def generate_quiz(text: str, num_questions: int = 5, difficulty: str = "medium") -> dict:
    chunks    = chunk_text(text, max_chars=6000)
    all_questions = []
    questions_per_chunk = max(1, num_questions // len(chunks))
    remaining = num_questions

    for i, chunk in enumerate(chunks):
        if remaining <= 0:
            break

        q_count = questions_per_chunk if i < len(chunks) - 1 else remaining
        q_count = min(q_count, remaining)

        prompt = PROMPT_TEMPLATE.format(
            num_questions=q_count,
            difficulty=difficulty,
            text=chunk
        )

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = response.content[0].text.strip()

        # Strip markdown code fences if Claude wraps in them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed    = json.loads(raw)
        questions = parsed.get("questions", [])
        all_questions.extend(questions)
        remaining -= len(questions)

    return {"questions": all_questions[:num_questions]}
