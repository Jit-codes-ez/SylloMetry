from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field


class AdminSendOtpRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered admin email address")


class AdminSendOtpResponse(BaseModel):
    success: bool = True
    message: str = "A 6-digit verification code has been sent to your admin email address."
    email: str


class AdminVerifyOtpRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered admin email address")
    token: str = Field(..., min_length=6, max_length=10, description="6-digit verification OTP code")


class AdminVerifyOtpResponse(BaseModel):
    success: bool = True
    message: str = "Admin email verified successfully. Please enter your password to sign in."
    is_verified: bool = True
    email: str


class AdminLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered admin email address")
    password: str = Field(..., min_length=1, description="Admin account password")
    remember: bool = Field(default=False, description="Extend session lifetime")


class SafeAdmin(BaseModel):
    id: int = Field(..., description="Admin database ID from public.admin")
    email: str = Field(..., description="Admin email address")
    role: str = Field(default="admin", description="Admin role authorization level")
    full_name: Optional[str] = Field(default="Administrator", description="Display name for the admin")


class AdminLoginResponse(BaseModel):
    success: bool = True
    message: str = "Admin authentication successful."
    admin: SafeAdmin
    token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class AdminMeResponse(BaseModel):
    success: bool = True
    admin: SafeAdmin


class AdminDocumentUploadResponse(BaseModel):
    success: bool = True
    message: str = "Document uploaded successfully for ingestion pipeline."
    document: Dict[str, Any]


class AdminDocumentListResponse(BaseModel):
    success: bool = True
    documents: List[Dict[str, Any]]

