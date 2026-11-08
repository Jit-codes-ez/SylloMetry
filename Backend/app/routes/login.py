import logging
from typing import Optional
from fastapi import APIRouter, Depends, Header, status

from app.core.security import get_current_user
from app.schemas.login import (
    ConfirmPasswordResetRequest,
    ConfirmPasswordResetResponse,
    CurrentUserResponse,
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
from app.schemas.signup import SafeUser
from app.services.login_service import LoginService

logger = logging.getLogger("app.routes.login")

router = APIRouter(prefix="/api/auth", tags=["Authentication - Login"])


def get_login_service() -> LoginService:
    """Dependency provider for LoginService."""
    return LoginService()


# ==============================================================================
# Endpoint 1: Email + Password Login
# POST /api/auth/login
# ==============================================================================
@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Log In with Email & Password",
    description=(
        "Authenticates a registered SylloMetry user with email and password. "
        "Returns a verified user profile and Supabase JWT access token."
    ),
)
def login_with_password(
    payload: LoginRequest,
    service: LoginService = Depends(get_login_service),
) -> LoginResponse:
    """
    Standard email and password authentication.
    - Verifies user exists in public.users.
    - Authenticates against Supabase Auth.
    - Returns JWT access token and user profile.
    """
    return service.login_with_password(payload)


# ==============================================================================
# Endpoint 2: Request Login Verification OTP (Passwordless Login / Verification)
# POST /api/auth/login/otp/send
# ==============================================================================
@router.post(
    "/login/otp/send",
    response_model=SendLoginOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Send Login OTP Verification Code",
    description="Sends a 6-digit verification code to the registered email address for sign-in verification.",
)
def send_login_otp(
    payload: SendLoginOtpRequest,
    service: LoginService = Depends(get_login_service),
) -> SendLoginOtpResponse:
    return service.send_login_otp(payload)


# ==============================================================================
# Endpoint 3: Verify Login OTP
# POST /api/auth/login/otp/verify
# ==============================================================================
@router.post(
    "/login/otp/verify",
    response_model=VerifyLoginOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Login OTP Code",
    description="Validates the 6-digit login verification code for email verification.",
)
def verify_login_otp(
    payload: VerifyLoginOtpRequest,
    service: LoginService = Depends(get_login_service),
) -> VerifyLoginOtpResponse:
    return service.verify_login_otp(payload)


# ==============================================================================
# Endpoint 4: Get Current Authenticated User
# GET /api/auth/me
# ==============================================================================
@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current Authenticated User",
    description="Validates the Supabase JWT Bearer token and returns the current user profile.",
)
async def get_me(
    current_user: SafeUser = Depends(get_current_user),
) -> CurrentUserResponse:
    """
    Protected route that requires a valid Supabase JWT Bearer token in Authorization header.
    Returns the authenticated user details.
    """
    return CurrentUserResponse(success=True, user=current_user)


# ==============================================================================
# Endpoint 5: Logout
# POST /api/auth/logout
# ==============================================================================
@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log Out User",
    description="Clears session state and acknowledges user logout.",
)
def logout_user(
    authorization: Optional[str] = Header(None),
):
    """
    Logs out the user. Tokens are managed statelessly / client-side via Supabase JWT.
    """
    return {"success": True, "message": "Logged out successfully."}


# ==============================================================================
# Endpoint 6: Request Password Reset OTP
# POST /api/auth/password/reset/otp/send
# ==============================================================================
@router.post(
    "/password/reset/otp/send",
    response_model=PasswordResetOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Send Password Reset OTP Code",
    description="Sends a 6-digit verification code to the registered email address for password recovery.",
)
def send_password_reset_otp(
    payload: PasswordResetOtpRequest,
    service: LoginService = Depends(get_login_service),
) -> PasswordResetOtpResponse:
    return service.send_password_reset_otp(payload)


# ==============================================================================
# Endpoint 7: Verify Password Reset OTP
# POST /api/auth/password/reset/otp/verify
# ==============================================================================
@router.post(
    "/password/reset/otp/verify",
    response_model=VerifyPasswordResetOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Password Reset OTP",
    description="Verifies the recovery code and issues a signed reset authorization token.",
)
def verify_password_reset_otp(
    payload: VerifyPasswordResetOtpRequest,
    service: LoginService = Depends(get_login_service),
) -> VerifyPasswordResetOtpResponse:
    return service.verify_password_reset_otp(payload)


# ==============================================================================
# Endpoint 8: Confirm Password Reset
# POST /api/auth/password/reset/confirm
# ==============================================================================
@router.post(
    "/password/reset/confirm",
    response_model=ConfirmPasswordResetResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm Password Reset",
    description="Validates OTP and updates password in database and Supabase Auth.",
)
def confirm_password_reset(
    payload: ConfirmPasswordResetRequest,
    service: LoginService = Depends(get_login_service),
) -> ConfirmPasswordResetResponse:
    return service.confirm_password_reset(payload)

