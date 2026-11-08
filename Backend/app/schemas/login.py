from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.signup import SafeUser, SessionData


# ==============================================================================
# Login Request & Response Schemas
# ==============================================================================

class LoginRequest(BaseModel):
    """Payload to log in using email and password."""
    email: EmailStr = Field(..., description="Registered user email address")
    password: str = Field(..., min_length=1, description="Account password")
    remember: Optional[bool] = Field(False, description="Persist session for longer duration")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()


class LoginResponse(BaseModel):
    """Response returned upon successful authentication."""
    model_config = ConfigDict(from_attributes=True)

    success: bool = Field(True, description="Indicates login success")
    message: str = Field("Login successful.", description="Human-readable success message")
    user: SafeUser = Field(..., description="Sanitized user profile")
    session: SessionData = Field(..., description="Supabase session containing JWT access token")


# ==============================================================================
# Login OTP Schemas (Optional Passwordless Login / Verification)
# ==============================================================================

class SendLoginOtpRequest(BaseModel):
    """Payload to request a login OTP verification code."""
    email: EmailStr = Field(..., description="Registered user email to receive OTP")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()


class SendLoginOtpResponse(BaseModel):
    """Response returned after sending a login OTP code."""
    success: bool = Field(True, description="Indicates OTP was dispatched")
    message: str = Field(..., description="Status message")
    email: str = Field(..., description="Normalized target email")


class VerifyLoginOtpRequest(BaseModel):
    """Payload to verify an OTP login code."""
    email: EmailStr = Field(..., description="Target email address")
    token: str = Field(..., min_length=6, max_length=10, description="6-digit verification code")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()

    @field_validator("token")
    @classmethod
    def normalize_token(cls, v: str) -> str:
        return v.strip()


class VerifyLoginOtpResponse(BaseModel):
    """Response returned upon successfully verifying login email OTP."""
    success: bool = Field(True, description="Indicates OTP was verified")
    message: str = Field("Email verified successfully.", description="Status message")
    is_verified: bool = Field(True, description="Whether email has been verified")
    email: str = Field(..., description="Verified email address")


class CurrentUserResponse(BaseModel):
    """Response returned by the protected /api/auth/me endpoint."""
    model_config = ConfigDict(from_attributes=True)

    success: bool = Field(True, description="Indicates request success")
    user: SafeUser = Field(..., description="Sanitized authenticated user profile")

