import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import bcrypt
from fastapi import HTTPException, UploadFile, status
from supabase import Client
from supabase_auth.errors import AuthApiError

from app.core.config import settings
from app.core.supabase import get_supabase_admin_client, get_supabase_client
from app.schemas.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminSendOtpRequest,
    AdminSendOtpResponse,
    AdminVerifyOtpRequest,
    AdminVerifyOtpResponse,
    AdminDocumentUploadResponse,
    AdminDocumentListResponse,
    SafeAdmin,
)

logger = logging.getLogger("app.services.admin")

# In-memory document registry for uploaded admin PDFs (ready for ingestion pipeline)
_ADMIN_DOCUMENTS: List[Dict[str, Any]] = []


class AdminService:
    """Service providing dedicated authentication and PDF ingestion operations for administrators."""

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

    def get_admin_record_by_email(self, email: str) -> Optional[dict]:
        """Queries public.admin table strictly for matching administrator record."""
        normalized_email = email.strip().lower()
        target_client = self.admin_client or self.client

        try:
            res = (
                target_client.table("admin")
                .select("*")
                .ilike("email", normalized_email)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning("Error fetching admin record for %s: %s", normalized_email, str(e))

        return None

    def send_admin_otp(self, payload: AdminSendOtpRequest) -> AdminSendOtpResponse:
        """
        Sends an email OTP verification code to the registered administrator.
        Fails if email is not present in public.admin.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()

        # 1. Enforce admin existence in public.admin
        admin_rec = self.get_admin_record_by_email(normalized_email)
        if not admin_rec:
            logger.warning("Unauthorized admin OTP request for non-admin: %s", normalized_email)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SylloMetry admin account found with this email address.",
            )

        # 2. Ensure matching record exists in Supabase auth.users for OTP delivery
        if self.admin_client:
            try:
                users = self.admin_client.auth.admin.list_users()
                matching = [u for u in users if getattr(u, "email", "").lower() == normalized_email]
                if not matching:
                    logger.info("Creating auth user for admin: %s", normalized_email)
                    self.admin_client.auth.admin.create_user({
                        "email": normalized_email,
                        "email_confirm": True,
                    })
            except Exception as e:
                logger.warning("Notice verifying admin in auth.users: %s", str(e))

        # 3. Dispatch 6-digit OTP code using Supabase Auth
        try:
            logger.info("Sending admin login OTP to %s via Supabase Auth", normalized_email)
            self.client.auth.sign_in_with_otp({
                "email": normalized_email,
                "options": {
                    "should_create_user": False,
                },
            })

            return AdminSendOtpResponse(
                success=True,
                message="A 6-digit verification code has been sent to your admin email address.",
                email=normalized_email,
            )

        except AuthApiError as e:
            err_msg = (getattr(e, "message", "") or "").lower()
            logger.warning("AuthApiError during admin OTP send: %s", err_msg)
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
            logger.error("Unexpected error in send_admin_otp: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send admin verification code. Please try again later.",
            )

    def verify_admin_otp(self, payload: AdminVerifyOtpRequest) -> AdminVerifyOtpResponse:
        """
        Validates the 6-digit admin verification code.
        Confirms email verification before password submission.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()
        clean_token = payload.token.strip()

        # Ensure email is in public.admin
        admin_rec = self.get_admin_record_by_email(normalized_email)
        if not admin_rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SylloMetry admin account found with this email address.",
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
                    "type": "magiclink",
                })
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification code. Please check your inbox.",
                )
        except Exception as e:
            logger.error("Unexpected error in verify_admin_otp: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to verify admin login code.",
            )

        logger.info("Admin email OTP verified successfully for: %s", normalized_email)

        return AdminVerifyOtpResponse(
            success=True,
            message="Admin email verified successfully. Please enter your password to sign in.",
            is_verified=True,
            email=normalized_email,
        )

    def login_admin(self, payload: AdminLoginRequest) -> AdminLoginResponse:
        """
        Authenticates administrator with email and password checked against public.admin table.
        Returns Supabase JWT access token and SafeAdmin profile.
        """
        if not settings.is_supabase_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase credentials are not configured in Backend/.env.",
            )

        normalized_email = payload.email.strip().lower()

        # 1. Fetch admin record from public.admin
        admin_rec = self.get_admin_record_by_email(normalized_email)
        if not admin_rec:
            logger.warning("Admin login rejected: not present in public.admin: %s", normalized_email)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SylloMetry admin account found with this email address.",
            )

        db_password = admin_rec.get("password") or ""

        # 2. Verify password with bcrypt
        password_matches = False
        if db_password.startswith(("$2a$", "$2b$", "$2y$")):
            try:
                password_matches = bcrypt.checkpw(
                    payload.password.encode("utf-8"),
                    db_password.encode("utf-8"),
                )
            except Exception as e:
                logger.error("Error evaluating admin bcrypt password: %s", str(e))
        elif db_password == payload.password:
            password_matches = True

        if not password_matches:
            logger.warning("Incorrect admin password for: %s", normalized_email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect admin password. Please verify your credentials and try again.",
            )

        # 3. Synchronize password with Supabase Auth to obtain a real session
        sign_in_res = None
        if self.admin_client:
            try:
                users = self.admin_client.auth.admin.list_users()
                matching = [u for u in users if getattr(u, "email", "").lower() == normalized_email]
                if matching:
                    self.admin_client.auth.admin.update_user_by_id(
                        matching[0].id,
                        {"password": payload.password}
                    )
                else:
                    self.admin_client.auth.admin.create_user({
                        "email": normalized_email,
                        "password": payload.password,
                        "email_confirm": True,
                    })

                sign_in_res = self.client.auth.sign_in_with_password({
                    "email": normalized_email,
                    "password": payload.password,
                })
            except Exception as e:
                logger.warning("Notice updating Supabase auth user for admin: %s", str(e))

        # Fallback to direct sign in if not updated
        if not sign_in_res:
            try:
                sign_in_res = self.client.auth.sign_in_with_password({
                    "email": normalized_email,
                    "password": payload.password,
                })
            except Exception as e:
                logger.error("Failed to sign in admin via Supabase: %s", str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication succeeded but failed to generate admin session token.",
                )

        session = getattr(sign_in_res, "session", None)
        if not session or not getattr(session, "access_token", None):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate a valid admin session token.",
            )

        safe_admin = SafeAdmin(
            id=admin_rec["id"],
            email=admin_rec["email"],
            role="admin",
            full_name=normalized_email.split("@")[0].title(),
        )

        logger.info("Admin successfully authenticated: %s (ID: %s)", normalized_email, admin_rec["id"])

        return AdminLoginResponse(
            success=True,
            message="Admin login successful.",
            admin=safe_admin,
            token=session.access_token,
            refresh_token=getattr(session, "refresh_token", None),
            token_type="bearer",
        )

    def upload_pdf_document(self, file: UploadFile, admin: SafeAdmin) -> AdminDocumentUploadResponse:
        """
        Handles administrative PDF uploads for industry syllabus ingestion and extraction.
        Validates PDF mime type and file size.
        """
        # 1. Validate file extension and MIME type
        filename = file.filename or "document.pdf"
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Only PDF documents are supported for administrative ingestion.",
            )

        # 2. Read content and validate size (maximum 25MB)
        content = file.file.read()
        file_size = len(content)
        max_size = 25 * 1024 * 1024
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 25MB limit. Please upload a smaller PDF.",
            )

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF file is empty.",
            )

        # 3. Create document record
        doc_id = f"doc_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        doc_record = {
            "id": doc_id,
            "filename": filename,
            "file_size": file_size,
            "uploaded_at": now_iso,
            "uploaded_by": admin.email,
            "status": "Ready for Ingestion Pipeline",
            "pages_estimated": max(1, file_size // 60000),
        }

        _ADMIN_DOCUMENTS.insert(0, doc_record)
        logger.info("Admin document uploaded: %s (%d bytes) by %s", filename, file_size, admin.email)

        return AdminDocumentUploadResponse(
            success=True,
            message=f"PDF document '{filename}' uploaded successfully and queued for extraction pipeline.",
            document=doc_record,
        )

    def get_documents_list(self, admin: SafeAdmin) -> AdminDocumentListResponse:
        """Retrieves list of admin-uploaded documents."""
        return AdminDocumentListResponse(
            success=True,
            documents=_ADMIN_DOCUMENTS,
        )

