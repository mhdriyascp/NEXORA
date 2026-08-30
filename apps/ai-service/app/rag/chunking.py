"""Text chunking for retrieval-augmented generation.

Splits documents into overlapping, word-bounded chunks so embeddings capture
coherent context while keeping each chunk within model limits. The overlap
preserves continuity across chunk boundaries.
"""

from __future__ import annotations

import re


def chunk_text(
    text: str,
    *,
    chunk_size: int = 200,
    overlap: int = 40,
) -> list[str]:
    """Split ``text`` into chunks of ~``chunk_size`` words with ``overlap``.

    Args:
        text: Raw document text.
        chunk_size: Target words per chunk (must be > 0).
        overlap: Words shared between consecutive chunks (0 <= overlap < size).

    Returns:
        Ordered, non-empty chunks. Empty/whitespace input yields ``[]``.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must satisfy 0 <= overlap < chunk_size")

    words = re.split(r"\s+", text.strip())
    words = [w for w in words if w]
    if not words:
        return []

    step = chunk_size - overlap
    chunks: list[str] = []
    for start in range(0, len(words), step):
        window = words[start : start + chunk_size]
        if window:
            chunks.append(" ".join(window))
        if start + chunk_size >= len(words):
            break
    return chunks
