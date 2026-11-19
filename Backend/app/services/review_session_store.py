import json
import logging
import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("app.services.review_session_store")

# Define persistent storage location under Backend/data/review_staging.db
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_DATA_DIR = _BACKEND_DIR / "data"
_DB_PATH = _DATA_DIR / "review_staging.db"


def _get_connection() -> sqlite3.Connection:
    """Returns a connection to the SQLite review staging database."""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_staging_db() -> None:
    """Initializes persistent tables for extraction jobs and review sessions."""
    with _get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS extraction_jobs (
                job_id TEXT PRIMARY KEY,
                document_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                total_windows INTEGER NOT NULL DEFAULT 0,
                processed_windows INTEGER NOT NULL DEFAULT 0,
                failed_windows TEXT DEFAULT '[]',
                items_count INTEGER NOT NULL DEFAULT 0,
                current_step TEXT DEFAULT '',
                extraction_data TEXT DEFAULT '[]',
                summary_data TEXT DEFAULT '{}',
                error TEXT,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_extraction_jobs_doc 
            ON extraction_jobs (document_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS review_sessions (
                session_id TEXT PRIMARY KEY,
                document_id INTEGER NOT NULL UNIQUE,
                job_id TEXT,
                admin_email TEXT,
                status TEXT NOT NULL DEFAULT 'in_review',
                session_data TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_review_sessions_doc 
            ON review_sessions (document_id);
            """
        )
    logger.info("Initialized persistent review staging store at %s", _DB_PATH)


# Initialize schema on module import
init_staging_db()


# -----------------------------------------------------------------------------
# Extraction Job Persistence
# -----------------------------------------------------------------------------

def save_extraction_job(
    job_id: str,
    document_id: int,
    status: str,
    total_windows: int = 0,
    processed_windows: int = 0,
    failed_windows: Optional[List[Dict[str, Any]]] = None,
    items_count: int = 0,
    current_step: str = "",
    extraction_data: Optional[List[Dict[str, Any]]] = None,
    summary_data: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> None:
    """Persists or updates an extraction job record."""
    now = time.time()
    failed_json = json.dumps(failed_windows or [])
    extraction_json = json.dumps(extraction_data or [])
    summary_json = json.dumps(summary_data or {})

    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO extraction_jobs (
                job_id, document_id, status, total_windows, processed_windows,
                failed_windows, items_count, current_step, extraction_data, summary_data,
                error, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(job_id) DO UPDATE SET
                status = excluded.status,
                total_windows = excluded.total_windows,
                processed_windows = excluded.processed_windows,
                failed_windows = excluded.failed_windows,
                items_count = excluded.items_count,
                current_step = excluded.current_step,
                extraction_data = excluded.extraction_data,
                summary_data = excluded.summary_data,
                error = excluded.error,
                updated_at = excluded.updated_at
            """,
            (
                job_id,
                document_id,
                status,
                total_windows,
                processed_windows,
                failed_json,
                items_count,
                current_step,
                extraction_json,
                summary_json,
                error,
                now,
                now,
            ),
        )


def update_job_progress(job_id: str, done: int, total: int, step: str) -> None:
    """Updates progress counters in the persistent database."""
    now = time.time()
    with _get_connection() as conn:
        conn.execute(
            """
            UPDATE extraction_jobs
            SET processed_windows = ?, total_windows = ?, current_step = ?, updated_at = ?
            WHERE job_id = ?
            """,
            (done, total, step, now, job_id),
        )


def get_extraction_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an extraction job by ID."""
    with _get_connection() as conn:
        row = conn.execute("SELECT * FROM extraction_jobs WHERE job_id = ?", (job_id,)).fetchone()
        if not row:
            return None
        return {
            "job_id": row["job_id"],
            "document_id": row["document_id"],
            "status": row["status"],
            "total_windows": row["total_windows"],
            "processed_windows": row["processed_windows"],
            "failed_windows": json.loads(row["failed_windows"] or "[]"),
            "items_count": row["items_count"],
            "current_step": row["current_step"],
            "extraction_data": json.loads(row["extraction_data"] or "[]"),
            "summary_data": json.loads(row["summary_data"] or "{}"),
            "error": row["error"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }


def get_latest_job_for_document(document_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves the most recent extraction job for a given document."""
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM extraction_jobs WHERE document_id = ? ORDER BY created_at DESC LIMIT 1",
            (document_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "job_id": row["job_id"],
            "document_id": row["document_id"],
            "status": row["status"],
            "total_windows": row["total_windows"],
            "processed_windows": row["processed_windows"],
            "failed_windows": json.loads(row["failed_windows"] or "[]"),
            "items_count": row["items_count"],
            "current_step": row["current_step"],
            "extraction_data": json.loads(row["extraction_data"] or "[]"),
            "summary_data": json.loads(row["summary_data"] or "{}"),
            "error": row["error"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }


# -----------------------------------------------------------------------------
# Review Session Persistence
# -----------------------------------------------------------------------------

def save_review_session(
    session_id: str,
    document_id: int,
    session_data: Dict[str, Any],
    admin_email: Optional[str] = None,
    job_id: Optional[str] = None,
    status: str = "in_review",
) -> None:
    """Inserts or updates a complete persistent review session."""
    now = time.time()
    session_json = json.dumps(session_data)

    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO review_sessions (
                session_id, document_id, job_id, admin_email, status, session_data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(document_id) DO UPDATE SET
                session_id = excluded.session_id,
                job_id = COALESCE(excluded.job_id, review_sessions.job_id),
                admin_email = COALESCE(excluded.admin_email, review_sessions.admin_email),
                status = excluded.status,
                session_data = excluded.session_data,
                updated_at = excluded.updated_at
            """,
            (session_id, document_id, job_id, admin_email, status, session_json, now, now),
        )


def get_review_session_by_document(document_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a review session by document ID."""
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM review_sessions WHERE document_id = ?",
            (document_id,),
        ).fetchone()
        if not row:
            return None
        data = json.loads(row["session_data"])
        data["session_id"] = row["session_id"]
        data["document_id"] = row["document_id"]
        data["status"] = row["status"]
        data["admin_email"] = row["admin_email"]
        data["created_at"] = row["created_at"]
        data["updated_at"] = row["updated_at"]
        return data


def get_review_session_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a review session by session UUID."""
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM review_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        if not row:
            return None
        data = json.loads(row["session_data"])
        data["session_id"] = row["session_id"]
        data["document_id"] = row["document_id"]
        data["status"] = row["status"]
        data["admin_email"] = row["admin_email"]
        data["created_at"] = row["created_at"]
        data["updated_at"] = row["updated_at"]
        return data


def update_review_session_data(
    session_id: str,
    session_data: Dict[str, Any],
    status: Optional[str] = None,
) -> None:
    """Updates the internal session data and optionally its status."""
    now = time.time()
    session_json = json.dumps(session_data)

    with _get_connection() as conn:
        if status:
            conn.execute(
                """
                UPDATE review_sessions
                SET session_data = ?, status = ?, updated_at = ?
                WHERE session_id = ?
                """,
                (session_json, status, now, session_id),
            )
        else:
            conn.execute(
                """
                UPDATE review_sessions
                SET session_data = ?, updated_at = ?
                WHERE session_id = ?
                """,
                (session_json, now, session_id),
            )
