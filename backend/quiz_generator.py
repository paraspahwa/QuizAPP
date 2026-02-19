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
- 4 options per question (A, B, C, D)
- Only 1 correct answer per question
- Difficulty level: {difficulty}
- Focus on key concepts, definitions, and cause-effect relationships

For EACH option you must provide:
- Whether it is correct (true or false)
- A clear explanation:
    - If CORRECT: explain WHY it is correct, referencing the concept
    - If INCORRECT: explain the misconception and reference the correct concept

Return ONLY valid JSON with no extra text, in this exact format:

{{
  "questions": [
    {{
      "question": "Question text here?",
      "concept_summary": "One-sentence summary of the core concept being tested.",
      "options": [
        {{
          "text": "Option text",
          "is_correct": true,
          "explanation": "This is correct because..."
        }},
        {{
          "text": "Option text",
          "is_correct": false,
          "explanation": "This is incorrect because..."
        }},
        {{
          "text": "Option text",
          "is_correct": false,
          "explanation": "This is incorrect because..."
        }},
        {{
          "text": "Option text",
          "is_correct": false,
          "explanation": "This is incorrect because..."
        }}
      ]
    }}
  ]
}}

Study Material:
{text}
"""


def generate_quiz(text: str, num_questions: int = 5, difficulty: str = "medium") -> dict:
    """
    Generate a quiz from extracted PDF text.
    Handles large PDFs by chunking and merging results.
    """
    chunks = chunk_text(text, max_chars=6000)
    all_questions = []

    questions_per_chunk = max(1, num_questions // len(chunks))
    remaining = num_questions

    for i, chunk in enumerate(chunks):
        if remaining <= 0:
            break

        # Give all remaining questions to the last chunk
        q_count = questions_per_chunk if i < len(chunks) - 1 else remaining
        q_count = min(q_count, remaining)

        prompt = PROMPT_TEMPLATE.format(
            num_questions=q_count,
            difficulty=difficulty,
            text=chunk,
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        parsed = json.loads(raw)
        questions = parsed.get("questions", [])
        all_questions.extend(questions)
        remaining -= len(questions)

    return {"questions": all_questions[:num_questions]}
