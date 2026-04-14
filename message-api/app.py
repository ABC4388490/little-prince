from __future__ import annotations

import os
import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Optional

from flask import Flask, jsonify, request
from flask_cors import CORS


@dataclass(frozen=True)
class Message:
    id: int
    content: str
    posX: float
    posY: float
    createdAt: str


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db_path() -> str:
    # 放在 message-api 目录下，便于同目录启动/查看
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "messages.db")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    return conn


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


def _parse_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        f = float(value)
        if f != f:  # NaN
            return None
        if f == float("inf") or f == float("-inf"):
            return None
        return f
    except Exception:
        return None


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
            "SELECT id, content, posX, posY, createdAt FROM messages ORDER BY id ASC"
        ).fetchall()
    messages = [
        Message(
            id=int(r["id"]),
            content=str(r["content"]),
            posX=float(r["posX"]),
            posY=float(r["posY"]),
            createdAt=str(r["createdAt"]),
        )
        for r in rows
    ]
    return jsonify([asdict(m) for m in messages])


@app.post("/api/messages")
def create_message() -> Any:
    data = request.get_json(silent=True) or {}
    content = str(data.get("content") or "").strip()
    posX = _parse_float(data.get("posX"))
    posY = _parse_float(data.get("posY"))

    if not content:
        return jsonify({"error": "content is required"}), 400
    if posX is None or posY is None:
        return jsonify({"error": "posX and posY must be numbers"}), 400

    # 前端用百分比定位，做个温和夹逼，避免异常值污染
    posX = max(0.0, min(100.0, posX))
    posY = max(0.0, min(100.0, posY))

    created_at = _utc_iso_now()
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO messages (content, posX, posY, createdAt) VALUES (?, ?, ?, ?)",
            (content, posX, posY, created_at),
        )
        new_id = int(cur.lastrowid)

    msg = Message(
        id=new_id, content=content, posX=posX, posY=posY, createdAt=created_at
    )
    return jsonify(asdict(msg)), 201


if __name__ == "__main__":
    # Render 等云平台会注入 PORT；本地默认 5000
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

