import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase_auth.errors import AuthApiError

from app.core.supabase import get_supabase_admin_client, get_supabase_client
from app.schemas.signup import SafeUser

logger = logging.getLogger("app.core.security")

# HTTP Bearer scheme for Swagger UI and header extraction (auto_error=False to customize error messages)
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> SafeUser:
    """
    FastAPI dependency for authenticating requests using a Supabase JWT.
    
    1. Extracts Bearer token from the HTTP Authorization header.
    2. Validates the signature and expiration against Supabase Auth.
    3. Retrieves user profile from the database (public.users).
    4. Raises 401 Unauthorized if token is missing, invalid, or expired.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()
    client = get_supabase_client()
    admin_client = get_supabase_admin_client()
    target_client = admin_client or client

    try:
        # Validate JWT signature and expiration with Supabase Auth
        user_response = client.auth.get_user(token)
        auth_user = getattr(user_response, "user", None) or user_response

        if not auth_user or not getattr(auth_user, "id", None):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = str(auth_user.id)
        email = str(getattr(auth_user, "email", "")).strip().lower()

        # Fetch profile from public.users
        profile = None
        try:
            res = target_client.table("users").select("*").eq("id", user_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                profile = res.data[0]
            elif email:
                res_email = target_client.table("users").select("*").ilike("email", email).limit(1).execute()
                if res_email.data and len(res_email.data) > 0:
                    profile = res_email.data[0]
        except Exception as e:
            logger.warning("Error fetching profile from public.users for %s: %s", user_id, str(e))

        if not profile:
            logger.warning("User %s (%s) has token but does not exist in public.users", user_id, email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account does not exist in SylloMetry database. Please sign up first.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_metadata = getattr(auth_user, "user_metadata", {}) or {}
        full_name = (
            (profile.get("full_name") if profile else None)
            or user_metadata.get("full_name")
            or user_metadata.get("name")
            or (email.split("@")[0].title() if email else "User")
        )

        registration_by = (
            (profile.get("registration_by") if profile else None)
            or ("Google" if getattr(auth_user, "app_metadata", {}).get("provider") == "google" else "Email")
        )

        created_at_val = getattr(auth_user, "created_at", None)
        created_at_str = (
            created_at_val.isoformat()
            if hasattr(created_at_val, "isoformat")
            else str(created_at_val) if created_at_val else None
        )

        return SafeUser(
            id=user_id,
            email=email,
            full_name=full_name,
            registration_by=registration_by,
            created_at=created_at_str,
            email_confirmed=bool(getattr(auth_user, "email_confirmed_at", True)),
        )

    except AuthApiError as e:
        logger.warning("JWT verification failed via Supabase: %s", getattr(e, "message", str(e)))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error validating JWT: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Please verify your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[SafeUser]:
    """
    FastAPI dependency that returns the authenticated SafeUser if a valid Bearer token
    is provided, or None if no token or an invalid token is provided.
    Useful for routes with public access but customized behavior for signed-in users.
    """
    if not credentials or not credentials.credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

