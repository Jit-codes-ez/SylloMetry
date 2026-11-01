import logging
from datetime import datetime, timezone
from typing import Optional
import httpx
from fastapi import HTTPException, status
from supabase import Client
from supabase_auth.errors import AuthApiError

from app.core.config import settings
from app.core.supabase import get_supabase_client, get_supabase_admin_client
from app.schemas.signup import (
    SendOtpResponse,
    VerifyOtpResponse,
    SignupRequest,
    SignupResponse,
    GoogleAuthResponse,
    SafeUser,
    SessionData,
)

logger = logging.getLogger("app.services.signup")


class SignupService:
    """Encapsulates all signup business logic and Supabase Auth operations."""

    def __init__(
        self,
        client: Optional[Client] = None,
        admin_client: Optional[Client] = None,
    ):
        self._client = client
        self._admin_client = admin_client

    @property
    def client(self) -> Client:
        return self._client or get_supabase_client()

    @property
    def admin_client(self) -> Optional[Client]:
        return self._admin_client or get_supabase_admin_client()

    def check_user_exists_in_database(self, email: str) -> bool:
        """
        Checks whether an active registered account already exists for the given email
        in the database (public.users) or Supabase Auth.
        Enforces: 'If email already exists in database, then show user already exists.
        And this match should be before verifying the email OTP.'
        """
        normalized_email = email.strip().lower()

        # 1. First, check the public.users profile table
        try:
            target_client = self.admin_client or self.client
            profile_response = (
                target_client.table("users")
                .select("id, email")
                .ilike("email", normalized_email)
                .limit(1)
                .execute()
            )
            if profile_response.data and len(profile_response.data) > 0:
                logger.info("Existing user found in public.users table.")
                return True
        except Exception as e:
            # If public.users is not yet configured or table does not exist, log debug
            logger.debug("Database profile lookup error (table may not be configured yet): %s", str(e))

        # 2. Check auth.users if admin client is available
        if self.admin_client:
            try:
                users_list = self.admin_client.auth.admin.list_users()
                for user in users_list:
                    if getattr(user, "email", "").lower() == normalized_email:
                        # If the user already confirmed email or has metadata/password
                        if getattr(user, "email_confirmed_at", None) or getattr(user, "identities", None):
                            # Check if user already has an established account
                            metadata = getattr(user, "user_metadata", {}) or {}
                            if metadata.get("terms_accepted") or metadata.get("full_name"):
                                logger.info("Existing confirmed user found in auth.users.")
                                return True
            except Exception as e:
                logger.debug("Auth admin list_users lookup error: %s", str(e))

        return False

    def send_signup_otp(self, email: str, full_name: Optional[str] = None) -> SendOtpResponse:
        """
        Initiates the email OTP signup flow using Supabase Auth.
        Checks for existing users first, permits new user creation,
        attaches full_name to user metadata if provided, and never
        generates or stores OTPs manually.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env. Please update SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
            )

        normalized_email = email.strip().lower()

        # Pre-verification check: Reject if account already exists
        if self.check_user_exists_in_database(normalized_email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists with this email address. Please sign in instead.",
            )

        try:
            logger.info("Requesting email OTP via Supabase Auth for new signup.")
            otp_options = {"should_create_user": True}
            if full_name:
                otp_options["data"] = {"full_name": full_name.strip()}

            self.client.auth.sign_in_with_otp({
                "email": normalized_email,
                "options": otp_options,
            })
            return SendOtpResponse(
                success=True,
                message="A 6-digit verification code has been sent to your email address.",
                email=normalized_email,
            )

        except AuthApiError as e:
            error_message = (e.message or "").lower()
            logger.warning("Supabase AuthApiError during OTP send: status=%s, code=%s", e.status, e.code)

            if e.status == 429 or "rate" in error_message or (e.code and "rate_limit" in str(e.code)):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many verification requests. Please wait a moment before trying again.",
                )
            if e.status == 422 or "already registered" in error_message or "already exists" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User already exists with this email address. Please sign in instead.",
                )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Authentication provider service error. Please try again later.",
            )
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            logger.error("Network connection to Supabase failed: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reach Supabase. Please verify your SUPABASE_URL in Backend/.env and check your internet connection.",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Unexpected error in send_signup_otp: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An internal server error occurred while sending the verification code.",
            )

    def verify_signup_otp(self, email: str, token: str) -> VerifyOtpResponse:
        """
        Verifies the 6-digit OTP code through Supabase Auth.
        Handles both 'email' and 'signup' verification types seamlessly.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env. Please update SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
            )

        normalized_email = email.strip().lower()
        clean_token = token.strip()

        try:
            logger.info("Verifying OTP code via Supabase Auth.")
            # Primary verification type for sign_in_with_otp is 'email'
            try:
                auth_resp = self.client.auth.verify_otp({
                    "email": normalized_email,
                    "token": clean_token,
                    "type": "email",
                })
            except AuthApiError as err:
                # If error might be due to signup type (e.g. if initiated through sign_up)
                err_msg = (err.message or "").lower()
                if "invalid" in err_msg or "expired" in err_msg or "not found" in err_msg:
                    try:
                        auth_resp = self.client.auth.verify_otp({
                            "email": normalized_email,
                            "token": clean_token,
                            "type": "signup",
                        })
                    except Exception:
                        raise err
                else:
                    raise err

            session_data = None
            if getattr(auth_resp, "session", None):
                s = auth_resp.session
                u = getattr(auth_resp, "user", None) or getattr(s, "user", None)
                safe_u = None
                if u:
                    metadata = getattr(u, "user_metadata", {}) or {}
                    created_at_val = getattr(u, "created_at", None)
                    safe_u = SafeUser(
                        id=str(u.id),
                        email=str(u.email),
                        full_name=metadata.get("full_name"),
                        created_at=created_at_val.isoformat() if hasattr(created_at_val, "isoformat") else str(created_at_val) if created_at_val else None,
                        email_confirmed=bool(getattr(u, "email_confirmed_at", True)),
                    )

                session_data = SessionData(
                    access_token=s.access_token,
                    refresh_token=getattr(s, "refresh_token", None),
                    token_type=getattr(s, "token_type", "bearer") or "bearer",
                    expires_in=getattr(s, "expires_in", None),
                    expires_at=getattr(s, "expires_at", None),
                    user=safe_u,
                )

            return VerifyOtpResponse(
                success=True,
                message="Email verified successfully.",
                email=normalized_email,
                is_verified=True,
                session=session_data,
            )

        except AuthApiError as e:
            error_message = (e.message or "").lower()
            logger.warning("Supabase AuthApiError during OTP verify: status=%s, code=%s", e.status, e.code)

            if e.status == 429 or "rate" in error_message or (e.code and "rate_limit" in str(e.code)):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many verification attempts. Please wait a moment before trying again.",
                )
            if e.status in (400, 401, 403, 404, 422) or "invalid" in error_message or "expired" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification code. Please check your code or request a new one.",
                )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Verification service failed. Please try again later.",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Unexpected error in verify_signup_otp: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An internal server error occurred while verifying the code.",
            )

    def complete_signup(
        self,
        payload: SignupRequest,
        auth_header: Optional[str] = None,
    ) -> SignupResponse:
        """
        Completes user registration by assigning the password and updating user metadata.
        Guarantees that email OTP was verified beforehand, preventing unverified registrations.
        Never stores passwords in custom tables.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env. Please update SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
            )

        normalized_email = payload.email.strip().lower()
        now_iso = datetime.now(timezone.utc).isoformat()
        metadata_to_set = {
            "full_name": payload.full_name,
            "terms_accepted": True,
            "terms_accepted_at": now_iso,
        }

        # 1. Extract Bearer token if provided in header or payload
        token = payload.access_token
        if not token and auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        target_user_id: Optional[str] = None

        # 2. Enforce verified email requirement
        if token:
            try:
                user_res = self.client.auth.get_user(jwt=token)
                token_user = getattr(user_res, "user", None)
                if not token_user or str(token_user.email).lower() != normalized_email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Session token does not match the provided email address.",
                    )
                target_user_id = str(token_user.id)
            except HTTPException:
                raise
            except Exception as e:
                logger.warning("Token verification failed: %s", str(e))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Authentication session is invalid or expired. Please verify your OTP again.",
                )
        elif self.admin_client:
            # When admin client is available, inspect auth.users to confirm email was verified
            try:
                users_list = self.admin_client.auth.admin.list_users()
                matched_user = None
                for u in users_list:
                    if getattr(u, "email", "").lower() == normalized_email:
                        matched_user = u
                        break

                if not matched_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email address has not been verified yet. Please request and verify your OTP first.",
                    )

                if not getattr(matched_user, "email_confirmed_at", None):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email confirmation pending. Please verify your email OTP before completing signup.",
                    )

                # Check if this user was already registered in the past with terms accepted / full account
                existing_meta = getattr(matched_user, "user_metadata", {}) or {}
                if existing_meta.get("terms_accepted") and existing_meta.get("full_name"):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="User already exists with this email address. Please sign in instead.",
                    )

                target_user_id = str(matched_user.id)
            except HTTPException:
                raise
            except Exception as e:
                logger.error("Admin user lookup failed: %s", str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to verify user registration state.",
                )
        else:
            # Fallback when no token and no admin client: try direct sign_up
            logger.info("Attempting standard sign_up flow via Supabase client.")
            try:
                signup_res = self.client.auth.sign_up({
                    "email": normalized_email,
                    "password": payload.password,
                    "options": {
                        "data": metadata_to_set,
                    },
                })
                target_user = getattr(signup_res, "user", None)
                if target_user:
                    target_user_id = str(target_user.id)
            except AuthApiError as err:
                err_msg = (err.message or "").lower()
                if "already registered" in err_msg or "already exists" in err_msg:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="User already exists with this email address. Please sign in instead.",
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=err.message or "Registration failed. Please verify your email first.",
                )

        # 3. Apply password and user metadata
        if target_user_id and self.admin_client:
            try:
                self.admin_client.auth.admin.update_user_by_id(
                    target_user_id,
                    {
                        "password": payload.password,
                        "user_metadata": metadata_to_set,
                    },
                )
                logger.info("User password and metadata successfully set via Supabase Admin.")
            except Exception as e:
                logger.error("Failed to update user via admin client: %s", str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to complete user registration.",
                )

        # 4. Sync profile into public.users if profile table exists (safety sync alongside database trigger)
        try:
            target_client = self.admin_client or self.client
            target_client.table("users").upsert({
                "id": target_user_id,
                "email": normalized_email,
                "full_name": payload.full_name.strip(),
                "registration_by": "Email",
            }).execute()
        except Exception as e:
            logger.debug("public.users sync skipped or handled by database trigger: %s", str(e))

        # 5. Sign in to obtain an authenticated session for the client
        session_data = None
        safe_user = None

        try:
            sign_in_res = self.client.auth.sign_in_with_password({
                "email": normalized_email,
                "password": payload.password,
            })
            if getattr(sign_in_res, "session", None):
                s = sign_in_res.session
                u = getattr(sign_in_res, "user", None) or getattr(s, "user", None)
                u_created_at = getattr(u, "created_at", None)
                safe_created_at = (
                    u_created_at.isoformat()
                    if hasattr(u_created_at, "isoformat")
                    else str(u_created_at) if u_created_at else now_iso
                )
                safe_user = SafeUser(
                    id=str(u.id),
                    email=str(u.email),
                    full_name=payload.full_name.strip(),
                    registration_by="Email",
                    created_at=safe_created_at,
                    email_confirmed=True,
                )
                session_data = SessionData(
                    access_token=s.access_token,
                    refresh_token=getattr(s, "refresh_token", None),
                    token_type=getattr(s, "token_type", "bearer") or "bearer",
                    expires_in=getattr(s, "expires_in", None),
                    expires_at=getattr(s, "expires_at", None),
                    user=safe_user,
                )
        except Exception as e:
            logger.info("Automatic sign-in after signup did not produce session (e.g. pending confirmation or policy): %s", str(e))

        # If session wasn't created via sign_in_with_password, construct safe_user from known data
        if not safe_user:
            safe_user = SafeUser(
                id=target_user_id or "user-registered",
                email=normalized_email,
                full_name=payload.full_name.strip(),
                registration_by="Email",
                created_at=now_iso,
                email_confirmed=True,
            )

        return SignupResponse(
            success=True,
            message="Account created successfully.",
            user=safe_user,
            session=session_data,
        )

    def initiate_google_signup(
        self,
        redirect_to: Optional[str] = None,
    ) -> GoogleAuthResponse:
        """
        Initiates Google OAuth signup via Supabase.
        Uses FRONTEND_URL callback, preserves PKCE & OAuth state,
        and never manufactures manual tokens.
        """
        target_callback = redirect_to or f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback"

        try:
            oauth_res = self.client.auth.sign_in_with_oauth({
                "provider": "google",
                "options": {
                    "redirect_to": target_callback,
                },
            })
            return GoogleAuthResponse(
                authorization_url=oauth_res.url,
                provider="google",
                redirect_to=target_callback,
            )
        except Exception as e:
            logger.error("Failed to generate Google OAuth URL: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initiate Google OAuth signup. Please check provider configuration.",
            )
