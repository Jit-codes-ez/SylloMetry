import logging
from typing import Optional
from fastapi import HTTPException, status
from supabase import Client, create_client
from app.core.config import settings

logger = logging.getLogger("app.core.supabase")

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Returns a singleton instance of the standard Supabase client
    configured with the publishable/anon key.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not settings.is_supabase_configured:
        logger.warning(
            "Supabase is not fully configured. Using fallback configuration. "
            "Please configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your .env file."
        )

    try:
        _supabase_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.publishable_key,
        )
        if hasattr(_supabase_client, "auth"):
            _supabase_client.auth._flow_type = "implicit"
        return _supabase_client
    except Exception as e:
        logger.error("Failed to initialize Supabase client: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client initialization failed. Please check backend configuration.",
        )


def get_supabase_admin_client() -> Optional[Client]:
    """
    Returns an admin Supabase client using the backend-only SUPABASE_SERVICE_ROLE_KEY.
    Used strictly for privileged backend tasks (e.g., checking if email is already
    registered prior to OTP or updating user status when RLS restricts anon queries).
    NEVER exposed to frontend clients.
    """
    global _supabase_admin_client
    if _supabase_admin_client is not None:
        return _supabase_admin_client

    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.debug("SUPABASE_SERVICE_ROLE_KEY not configured. Admin client unavailable.")
        return None

    try:
        _supabase_admin_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
        )
        return _supabase_admin_client
    except Exception as e:
        logger.error("Failed to initialize Supabase admin client: %s", str(e))
        return None


def reset_supabase_clients_for_testing(
    mock_client: Optional[Client] = None,
    mock_admin_client: Optional[Client] = None,
) -> None:
    """Helper used during unit tests to inject mock Supabase clients."""
    global _supabase_client, _supabase_admin_client
    _supabase_client = mock_client
    _supabase_admin_client = mock_admin_client

