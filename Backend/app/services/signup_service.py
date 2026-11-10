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
    OAuthSyncResponse,
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
        strictly in the database (public.users / public.user).
        Does NOT check auth.users.
        """
        normalized_email = email.strip().lower()
        target_client = self.admin_client or self.client

        try:
            profile_response = (
                target_client.table("users")
                .select("id, email")
                .ilike("email", normalized_email)
                .limit(1)
                .execute()
            )
            if profile_response.data and len(profile_response.data) > 0:
                logger.info("Existing registered user found in public.users table for email: %s", normalized_email)
                return True
        except Exception as e:
            logger.error("Database lookup error in public.users: %s", str(e))
            # Fallback attempt in case table is named 'user'
            try:
                fallback_res = (
                    target_client.table("user")
                    .select("id, email")
                    .ilike("email", normalized_email)
                    .limit(1)
                    .execute()
                )
                if fallback_res.data and len(fallback_res.data) > 0:
                    logger.info("Existing registered user found in public.user table for email: %s", normalized_email)
                    return True
            except Exception:
                pass

        return False

    def get_user_profile_by_email(self, email: str) -> Optional[dict]:
        """
        Retrieves user record from public.users / public.user by email.
        """
        normalized_email = email.strip().lower()
        target_client = self.admin_client or self.client

        try:
            profile_response = (
                target_client.table("users")
                .select("*")
                .ilike("email", normalized_email)
                .limit(1)
                .execute()
            )
            if profile_response.data and len(profile_response.data) > 0:
                return profile_response.data[0]
        except Exception as e:
            logger.error("Database lookup error in public.users: %s", str(e))
            try:
                fallback_res = (
                    target_client.table("user")
                    .select("*")
                    .ilike("email", normalized_email)
                    .limit(1)
                    .execute()
                )
                if fallback_res.data and len(fallback_res.data) > 0:
                    return fallback_res.data[0]
            except Exception:
                pass

        return None

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

        # Pre-verification check: Reject if account already exists with registered_by specific message
        profile = self.get_user_profile_by_email(normalized_email)
        if profile:
            registration_by = (profile.get("registration_by") or "").strip().lower()
            if registration_by == "email":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This account was registered using Email. Please use 'Sign in' to continue.",
                )
            elif registration_by == "google":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This account was registered using Google. Please use 'Sign in with Google' to continue.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This account is already registered. Please sign in to continue.",
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

            # CRITICAL: Prevent premature upload into public.users before authentication!
            # When sign_in_with_otp is called, if Supabase has a database trigger on auth.users
            # that inserted a row into public.users, clean it up immediately.
            # User data must ONLY go into public.users after OTP verification AND clicking Sign Up!
            if self.admin_client:
                try:
                    self.admin_client.table("users").delete().ilike("email", normalized_email).execute()
                    logger.info("Ensured public.users has no record while verification email is sent: %s", normalized_email)
                except Exception as e:
                    logger.debug("Cleanup error: %s", str(e))

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

            # Ensure public.users has NO record after OTP verification.
            # If a database trigger on auth.users (like on_auth_user_updated) prematurely
            # inserted a row, clean it up immediately.
            # Data must ONLY be inserted into public.users when the user submits the form!
            if self.admin_client:
                try:
                    self.admin_client.table("users").delete().ilike("email", normalized_email).execute()
                    logger.info("Ensured public.users has no record after OTP verification: %s", normalized_email)
                except Exception as e:
                    logger.debug("Cleanup error in verify_signup_otp: %s", str(e))

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

        # Reject if user is already registered in public.users
        if self.check_user_exists_in_database(normalized_email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists with this email address. Please sign in instead.",
            )

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

        # 4. Insert user data into public.users now that the user has verified OTP and submitted the sign up form
        try:
            target_client = self.admin_client or self.client
            target_client.table("users").upsert({
                "id": target_user_id,
                "email": normalized_email,
                "full_name": payload.full_name.strip(),
                "password": payload.password,
                "registration_by": "Email",
            }).execute()
            logger.info("User successfully uploaded to public.users on sign up completion: %s", normalized_email)
        except Exception as e:
            logger.error("Failed to insert into public.users in complete_signup: %s", str(e))

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

    def sync_oauth_user(self, access_token: str, mode: str = "signup") -> OAuthSyncResponse:
        """
        Synchronizes an authenticated Google OAuth user to public.users.
        Accurately handles Supabase database triggers on auth.users:
        - When a brand new user authenticates via Google, Supabase Auth creates the auth user
          and its trigger auto-inserts a preliminary row into public.users with registration_by='Email'.
        - For 'signup':
          - If the user was already registered previously (account created > 5 minutes ago,
            or registration_by is already 'Google', or provider is 'email'), we reject with 409.
          - If the user is a fresh signup from this current Google OAuth session, we update
            public.users setting registration_by='Google' and full_name, and return success.
        - For 'signin':
          - If no user exists or if it's an unconfirmed/new user attempting signin without having
            signed up, we handle accordingly.
        """
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        try:
            user_response = self.client.auth.get_user(access_token)
            user = getattr(user_response, "user", None) or user_response
            if not user or not getattr(user, "email", None):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired OAuth access token.",
                )

            email = str(user.email).strip().lower()
            target_user_id = str(user.id)

            # Determine age of this Supabase auth user
            created_at_val = getattr(user, "created_at", None)
            created_at_dt = None
            if created_at_val:
                if isinstance(created_at_val, str):
                    try:
                        created_at_dt = datetime.fromisoformat(created_at_val.replace("Z", "+00:00"))
                    except Exception:
                        pass
                elif isinstance(created_at_val, datetime):
                    created_at_dt = created_at_val if created_at_val.tzinfo else created_at_val.replace(tzinfo=timezone.utc)

            # A user is fresh in auth.users if created within the last 5 minutes (300 seconds)
            is_fresh_auth_user = False
            if created_at_dt:
                age_seconds = (now - created_at_dt).total_seconds()
                if 0 <= age_seconds <= 300:
                    is_fresh_auth_user = True

            app_meta = getattr(user, "app_metadata", {}) or {}
            provider = app_meta.get("provider")
            providers = app_meta.get("providers", [])

            target_client = self.admin_client or self.client

            # Fetch existing row(s) from public.users for this email
            db_records = []
            try:
                res = (
                    target_client.table("users")
                    .select("*")
                    .ilike("email", email)
                    .execute()
                )
                db_records = res.data or []
            except Exception as e:
                logger.warning("Error fetching from public.users: %s", str(e))

            user_row = db_records[0] if db_records else None

            # Determine whether this is a pre-existing SylloMetry account or a brand new Google signup:
            # 1. If no row in public.users: it's a new signup.
            # 2. If a row exists in public.users:
            #    Is it the row that the Supabase trigger just auto-inserted for this new Google user?
            #    - The row's id matches target_user_id
            #    - The auth user is fresh (created within 300s)
            #    - The row's registration_by is NOT yet finalized to "Google"
            #    - Provider was google (not a legacy email provider account)
            # Check if this row in public.users was auto-inserted by the Supabase trigger
            # during this current Google OAuth signup flow:
            is_trigger_created_fresh_row = False
            if user_row and is_fresh_auth_user:
                if str(user_row.get("id")) == target_user_id:
                    is_trigger_created_fresh_row = True

            # If user already existed prior to this session:
            user_already_existed = bool(user_row and not is_trigger_created_fresh_row)

            if mode == "signup":
                if user_already_existed:
                    logger.info("OAuth signup rejected: user already exists for %s", email)
                    # If this OAuth attempt created a separate new auth user, clean it up
                    if self.admin_client and str(user_row.get("id")) != target_user_id:
                        try:
                            self.admin_client.auth.admin.delete_user(target_user_id)
                        except Exception as del_err:
                            logger.warning("Error deleting duplicate auth user %s: %s", target_user_id, str(del_err))
                    reg_by = ((user_row.get("registration_by") if user_row else None) or "").strip().lower()
                    if reg_by == "email":
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="This account was registered using Email. Please use 'Sign in' to continue.",
                        )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="This account was registered using Google. Please use 'Sign in with Google' to continue.",
                        )

            if mode == "signin":
                if not user_row or is_trigger_created_fresh_row:
                    logger.info("OAuth signin rejected: no pre-existing user found for %s", email)
                    # Complete cleanup: purge any stray row in public.users and purge from auth.users
                    if self.admin_client:
                        try:
                            self.admin_client.table("users").delete().eq("id", target_user_id).execute()
                        except Exception:
                            pass
                        try:
                            self.admin_client.table("users").delete().ilike("email", email).execute()
                        except Exception:
                            pass
                        try:
                            self.admin_client.auth.admin.delete_user(target_user_id)
                            logger.info("Purged uninvited auth user %s (%s) from auth.users", target_user_id, email)
                        except Exception as del_err:
                            logger.warning("Error purging user from auth.users: %s", str(del_err))
                    else:
                        try:
                            target_client.table("users").delete().eq("id", target_user_id).execute()
                        except Exception:
                            pass

                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No SylloMetry account found with this email address. Please sign up first.",
                    )

            # Retrieve Google profile full name
            user_meta = getattr(user, "user_metadata", {}) or {}
            full_name = (
                user_meta.get("full_name")
                or user_meta.get("name")
                or (user_row.get("full_name") if user_row and user_row.get("full_name") else None)
                or email.split("@")[0].title()
            )

            # Preserve existing registration mode if present, else default to 'Google'
            final_registration_by = (
                (user_row.get("registration_by") if user_row else None)
                or "Google"
            )

            # Persist finalized profile to public.users
            target_client.table("users").upsert({
                "id": target_user_id,
                "email": email,
                "full_name": full_name,
                "registration_by": final_registration_by,
            }).execute()

            logger.info("Google OAuth user synchronized successfully with registration_by='%s': %s", final_registration_by, email)

            safe_user = SafeUser(
                id=target_user_id,
                email=email,
                full_name=full_name,
                registration_by=final_registration_by,
                created_at=now_iso,
                email_confirmed=True,
            )
            return OAuthSyncResponse(success=True, user=safe_user)

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to synchronize OAuth user: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to synchronize OAuth account: {str(e)}",
            )

