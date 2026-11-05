"""Vercel entry point. All /api/* requests are rewritten here (see vercel.json).

Owned by the backend team. Keep it thin: the app lives in backend/app.py.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app import app  # noqa: E402,F401
