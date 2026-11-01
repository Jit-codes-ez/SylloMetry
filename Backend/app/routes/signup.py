import logging
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, status
from fastapi.responses import RedirectResponse

from app.schemas.signup import (
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
    SignupRequest,
    SignupResponse,
    GoogleAuthResponse,
)
from app.services.signup_service import SignupService

logger = logging.getLogger("app.routes.signup")

router = APIRouter(prefix="/api/auth", tags=["Authentication - Sign Up"])


def get_signup_service() -> SignupService:
    """Dependency provider for SignupService."""
    return SignupService()


# ==============================================================================
# Endpoint 1: Request Email OTP
# POST /api/auth/signup/otp/send
# ==============================================================================
@router.post(
    "/signup/otp/send",
    response_model=SendOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Send Email Verification OTP",
    description=(
        "Dispatches a 6-digit email OTP for new user signup. Validates email format, "
        "checks if an account already exists before sending, and enforces Supabase rate limits."
    ),
)
def send_signup_otp(
    payload: SendOtpRequest,
    service: SignupService = Depends(get_signup_service),
) -> SendOtpResponse:
    """
    Step 1 of Signup: Request email verification OTP.
    - Validates email address.
    - Rejects with 409 Conflict if account already exists.
    - Sends 6-digit OTP code to the user's email via Supabase Auth.
    """
    return service.send_signup_otp(email=payload.email, full_name=payload.full_name)


# ==============================================================================
# Endpoint 2: Verify OTP
# POST /api/auth/signup/otp/verify
# ==============================================================================
@router.post(
    "/signup/otp/verify",
    response_model=VerifyOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Email OTP",
    description=(
        "Verifies the 6-digit code against Supabase Auth. If valid, marks the email "
        "as verified and returns authenticated session tokens if issued by Supabase."
    ),
)
def verify_signup_otp(
    payload: VerifyOtpRequest,
    service: SignupService = Depends(get_signup_service),
) -> VerifyOtpResponse:
    """
    Step 2 of Signup: Verify 6-digit OTP.
    - Confirms that the entered code matches Supabase Auth's record.
    - Returns verification confirmation and session if available.
    """
    return service.verify_signup_otp(email=payload.email, token=payload.token)


# ==============================================================================
# Endpoint 3: Complete Email/Password Signup
# POST /api/auth/signup
# ==============================================================================
@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Complete User Registration",
    description=(
        "Finalizes user registration by applying password, full name, and terms acceptance. "
        "Requires email to be verified beforehand. Never stores passwords in public tables."
    ),
)
def complete_signup(
    payload: SignupRequest,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    service: SignupService = Depends(get_signup_service),
) -> SignupResponse:
    """
    Step 3 of Signup: Complete registration.
    - Enforces min 8-character password.
    - Enforces password and confirm_password match.
    - Enforces acceptance of Terms of Service & Privacy Policy.
    - Enforces verified email OTP before registration.
    - Sets user metadata and signs in to return authenticated session.
    """
    return service.complete_signup(payload=payload, auth_header=authorization)


# ==============================================================================
# Endpoint 4: Initiate Google OAuth Signup
# GET /api/auth/signup/google
# ==============================================================================
@router.get(
    "/signup/google",
    response_model=GoogleAuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate Google OAuth Signup",
    description=(
        "Generates Supabase Google OAuth authorization URL. "
        "Preserves PKCE, redirects to FRONTEND_URL callback, and never handles Google secrets directly."
    ),
)
def initiate_google_signup(
    redirect_to: Optional[str] = Query(
        None,
        description="Optional custom frontend callback URL overriding FRONTEND_URL/auth/callback",
    ),
    redirect: bool = Query(
        False,
        description="If True, issues a 307 redirect directly to Google OAuth provider URL",
    ),
    service: SignupService = Depends(get_signup_service),
):
    """
    Initiate Google OAuth signup/login flow.
    - Returns JSON with authorization URL or redirects browser directly if redirect=true.
    """
    auth_response = service.initiate_google_signup(redirect_to=redirect_to)
    if redirect:
        return RedirectResponse(
            url=auth_response.authorization_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
    return auth_response

