from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from database import get_main_db, init_user_db
from auth import hash_password, verify_password, create_token, get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    username: str
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    created_at: str


# ── Signup ───────────────────────────────────────────────────────

@router.post("/signup")
def signup(body: SignupRequest):
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    conn = get_main_db()
    # First user ever → auto admin
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    is_admin = 1 if count == 0 else 0

    try:
        cur = conn.execute(
            "INSERT INTO users (username, email, hashed_password, is_admin) VALUES (?,?,?,?)",
            (body.username.strip(), body.email.strip().lower(),
             hash_password(body.password), is_admin)
        )
        user_id = cur.lastrowid
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(400, "Username or email already exists")

    conn.close()
    init_user_db(user_id)
    token = create_token(user_id)
    return {"access_token": token, "token_type": "bearer", "is_admin": bool(is_admin)}


# ── Login ────────────────────────────────────────────────────────

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    conn = get_main_db()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        (form.username, form.username)
    ).fetchone()
    conn.close()

    if not user or not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid username or password")

    return {
        "access_token": create_token(user["id"]),
        "token_type": "bearer",
        "is_admin": bool(user["is_admin"]),
    }


# ── Me ───────────────────────────────────────────────────────────

@router.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "id":         user["id"],
        "username":   user["username"],
        "email":      user["email"],
        "is_admin":   bool(user["is_admin"]),
        "created_at": user["created_at"],
    }


# ── Admin: list all users ────────────────────────────────────────

@router.get("/users")
def list_users(admin=Depends(require_admin)):
    conn = get_main_db()
    users = conn.execute(
        "SELECT id, username, email, is_admin, created_at FROM users ORDER BY id"
    ).fetchall()
    conn.close()
    return [dict(u) for u in users]


# ── Admin: toggle admin ──────────────────────────────────────────

@router.post("/users/{user_id}/toggle-admin")
def toggle_admin(user_id: int, admin=Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Cannot change your own admin status")
    conn = get_main_db()
    conn.execute(
        "UPDATE users SET is_admin = CASE WHEN is_admin=1 THEN 0 ELSE 1 END WHERE id=?",
        (user_id,)
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Admin: delete user ───────────────────────────────────────────

@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin=Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    conn = get_main_db()
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
