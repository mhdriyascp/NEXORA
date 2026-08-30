"""Deterministic mock embedding provider.

Produces stable, unit-normalised vectors from a hash of the input so semantic
search wiring can be tested offline without a model. Identical inputs always
yield identical vectors; different inputs yield different ones.
"""

from __future__ import annotations

import hashlib
import math

from .base import EmbeddingProvider


class MockEmbeddingProvider(EmbeddingProvider):
    name = "mock"

    def __init__(self, dimensions: int = 1536) -> None:
        self.dimensions = dimensions

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]

    def _embed_one(self, text: str) -> list[float]:
        # Expand a digest into `dimensions` floats, then L2-normalise.
        raw: list[float] = []
        counter = 0
        while len(raw) < self.dimensions:
            digest = hashlib.sha256(f"{counter}:{text}".encode()).digest()
            for byte in digest:
                raw.append((byte / 255.0) * 2.0 - 1.0)
                if len(raw) >= self.dimensions:
                    break
            counter += 1
        norm = math.sqrt(sum(value * value for value in raw)) or 1.0
        return [value / norm for value in raw]
