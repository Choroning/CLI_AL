"""Supabase client wrapper for backend (server-side, secret key).

The backend uses the secret key (formerly service_role), which bypasses RLS.
Frontend uses the publishable key (formerly anon), with RLS-defined policies —
never share the secret key with the FE.
"""

from __future__ import annotations

import logging

from supabase import Client, create_client

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase() -> Client | None:
    """Return cached Supabase client, or None if not configured.

    Returning None instead of raising lets endpoints degrade gracefully when
    SUPABASE_URL / SUPABASE_SECRET_KEY are absent (e.g. local-only dev).
    """
    global _client
    if _client is not None:
        return _client
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_secret_key:
        logger.warning("Supabase not configured — history persistence disabled.")
        return None
    _client = create_client(settings.supabase_url, settings.supabase_secret_key)
    return _client
