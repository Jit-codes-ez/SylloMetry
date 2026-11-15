import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, status

from app.core.security import get_current_admin
from app.schemas.admin import (
    AdminDocumentListResponse,
    AdminDocumentUploadResponse,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminMeResponse,
    AdminSendOtpRequest,
    AdminSendOtpResponse,
    AdminVerifyOtpRequest,
    AdminVerifyOtpResponse,
    CreateAdminRequest,
    CreateAdminResponse,
    AdminChangePasswordRequest,
    AdminChangePasswordResponse,
    SafeAdmin,
)
from app.services.admin_service import AdminService

logger = logging.getLogger("app.routes.admin")

router = APIRouter(prefix="/api/admin", tags=["Administration Portal"])


def get_admin_service() -> AdminService:
    """Dependency provider for AdminService."""
    return AdminService()


# ==============================================================================
# Endpoint 1: Send Admin Login OTP
# POST /api/admin/auth/otp/send
# ==============================================================================
@router.post(
    "/auth/otp/send",
    response_model=AdminSendOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Send Admin Verification OTP",
    description="Validates that the email exists in public.admin and dispatches a 6-digit OTP code.",
)
def send_admin_otp(
    payload: AdminSendOtpRequest,
    service: AdminService = Depends(get_admin_service),
) -> AdminSendOtpResponse:
    return service.send_admin_otp(payload)


# ==============================================================================
# Endpoint 2: Verify Admin Login OTP
# POST /api/admin/auth/otp/verify
# ==============================================================================
@router.post(
    "/auth/otp/verify",
    response_model=AdminVerifyOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Admin OTP Code",
    description="Validates the 6-digit code for the registered admin email.",
)
def verify_admin_otp(
    payload: AdminVerifyOtpRequest,
    service: AdminService = Depends(get_admin_service),
) -> AdminVerifyOtpResponse:
    return service.verify_admin_otp(payload)


# ==============================================================================
# Endpoint 3: Admin Login with Email & Password
# POST /api/admin/auth/login
# ==============================================================================
@router.post(
    "/auth/login",
    response_model=AdminLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin Login with Password",
    description="Authenticates against the public.admin table using bcrypt hash. Returns an admin session token.",
)
def login_admin(
    payload: AdminLoginRequest,
    service: AdminService = Depends(get_admin_service),
) -> AdminLoginResponse:
    return service.login_admin(payload)


# ==============================================================================
# Endpoint 4: Get Current Authenticated Admin
# GET /api/admin/auth/me
# ==============================================================================
@router.get(
    "/auth/me",
    response_model=AdminMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current Authenticated Admin",
    description="Verifies the admin Bearer token and confirms credentials against public.admin.",
)
async def get_admin_me(
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> AdminMeResponse:
    return AdminMeResponse(success=True, admin=current_admin)


# ==============================================================================
# Endpoint 5: Admin Logout
# POST /api/admin/auth/logout
# ==============================================================================
@router.post(
    "/auth/logout",
    status_code=status.HTTP_200_OK,
    summary="Admin Sign Out",
)
def logout_admin():
    return {"success": True, "message": "Admin session terminated."}


# ==============================================================================
# Endpoint 6: Upload PDF for Ingestion Pipeline
# POST /api/admin/documents/upload
# ==============================================================================
@router.post(
    "/documents/upload",
    response_model=AdminDocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload PDF for Extraction & Ingestion Pipeline",
    description="Uploads a PDF document in the administrative portal, prepared for industry document ingestion.",
)
async def upload_admin_document(
    file: UploadFile = File(...),
    current_admin: SafeAdmin = Depends(get_current_admin),
    service: AdminService = Depends(get_admin_service),
) -> AdminDocumentUploadResponse:
    return service.upload_pdf_document(file, current_admin)


# ==============================================================================
# Endpoint 7: List Admin Uploaded Documents
# GET /api/admin/documents
# ==============================================================================
@router.get(
    "/documents",
    response_model=AdminDocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Admin Ingested Documents",
)
async def get_admin_documents(
    current_admin: SafeAdmin = Depends(get_current_admin),
    service: AdminService = Depends(get_admin_service),
) -> AdminDocumentListResponse:
    return service.get_documents_list(current_admin)


# ==============================================================================
# Endpoint 8: Add New Admin Account
# POST /api/admin/create
# ==============================================================================
@router.post(
    "/create",
    response_model=CreateAdminResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Administrator",
    description="Allows an authenticated administrator to register a new admin with email and password.",
)
async def create_new_admin(
    payload: CreateAdminRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    service: AdminService = Depends(get_admin_service),
) -> CreateAdminResponse:
    return service.create_admin(payload, current_admin)


# ==============================================================================
# Endpoint 9: Change Administrator Password
# POST /api/admin/auth/change-password
# ==============================================================================
@router.post(
    "/auth/change-password",
    response_model=AdminChangePasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Change Admin Password",
    description="Updates password for the currently authenticated administrator after verifying current password.",
)
async def change_admin_password(
    payload: AdminChangePasswordRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    service: AdminService = Depends(get_admin_service),
) -> AdminChangePasswordResponse:
    return service.change_admin_password(payload, current_admin)



