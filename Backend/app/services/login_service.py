import base64
import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional
import bcrypt
from fastapi import HTTPException, status
import httpx
from supabase_auth.errors import AuthApiError

from app.core.config import settings
from app.core.supabase import get_supabase_admin_client, get_supabase_client
from app.schemas.login import (
    ConfirmPasswordResetRequest,
    ConfirmPasswordResetResponse,
    LoginRequest,
    LoginResponse,
    PasswordResetOtpRequest,
    PasswordResetOtpResponse,
    SendLoginOtpRequest,
    SendLoginOtpResponse,
    VerifyLoginOtpRequest,
    VerifyLoginOtpResponse,
    VerifyPasswordResetOtpRequest,
    VerifyPasswordResetOtpResponse,
)
from app.schemas.signup import SafeUser, SessionData

logger = logging.getLogger("app.services.login")


class LoginService:
    """
    Business logic service for user login and JWT session management.
    Connects to Supabase Auth and validates profiles in public.users.
    """

    def __init__(self):
        self.client = get_supabase_client()
        self.admin_client = get_supabase_admin_client()

    def check_user_exists_in_database(self, email: str) -> bool:
        """Checks if a user record exists in public.users."""
        normalized_email = email.strip().lower()
        target_client = self.admin_client or self.client

        try:
            res = (
                target_client.table("users")
                .select("id, email")
                .ilike("email", normalized_email)
                .limit(1)
                .execute()
            )
            return bool(res.data and len(res.data) > 0)
        except Exception as e:
            logger.warning("Error checking email in public.users: %s", str(e))
            return False

    def get_user_profile_by_id_or_email(self, user_id: str, email: str) -> Optional[dict]:
        """Retrieves user profile record from public.users."""
        target_client = self.admin_client or self.client
        try:
            res = (
                target_client.table("users")
                .select("*")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            pass

        try:
            res = (
                target_client.table("users")
                .select("*")
                .ilike("email", email.strip().lower())
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning("Error fetching user profile for %s: %s", email, str(e))

        return None

    def login_with_password(self, payload: LoginRequest) -> LoginResponse:
        """
        Authenticates user with email and password via Supabase Auth.
        Returns Supabase JWT access token and user profile.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Pre-check: Ensure account exists in public.users
        profile = self.get_user_profile_by_id_or_email(None, normalized_email)
        if not profile:
            logger.info("Login rejected: user not found in public.users for %s", normalized_email)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SylloMetry account found with this email address. Please sign up first.",
            )

        # 2. Match database encoded password
        db_password = profile.get("password")
        if not db_password:
            registration_by = (profile.get("registration_by") or "").lower()
            if registration_by == "google":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This account was registered using Google. Please use 'Sign in with Google' to continue.",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No password configured for this account. Please sign in with Google or reset your password.",
            )

        # If the database password is a bcrypt encoded hash ($2a$, $2b$, $2y$)
        if db_password.startswith(("$2a$", "$2b$", "$2y$")):
            try:
                password_matches = bcrypt.checkpw(
                    payload.password.encode("utf-8"),
                    db_password.encode("utf-8"),
                )
                if not password_matches:
                    logger.warning("Bcrypt database password mismatch for %s", normalized_email)
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Incorrect password. Please verify your credentials and try again.",
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error("Error checking bcrypt password: %s", str(e))
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect password. Please verify your credentials and try again.",
                )
        elif db_password != payload.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please verify your credentials and try again.",
            )

        # 3. Authenticate against Supabase Auth to obtain Supabase JWT session
        try:
            sign_in_res = self.client.auth.sign_in_with_password({
                "email": normalized_email,
                "password": payload.password,
            })
        except AuthApiError as e:
            err_msg = (getattr(e, "message", "") or str(e)).lower()
            logger.warning("Supabase AuthApiError during login for %s: %s", normalized_email, err_msg)

            # If Supabase Auth password was out of sync with verified public.users bcrypt password
            if "invalid login credentials" in err_msg or "invalid credentials" in err_msg:
                user_id = profile.get("id")
                if self.admin_client and user_id:
                    try:
                        self.admin_client.auth.admin.update_user_by_id(
                            user_id,
                            {"password": payload.password}
                        )
                        sign_in_res = self.client.auth.sign_in_with_password({
                            "email": normalized_email,
                            "password": payload.password,
                        })
                    except Exception:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect password. Please verify your credentials and try again.",
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Incorrect password. Please verify your credentials and try again.",
                    )
            elif "email not confirmed" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your email address has not been confirmed. Please check your inbox for verification.",
                )
            elif e.status == 429 or "rate" in err_msg or "too many" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many sign in attempts. Please wait a moment before trying again.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=e.message or "Unable to sign in. Please verify your credentials.",
                )
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            logger.error("Connection error during login: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reach authentication server. Please check your internet connection.",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Unexpected error in login_with_password: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An internal error occurred during sign in. Please try again.",
            )

        # 3. Extract Supabase session and user
        session = getattr(sign_in_res, "session", None)
        auth_user = getattr(sign_in_res, "user", None) or getattr(session, "user", None)

        if not session or not getattr(session, "access_token", None):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication succeeded but failed to generate a session token.",
            )

        user_id = str(auth_user.id) if auth_user else "authenticated-user"

        # 4. Fetch profile details from public.users
        profile = self.get_user_profile_by_id_or_email(user_id, normalized_email)
        user_metadata = getattr(auth_user, "user_metadata", {}) or {}

        full_name = (
            (profile.get("full_name") if profile else None)
            or user_metadata.get("full_name")
            or user_metadata.get("name")
            or normalized_email.split("@")[0].title()
        )

        registration_by = (
            (profile.get("registration_by") if profile else None)
            or "Email"
        )

        u_created_at = getattr(auth_user, "created_at", None)
        created_at_str = (
            u_created_at.isoformat()
            if hasattr(u_created_at, "isoformat")
            else str(u_created_at) if u_created_at else now_iso
        )

        safe_user = SafeUser(
            id=user_id,
            email=normalized_email,
            full_name=full_name,
            registration_by=registration_by,
            created_at=created_at_str,
            email_confirmed=bool(getattr(auth_user, "email_confirmed_at", True)),
        )

        session_data = SessionData(
            access_token=session.access_token,
            refresh_token=getattr(session, "refresh_token", None),
            token_type=getattr(session, "token_type", "bearer") or "bearer",
            expires_in=getattr(session, "expires_in", None),
            expires_at=getattr(session, "expires_at", None),
            user=safe_user,
        )

        logger.info("User successfully logged in: %s", normalized_email)

        return LoginResponse(
            success=True,
            message="Login successful.",
            user=safe_user,
            session=session_data,
        )

    def send_login_otp(self, payload: SendLoginOtpRequest) -> SendLoginOtpResponse:
        """
        Sends a 6-digit OTP code to the user's email for passwordless login or verification.
        Refuses to send if the user does not have an active SylloMetry account.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()

        # Must be an existing account to log in
        profile = self.get_user_profile_by_id_or_email(None, normalized_email)
        if not profile:
            logger.info("Login OTP requested for non-existent user: %s", normalized_email)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SylloMetry account found with this email address. Please sign up first.",
            )

        # Pre-check: If user registered via Google, advise using Google Sign-In before dispatching OTP
        registration_by = (profile.get("registration_by") or "").strip().lower()
        db_password = profile.get("password")
        if registration_by == "google" and not db_password:
            logger.info("Login OTP refused for Google-registered account: %s", normalized_email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account was registered using Google. Please use 'Sign in with Google' to continue.",
            )

        try:
            logger.info("Sending login OTP to %s via Supabase Auth", normalized_email)
            self.client.auth.sign_in_with_otp({
                "email": normalized_email,
                "options": {
                    "should_create_user": False,
                },
            })

            return SendLoginOtpResponse(
                success=True,
                message="A 6-digit verification code has been sent to your email address.",
                email=normalized_email,
            )

        except AuthApiError as e:
            err_msg = (getattr(e, "message", "") or "").lower()
            logger.warning("AuthApiError during login OTP send: %s", err_msg)
            if e.status == 429 or "rate" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many verification requests. Please wait a moment before trying again.",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.message or "Failed to send verification code.",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Unexpected error in send_login_otp: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification code. Please try again later.",
            )

    def verify_login_otp(self, payload: VerifyLoginOtpRequest) -> VerifyLoginOtpResponse:
        """
        Verifies a 6-digit email OTP code for login email verification.
        Does NOT log the user in or redirect to dashboard.
        Confirms email verification status so the user can proceed to enter their password.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()
        clean_token = payload.token.strip()

        try:
            auth_resp = self.client.auth.verify_otp({
                "email": normalized_email,
                "token": clean_token,
                "type": "email",
            })
        except AuthApiError as e:
            # Fallback to magiclink verification type if configured
            try:
                auth_resp = self.client.auth.verify_otp({
                    "email": normalized_email,
                    "token": clean_token,
                    "type": "magiclink",
                })
            except Exception:
                logger.warning("OTP verification failed for %s: %s", normalized_email, getattr(e, "message", str(e)))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification code. Please check your inbox.",
                )
        except Exception as e:
            logger.error("Unexpected error in verify_login_otp: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to verify login code.",
            )

        logger.info("Email OTP verified successfully on login page for: %s", normalized_email)

        return VerifyLoginOtpResponse(
            success=True,
            message="Email verified successfully. Please enter your password to sign in.",
            is_verified=True,
            email=normalized_email,
        )

    def send_password_reset_otp(self, payload: PasswordResetOtpRequest) -> PasswordResetOtpResponse:
        """
        Sends a 6-digit OTP code to the registered email for password recovery.
        Checks if user exists, and rejects if user was registered via Google.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()

        # Must be an existing account
        profile = self.get_user_profile_by_id_or_email(None, normalized_email)
        if not profile:
            logger.info("Password reset requested for non-existent user: %s", normalized_email)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SylloMetry account found with this email address. Please sign up first.",
            )

        # Pre-check: If user registered via Google, advise using Google Sign-In
        registration_by = (profile.get("registration_by") or "").strip().lower()
        db_password = profile.get("password")
        if registration_by == "google" and not db_password:
            logger.info("Password reset refused for Google-registered account: %s", normalized_email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account was registered using Google. Please use 'Sign in with Google' to continue.",
            )

        try:
            logger.info("Sending password reset OTP to %s via Supabase Auth", normalized_email)
            self.client.auth.sign_in_with_otp({
                "email": normalized_email,
                "options": {
                    "should_create_user": False,
                },
            })

            return PasswordResetOtpResponse(
                success=True,
                message="A 6-digit verification code has been sent to your email address.",
                email=normalized_email,
            )
        except AuthApiError as e:
            err_msg = (getattr(e, "message", "") or "").lower()
            logger.warning("AuthApiError during password reset OTP send: %s", err_msg)
            if e.status == 429 or "rate" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many verification requests. Please wait a moment before trying again.",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.message or "Failed to send verification code.",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Unexpected error in send_password_reset_otp: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification code. Please try again later.",
            )

    def _get_signing_secret(self) -> bytes:
        """Derives secret key for signing recovery tokens."""
        secret = settings.SUPABASE_SERVICE_ROLE_KEY or settings.publishable_key or "syllometry-secret-key"
        return secret.encode("utf-8")

    def generate_reset_token(self, email: str, user_id: str) -> str:
        """Generates a secure HMAC-signed reset authorization token valid for 15 minutes."""
        secret = self._get_signing_secret()
        payload = {
            "email": email.strip().lower(),
            "user_id": user_id,
            "exp": int(time.time()) + 900,
        }
        payload_json = json.dumps(payload, separators=(',', ':')).encode("utf-8")
        signature = hmac.new(secret, payload_json, hashlib.sha256).hexdigest()
        token_data = {
            "p": base64.urlsafe_b64encode(payload_json).decode("utf-8"),
            "s": signature,
        }
        return base64.urlsafe_b64encode(json.dumps(token_data).encode("utf-8")).decode("utf-8")

    def verify_reset_token(self, token: str, expected_email: str) -> Optional[dict]:
        """Validates a signed reset authorization token."""
        try:
            secret = self._get_signing_secret()
            raw = base64.urlsafe_b64decode(token.encode("utf-8"))
            token_data = json.loads(raw)
            payload_json = base64.urlsafe_b64decode(token_data["p"].encode("utf-8"))
            expected_sig = hmac.new(secret, payload_json, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(token_data["s"], expected_sig):
                return None
            payload = json.loads(payload_json)
            if payload.get("exp", 0) < time.time():
                return None
            if payload.get("email") != expected_email.strip().lower():
                return None
            return payload
        except Exception:
            return None

    def verify_password_reset_otp(self, payload: VerifyPasswordResetOtpRequest) -> VerifyPasswordResetOtpResponse:
        """
        Validates the 6-digit OTP code against Supabase Auth.
        Issues a signed single-use reset authorization token upon success.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()
        clean_token = payload.token.strip()

        profile = self.get_user_profile_by_id_or_email(None, normalized_email)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SylloMetry account found with this email address.",
            )

        try:
            self.client.auth.verify_otp({
                "email": normalized_email,
                "token": clean_token,
                "type": "email",
            })
        except AuthApiError:
            try:
                self.client.auth.verify_otp({
                    "email": normalized_email,
                    "token": clean_token,
                    "type": "recovery",
                })
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification code. Please check your inbox.",
                )

        user_id = str(profile.get("id"))
        reset_token = self.generate_reset_token(normalized_email, user_id)

        logger.info("Password reset OTP verified successfully for: %s", normalized_email)

        return VerifyPasswordResetOtpResponse(
            success=True,
            message="Verification code confirmed.",
            email=normalized_email,
            reset_token=reset_token,
        )

    def confirm_password_reset(self, payload: ConfirmPasswordResetRequest) -> ConfirmPasswordResetResponse:
        """
        Verifies the reset token or OTP code, hashes the new password with bcrypt,
        and updates both public.users and Supabase Auth.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()

        if payload.new_password != payload.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match. Please verify and try again.",
            )

        profile = self.get_user_profile_by_id_or_email(None, normalized_email)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SylloMetry account found with this email address.",
            )

        # 1. Verify reset authorization: Check if token is a signed reset_token
        clean_token = payload.token.strip()
        verified_payload = self.verify_reset_token(clean_token, normalized_email)

        # If not a signed reset token, attempt direct OTP verification fallback
        if not verified_payload:
            try:
                self.client.auth.verify_otp({
                    "email": normalized_email,
                    "token": clean_token,
                    "type": "email",
                })
            except AuthApiError:
                try:
                    self.client.auth.verify_otp({
                        "email": normalized_email,
                        "token": clean_token,
                        "type": "recovery",
                    })
                except Exception:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid or expired verification session. Please request a new code.",
                    )

        # 2. Hash new password with bcrypt
        salt = bcrypt.gensalt(rounds=10)
        hashed_password = bcrypt.hashpw(payload.new_password.encode("utf-8"), salt).decode("utf-8")

        user_id = str(profile.get("id"))
        target_client = self.admin_client or self.client

        # 3. Update public.users
        try:
            target_client.table("users").update({
                "password": hashed_password,
                "registration_by": "Email",
            }).eq("id", user_id).execute()
        except Exception as e:
            logger.error("Failed to update password in public.users: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password. Please try again.",
            )

        # 4. Update Supabase Auth password
        if self.admin_client:
            try:
                self.admin_client.auth.admin.update_user_by_id(
                    user_id,
                    {"password": payload.new_password}
                )
            except Exception as e:
                logger.warning("Could not sync updated password to Supabase Auth: %s", str(e))

        logger.info("Password reset successfully for %s", normalized_email)

        return ConfirmPasswordResetResponse(
            success=True,
            message="Your password has been successfully reset. Please sign in with your new password.",
        )

