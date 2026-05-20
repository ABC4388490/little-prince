"""
Grounding system text + structured citations from selected chunks.

Pure string I/O — no network, no FAISS.
"""

from __future__ import annotations

from typing import Any

from rag.chunk_meta import ensure_chunk_metadata, passage_body
from rag.prompts.text import safe_message_text


class RAGPromptBuilder:
    """Turn ranked chunk dicts into a grounding block and API citation list."""

    def __init__(self, *, rag_block_limit: int = 2600, citation_text_limit: int = 480) -> None:
        self.rag_block_limit = rag_block_limit
        self.citation_text_limit = citation_text_limit

    def build(self, selected: list[dict[str, Any]]) -> tuple[str, list[dict[str, Any]]]:
        if not selected:
            return "", []

        header_lines = [
            "【知识库摘录】每段含编号 [S1]、[S2]…，以及元数据 chunk_id 与 source_name（出处标签）。你是「仅依据摘录作答」模式，必须遵守：",
            "- 回答必须严格基于下列摘录中的内容；不得引入摘录未出现的书名细节、人物、情节、原话或常识补充（如同人设定）。",
            "- 若摘录不足以完整回答、或问题超出摘录范围：必须先在回复中明确写出「我不知道」或「当前摘录不足以回答这个问题」（二选一或等价清晰表述），简要说明缺什么；之后最多再给一两句不依赖虚构情节的温和陪伴，且不得假装摘录里有。",
            "- 引用规范（最终回复须同时满足）：(1) 凡引用摘录内容，须在对应句末或句中标出所用 chunk_id（示例：（依据 kb_002））；(2) 还须标明对应的 source_name 出处标签（示例：〔出处：little_prince_kb〕或与 chunk_id 成对写出）。",
            "- 结尾建议单独一行作引用汇总，格式示例：「引用：kb_001 (little_prince_kb)、kb_003 (little_prince_kb)」——涵盖本次用到的全部 chunk_id 与 source_name；若仅用一条，二者仍都要出现。",
            "- 可同时保留 [S1] 等与摘录编号对照；chunk_id 与 source_name 为强制引用信息，不可省略。",
            "",
        ]
        body_lines: list[str] = []
        citations: list[dict[str, Any]] = []
        for i, c in enumerate(selected, start=1):
            label = f"S{i}"
            meta = ensure_chunk_metadata(c)
            cid = meta["chunk_id"]
            src_name = meta["source_name"]
            body = passage_body(c)
            meta_bits: list[str] = []
            if c.get("chapter"):
                meta_bits.append(f"chapter={c.get('chapter')}")
            if c.get("topic"):
                topics = c.get("topic")
                if isinstance(topics, list):
                    meta_bits.append(f"topic={','.join(str(t) for t in topics)}")
                else:
                    meta_bits.append(f"topic={topics}")
            if c.get("role"):
                roles = c.get("role")
                if isinstance(roles, list):
                    meta_bits.append(f"role={','.join(str(r) for r in roles)}")
                else:
                    meta_bits.append(f"role={roles}")
            if c.get("chunk_type"):
                meta_bits.append(f"chunk_type={c.get('chunk_type')}")
            body_lines.append(f"[{label}] chunk_id={cid} source_name={src_name}")
            if meta_bits:
                body_lines.append(" ".join(meta_bits))
            body_lines.append(body)
            body_lines.append("")
            citations.append(
                {
                    "label": label,
                    "chunk_id": cid,
                    "source_name": src_name,
                    "text": safe_message_text(body, limit=self.citation_text_limit),
                }
            )

        rag_block = safe_message_text("\n".join(header_lines + body_lines), limit=self.rag_block_limit)
        return rag_block, citations
