from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


# ==============================================================================
# Shared / Safe User & Session Schemas
# ==============================================================================

class SafeUser(BaseModel):
    """Safe, sanitized representation of an authenticated user."""
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique UUID of the user")
    email: str = Field(..., description="User's email address")
    full_name: Optional[str] = Field(None, description="User's full name")
    registration_by: Optional[str] = Field("Email", description="Registration method: Email or Google")
    created_at: Optional[str] = Field(None, description="Account creation timestamp")
    email_confirmed: bool = Field(True, description="Whether email has been verified")

    @field_validator("created_at", mode="before")
    @classmethod
    def format_created_at(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v) if v is not None else None


class SessionData(BaseModel):
    """Safe session information issued by Supabase Auth."""
    model_config = ConfigDict(from_attributes=True)

    access_token: str = Field(..., description="Supabase JWT access token")
    refresh_token: Optional[str] = Field(None, description="Supabase refresh token")
    token_type: str = Field("bearer", description="Token type, standard bearer")
    expires_in: Optional[int] = Field(None, description="Lifetime of access token in seconds")
    expires_at: Optional[int] = Field(None, description="Unix timestamp of token expiration")
    user: Optional[SafeUser] = Field(None, description="Safe user details")


# ==============================================================================
# 1. Email OTP Request & Response
# ==============================================================================

class SendOtpRequest(BaseModel):
    """Payload to request an email OTP verification code."""
    email: EmailStr = Field(..., description="Valid email address to receive OTP")
    full_name: Optional[str] = Field(None, description="Optional full name of the user to pass to user metadata")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else None


class SendOtpResponse(BaseModel):
    """Response returned upon dispatching an OTP."""
    success: bool = Field(True, description="Status indicator")
    message: str = Field(
        "A verification code has been sent to your email address.",
        description="User-facing status message",
    )
    email: str = Field(..., description="Normalized email address")


# ==============================================================================
# 2. OTP Verification Request & Response
# ==============================================================================

class VerifyOtpRequest(BaseModel):
    """Payload to verify an email OTP code."""
    email: EmailStr = Field(..., description="Email address associated with the OTP")
    token: str = Field(..., min_length=6, max_length=6, description="Six-digit numeric OTP code")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()

    @field_validator("token")
    @classmethod
    def validate_token(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise ValueError("Verification code must be exactly 6 digits.")
        return cleaned


class VerifyOtpResponse(BaseModel):
    """Response returned when an OTP is successfully validated."""
    success: bool = Field(True, description="Status indicator")
    message: str = Field("Email verified successfully.", description="User-facing confirmation message")
    email: str = Field(..., description="Verified email address")
    is_verified: bool = Field(True, description="Verification status flag")
    session: Optional[SessionData] = Field(
        None,
        description="Authenticated Supabase session if issued during OTP verification",
    )


# ==============================================================================
# 3. Complete Signup Request & Response
# ==============================================================================

class SignupRequest(BaseModel):
    """
    Payload to complete account registration after email verification.
    Matches the SylloMetry registration form fields.
    """
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Full name of the user as entered on the signup card",
    )
    email: EmailStr = Field(..., description="Verified email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Account password (minimum 8 characters)",
    )
    confirm_password: str = Field(..., description="Password confirmation matching password")
    terms_accepted: bool = Field(
        ...,
        description="User explicitly accepted the Terms of Service and Privacy Policy",
    )
    # Optional: access token if the client chooses to pass the session token from OTP verification
    access_token: Optional[str] = Field(
        None,
        description="Optional session access token received from prior OTP verification",
    )

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Full name cannot be blank.")
        return cleaned

    @field_validator("terms_accepted")
    @classmethod
    def validate_terms(cls, v: bool) -> bool:
        if v is not True:
            raise ValueError(
                "You must agree to the Terms of Service and Privacy Policy to create an account."
            )
        return v

    @model_validator(mode="after")
    def validate_passwords_match(self) -> "SignupRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class SignupResponse(BaseModel):
    """Response returned when an account has successfully been created."""
    success: bool = Field(True, description="Status indicator")
    message: str = Field("Account created successfully.", description="User confirmation message")
    user: SafeUser = Field(..., description="Safe user profile details")
    session: Optional[SessionData] = Field(
        None,
        description="Authenticated session credentials for immediate login if available",
    )


# ==============================================================================
# 4. Google OAuth Signup Response
# ==============================================================================

class GoogleAuthResponse(BaseModel):
    """Response returned when initiating Google OAuth signup."""
    authorization_url: str = Field(..., description="Supabase OAuth authorization URL for Google")
    provider: str = Field("google", description="OAuth identity provider")
    redirect_to: str = Field(..., description="Configured frontend callback URL")


class OAuthSyncRequest(BaseModel):
    """Payload to synchronize an authenticated OAuth session into the database."""
    access_token: str = Field(..., description="Supabase access token from OAuth callback")
    mode: Optional[str] = Field("signup", description="OAuth context: 'signup' or 'signin'")


class OAuthSyncResponse(BaseModel):
    """Response returned upon synchronizing OAuth session to public users table."""
    success: bool = Field(True, description="Status indicator")
    user: SafeUser = Field(..., description="Safe user profile details")

