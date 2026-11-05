"""File processing logic — the backend team's playground.

`process_text` receives one decoded file and returns the success part of a
FileResult (see contract/openapi.yaml). `app.py` adds `name` and `status`, so
as long as this returns `stats` and `preview`, the HTTP layer never changes.
"""

PREVIEW_CHARS = 200


def process_text(name: str, text: str) -> dict:
    # Placeholder: replace with the real processing.
    preview = text[:PREVIEW_CHARS]
    if len(text) > PREVIEW_CHARS:
        preview += "…"
    return {
        "stats": {
            "lines": len(text.splitlines()),
            "words": len(text.split()),
            "chars": len(text),
        },
        "preview": preview,
    }
