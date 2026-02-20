import sqlite3
import os

DATA_DIR = os.environ.get("DATA_DIR", "/data")
MAIN_DB  = os.path.join(DATA_DIR, "main.db")

def get_main_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(MAIN_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_user_dir(user_id: int) -> str:
    path = os.path.join(DATA_DIR, "users", str(user_id))
    os.makedirs(path, exist_ok=True)
    return path

def get_user_pdfs_dir(user_id: int) -> str:
    path = os.path.join(get_user_dir(user_id), "pdfs")
    os.makedirs(path, exist_ok=True)
    return path

def get_user_db(user_id: int):
    db_path = os.path.join(get_user_dir(user_id), "data.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_main_db():
    conn = get_main_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            username         TEXT    UNIQUE NOT NULL,
            email            TEXT    UNIQUE NOT NULL,
            hashed_password  TEXT    NOT NULL,
            is_admin         INTEGER DEFAULT 0,
            created_at       TEXT    DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()

def init_user_db(user_id: int):
    conn = get_user_db(user_id)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pdfs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            filename    TEXT NOT NULL UNIQUE,
            size_bytes  INTEGER,
            uploaded_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            pdf_id         INTEGER NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
            pdf_name       TEXT    NOT NULL,
            total_answered INTEGER DEFAULT 0,
            total_correct  INTEGER DEFAULT 0,
            sessions       INTEGER DEFAULT 0,
            last_score     INTEGER,
            last_session   TEXT
        )
    """)
    conn.commit()
    conn.close()
