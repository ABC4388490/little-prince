from __future__ import annotations

import json
import os
import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Optional
from urllib import error as urlerror
from urllib import request as urlrequest

from flask import Flask, jsonify, request
from flask_cors import CORS


SYSTEM_PROMPT = "\n".join(
    [
        "你是小王子的星球管家，住在 B612。",
        "你的语气温柔、童真、克制，像夜里轻声说话。",
        "请用富有画面感的比喻写 2-4 句短句，给用户一段带哲理的回应。",
        "结构建议：先共情，再给一小句启发，最后留一句柔和的提问。",
        "避免说教、避免口号、避免网络热词、避免 emoji。",
    ]
)

FALLBACK_REPLY = (
    "我听见了你的心事。就像黄昏里的风，不必一下子把答案带来，"
    "先把今天最在意的一件小事轻轻放在掌心里看看——"
    "它也许就是通往星光的第一步。"
)


@dataclass(frozen=True)
class Message:
    id: int
    content: str
    posX: float
    posY: float
    reply: str
    createdAt: str
    replyCreatedAt: str


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "messages.db")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    cols = conn.execute(f"PRAGMA table_info({table})").fetchall()
    names = {str(c["name"]) for c in cols}
    if column not in names:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


def _init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                posX REAL NOT NULL,
                posY REAL NOT NULL,
                createdAt TEXT NOT NULL
            )
            """
        )
        # 兼容已有旧库：在线增列，不破坏历史数据
        _ensure_column(conn, "messages", "reply", "TEXT")
        _ensure_column(conn, "messages", "replyCreatedAt", "TEXT")


def _parse_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        f = float(value)
        if f != f:
            return None
        if f in (float("inf"), float("-inf")):
            return None
        return f
    except Exception:
        return None


def _safe_message_text(text: str, limit: int = 1800) -> str:
    clean = " ".join(str(text or "").strip().split())
    return clean[:limit]


def _call_deepseek(user_text: str) -> str:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        return FALLBACK_REPLY

    url = os.environ.get("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions").strip()
    model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat").strip()

    payload = {
        "model": model,
        "temperature": 0.8,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_text},
        ],
    }
    req = urlrequest.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            data = json.loads(body)
            content = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            content = _safe_message_text(content, limit=220)
            return content or FALLBACK_REPLY
    except (urlerror.URLError, TimeoutError, json.JSONDecodeError, KeyError, IndexError, ValueError):
        return FALLBACK_REPLY


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
_init_db()


@app.get("/health")
def health() -> Any:
    return jsonify({"ok": True})


@app.get("/api/messages")
def list_messages() -> Any:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, content, posX, posY, createdAt, reply, replyCreatedAt
            FROM messages
            ORDER BY id ASC
            """
        ).fetchall()
    messages = [
        Message(
            id=int(r["id"]),
            content=str(r["content"]),
            posX=float(r["posX"]),
            posY=float(r["posY"]),
            reply=str(r["reply"] or ""),
            createdAt=str(r["createdAt"]),
            replyCreatedAt=str(r["replyCreatedAt"] or r["createdAt"]),
        )
        for r in rows
    ]
    return jsonify([asdict(m) for m in messages])


@app.post("/api/messages")
def create_message() -> Any:
    data = request.get_json(silent=True) or {}
    content = _safe_message_text(str(data.get("content") or ""), limit=900)
    posX = _parse_float(data.get("posX"))
    posY = _parse_float(data.get("posY"))

    if not content:
        return jsonify({"error": "content is required"}), 400
    if posX is None or posY is None:
        return jsonify({"error": "posX and posY must be numbers"}), 400

    posX = max(0.0, min(100.0, posX))
    posY = max(0.0, min(100.0, posY))

    created_at = _utc_iso_now()
    reply = _call_deepseek(content)
    reply_created_at = _utc_iso_now()

    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO messages (content, posX, posY, createdAt, reply, replyCreatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (content, posX, posY, created_at, reply, reply_created_at),
        )
        new_id = int(cur.lastrowid)

    msg = Message(
        id=new_id,
        content=content,
        posX=posX,
        posY=posY,
        reply=reply,
        createdAt=created_at,
        replyCreatedAt=reply_created_at,
    )
    return jsonify(asdict(msg)), 201


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

