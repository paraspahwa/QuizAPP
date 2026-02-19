import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from auth import get_current_user
from database import get_user_db, get_user_pdfs_dir

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

ALLOWED_TYPE = "application/pdf"
MAX_SIZE_MB  = 200


@router.post("/upload")
async def upload_pdf(
    files: list[UploadFile] = File(...),
    user=Depends(get_current_user)
):
    user_id   = user["id"]
    pdfs_dir  = get_user_pdfs_dir(user_id)
    conn      = get_user_db(user_id)
    uploaded  = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue  # silently skip non-PDFs

        content = await file.read()
        size_mb = len(content) / (1024 * 1024)
        if size_mb > MAX_SIZE_MB:
            raise HTTPException(400, f"{file.filename} exceeds {MAX_SIZE_MB}MB limit")

        # Sanitise filename
        safe_name = os.path.basename(file.filename)
        dest_path = os.path.join(pdfs_dir, safe_name)

        with open(dest_path, "wb") as f:
            f.write(content)

        # Pretty display name (strip extension)
        display_name = os.path.splitext(safe_name)[0].replace("-", " ").replace("_", " ").title()

        try:
            conn.execute(
                "INSERT OR REPLACE INTO pdfs (name, filename, size_bytes) VALUES (?,?,?)",
                (display_name, safe_name, len(content))
            )
        except Exception:
            pass  # already exists

        uploaded.append({"name": display_name, "filename": safe_name, "size_bytes": len(content)})

    conn.commit()
    conn.close()
    return {"uploaded": uploaded, "count": len(uploaded)}


@router.get("/list")
def list_pdfs(user=Depends(get_current_user)):
    conn = get_user_db(user["id"])
    rows = conn.execute(
        "SELECT p.id, p.name, p.filename, p.size_bytes, p.uploaded_at, "
        "pr.total_answered, pr.total_correct, pr.sessions, pr.last_score, pr.last_session "
        "FROM pdfs p LEFT JOIN progress pr ON pr.pdf_id = p.id "
        "ORDER BY p.name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.delete("/{pdf_id}")
def delete_pdf(pdf_id: int, user=Depends(get_current_user)):
    user_id  = user["id"]
    conn     = get_user_db(user_id)
    row      = conn.execute("SELECT filename FROM pdfs WHERE id=?", (pdf_id,)).fetchone()
    if not row:
        raise HTTPException(404, "PDF not found")

    # Remove file from disk
    file_path = os.path.join(get_user_pdfs_dir(user_id), row["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)

    conn.execute("DELETE FROM pdfs WHERE id=?", (pdf_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
