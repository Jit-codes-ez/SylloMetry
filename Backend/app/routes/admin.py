import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.core.security import get_current_admin
from app.core.supabase import get_supabase_admin_client
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
from app.schemas.industry_files import (
    IndustryFileDeleteResponse,
    IndustryFileDownloadResponse,
    IndustryFileListResponse,
    IndustryFileUploadResponse,
)
from app.schemas.industry_documents import (
    AddOccupationRequest,
    AddOccupationResponse,
    BatchSaveOccupationsRequest,
    BatchSaveOccupationsResponse,
    DeleteOccupationResponse,
    DocumentExtractionPreviewResponse,
    DocumentRegistrationRequest,
    DocumentTextPreviewResponse,
    IndustryDocumentItem,
)
from app.schemas.skill_extraction import (
    DeletePendingEvidenceResponse,
    JobStartResponse,
    JobStatusResponse,
    RetryJobResponse,
    SaveSkillsRequest,
    SaveSkillsResponse,
)
from app.schemas.industry_review import (
    ApproveRejectRequest,
    BulkReviewActionRequest,
    FinalApprovalResponse,
    ReviewSessionResponse,
    ReviewSessionSummary,
    SkillReviewItem,
    UpdateEvidenceRequest,
    UpdateSkillRequest,
)
from app.services.admin_service import AdminService
from app.services.industry_storage_service import IndustryStorageService
from app.services.industry_document_service import IndustryDocumentService
from app.services.pdf_extraction_service import (
    get_document_extraction_preview,
    get_document_text_preview,
)
from app.services.occupation_extraction_service import save_document_occupations_batch
from app.services.skill_saving_service import SkillSavingService
from app.services.skill_extraction_service import (
    create_job_record,
    get_job_record,
    run_skill_extraction_job,
    retry_failed_windows_for_job,
    delete_pending_evidence as svc_delete_pending_evidence,
)
from app.services.industry_review_service import IndustryReviewService
from app.services.industry_approval_service import IndustryApprovalService
from app.services.review_session_store import (
    get_latest_job_for_document,
    get_review_session_by_document,
)

logger = logging.getLogger("app.routes.admin")

router = APIRouter(prefix="/api/admin", tags=["Administration Portal"])


def get_admin_service() -> AdminService:
    """Dependency provider for AdminService."""
    return AdminService()


def get_industry_storage_service() -> IndustryStorageService:
    """Dependency provider for IndustryStorageService."""
    return IndustryStorageService()


def get_industry_document_service() -> IndustryDocumentService:
    """Dependency provider for IndustryDocumentService."""
    return IndustryDocumentService()


def get_industry_review_service() -> IndustryReviewService:
    """Dependency provider for IndustryReviewService."""
    return IndustryReviewService()


def get_industry_approval_service() -> IndustryApprovalService:
    """Dependency provider for IndustryApprovalService."""
    return IndustryApprovalService()


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


# ==============================================================================
# Endpoint 10: Upload Industry PDF Document to Supabase Storage & Register Document
# POST /api/admin/industry-files & POST /api/admin/industry-documents/upload
# ==============================================================================
@router.post(
    "/industry-files",
    response_model=IndustryFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Register Industry PDF Document",
    description="Stores original industry dataset PDF in private Supabase Storage bucket and automatically registers it in industry_documents.",
)
@router.post(
    "/industry-documents/upload",
    response_model=IndustryFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Register Industry PDF Document (Direct)",
    description="Stores original industry dataset PDF in private Supabase Storage bucket and automatically registers it in industry_documents.",
)
async def upload_industry_file(
    file: UploadFile = File(..., description="PDF document (max 5 MB)"),
    category: str = Form(..., description="Document category: qualification_file or job_description"),
    current_admin: SafeAdmin = Depends(get_current_admin),
    storage_service: IndustryStorageService = Depends(get_industry_storage_service),
) -> IndustryFileUploadResponse:
    return await storage_service.upload_industry_file(
        file=file,
        category=category,
        current_admin=current_admin,
    )


# ==============================================================================
# Endpoint 11: List Stored Industry Documents
# GET /api/admin/industry-files
# ==============================================================================
@router.get(
    "/industry-files",
    response_model=IndustryFileListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Stored Industry Documents",
    description="Returns stored industry files, filterable by category, newest-first.",
)
async def list_industry_files(
    category: Optional[str] = Query(None, description="Optional category filter"),
    limit: int = Query(20, ge=1, le=100, description="Number of items per page"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_admin: SafeAdmin = Depends(get_current_admin),
    storage_service: IndustryStorageService = Depends(get_industry_storage_service),
) -> IndustryFileListResponse:
    return storage_service.list_industry_files(
        category=category,
        limit=limit,
        offset=offset,
    )


# ==============================================================================
# Endpoint 12: Get 60-Second Temporary Signed Download URL
# GET /api/admin/industry-files/download
# ==============================================================================
@router.get(
    "/industry-files/download",
    response_model=IndustryFileDownloadResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Temporary Signed Download URL",
    description="Returns a 60-second temporary signed URL to download a stored industry PDF.",
)
async def get_industry_file_download_url(
    storage_path: str = Query(..., description="Storage path ({category}/{filename})"),
    current_admin: SafeAdmin = Depends(get_current_admin),
    storage_service: IndustryStorageService = Depends(get_industry_storage_service),
) -> IndustryFileDownloadResponse:
    return storage_service.get_signed_download_url(
        storage_path=storage_path,
        current_admin=current_admin,
    )


# ==============================================================================
# Endpoint 13: Delete Stored Industry Document
# DELETE /api/admin/industry-files
# ==============================================================================
@router.delete(
    "/industry-files",
    response_model=IndustryFileDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete Stored Industry Document",
    description="Deletes an industry document from private Supabase Storage.",
)
async def delete_industry_file(
    storage_path: str = Query(..., description="Storage path ({category}/{filename}) to delete"),
    current_admin: SafeAdmin = Depends(get_current_admin),
    storage_service: IndustryStorageService = Depends(get_industry_storage_service),
) -> IndustryFileDeleteResponse:
    return storage_service.delete_industry_file(
        storage_path=storage_path,
        current_admin=current_admin,
    )


# ==============================================================================
# Endpoint 14: Get Stored Files Not Yet Registered in Database
# GET /api/admin/industry-documents/unregistered
# ==============================================================================
@router.get(
    "/industry-documents/unregistered",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Unregistered Stored Files",
    description="Returns files in Supabase Storage whose storage_path is not registered in industry_documents.",
)
async def get_unregistered_industry_files(
    current_admin: SafeAdmin = Depends(get_current_admin),
    doc_service: IndustryDocumentService = Depends(get_industry_document_service),
) -> List[Dict[str, Any]]:
    return doc_service.get_unregistered_files()


# ==============================================================================
# Endpoint 15: Register Uploaded PDF Document in Database
# POST /api/admin/industry-documents
# ==============================================================================
@router.post(
    "/industry-documents",
    response_model=IndustryDocumentItem,
    status_code=status.HTTP_201_CREATED,
    summary="Register Industry Document",
    description="Inserts a row into industry_documents after verifying bucket storage path exists.",
)
async def register_industry_document(
    payload: DocumentRegistrationRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    doc_service: IndustryDocumentService = Depends(get_industry_document_service),
) -> IndustryDocumentItem:
    return doc_service.register_document(
        payload=payload,
        current_admin=current_admin,
    )


# ==============================================================================
# Endpoint 16: List All Registered Industry Documents with Occupations
# GET /api/admin/industry-documents
# ==============================================================================
@router.get(
    "/industry-documents",
    response_model=List[IndustryDocumentItem],
    status_code=status.HTTP_200_OK,
    summary="List Registered Industry Documents",
    description="Returns registered industry documents along with linked occupations.",
)
async def get_registered_industry_documents(
    current_admin: SafeAdmin = Depends(get_current_admin),
    doc_service: IndustryDocumentService = Depends(get_industry_document_service),
) -> List[IndustryDocumentItem]:
    return doc_service.get_registered_documents()


# ==============================================================================
# Endpoint 17: Link Occupation to Registered Industry Document
# POST /api/admin/industry-documents/{document_id}/occupations
# ==============================================================================
@router.post(
    "/industry-documents/{document_id}/occupations",
    response_model=AddOccupationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Link Occupation to Industry Document",
    description="Finds or creates an occupation and links it to the document via document_occupations.",
)
async def link_occupation_to_document(
    document_id: int,
    payload: AddOccupationRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    doc_service: IndustryDocumentService = Depends(get_industry_document_service),
) -> AddOccupationResponse:
    return doc_service.link_occupation(
        document_id=document_id,
        payload=payload,
        current_admin=current_admin,
    )


# ==============================================================================
# Endpoint 18: Unlink Occupation from Registered Industry Document
# DELETE /api/admin/industry-documents/{document_id}/occupations/{occupation_id}
# ==============================================================================
@router.delete(
    "/industry-documents/{document_id}/occupations/{occupation_id}",
    response_model=DeleteOccupationResponse,
    status_code=status.HTTP_200_OK,
    summary="Unlink Occupation from Document",
    description="Removes an occupation link from document_occupations.",
)
async def unlink_occupation_from_document(
    document_id: int,
    occupation_id: int,
    relationship_type: Optional[str] = Query(None, description="Optional relationship_type filter"),
    current_admin: SafeAdmin = Depends(get_current_admin),
    doc_service: IndustryDocumentService = Depends(get_industry_document_service),
) -> DeleteOccupationResponse:
    return doc_service.unlink_occupation(
        document_id=document_id,
        occupation_id=occupation_id,
        relationship_type=relationship_type,
        current_admin=current_admin,
    )


# ==============================================================================
# Endpoint 19: Preview Extracted Text from Industry PDF
# GET /api/admin/industry-documents/{document_id}/text-preview
# ==============================================================================
@router.get(
    "/industry-documents/{document_id}/text-preview",
    response_model=DocumentTextPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview Extracted Text with PyMuPDF",
    description="Extracts clean text per page from PDF, removes headers/footers, and flags low text.",
)
async def preview_document_text(
    document_id: int,
    page: Optional[int] = Query(None, ge=1, description="Optional specific page number to view full text"),
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> DocumentTextPreviewResponse:
    return get_document_text_preview(
        document_id=document_id,
        page=page,
    )


# ==============================================================================
# Endpoint 19B: Preview Complete Extracted Text and Occupations (Part 3)
# GET /api/admin/industry-documents/{document_id}/extraction-preview
# POST /api/admin/industry-documents/{document_id}/extraction-preview
# ==============================================================================
@router.get(
    "/industry-documents/{document_id}/extraction-preview",
    response_model=DocumentExtractionPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview Complete Extracted Text & Occupations",
    description="Extracts page-wise text with PyMuPDF and deterministic occupations without an LLM.",
)
@router.post(
    "/industry-documents/{document_id}/extraction-preview",
    response_model=DocumentExtractionPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview Complete Extracted Text & Occupations (POST)",
    description="Extracts page-wise text with PyMuPDF and deterministic occupations without an LLM.",
)
async def preview_extraction(
    document_id: int,
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> DocumentExtractionPreviewResponse:
    return get_document_extraction_preview(document_id=document_id)


# ==============================================================================
# Endpoint 19C: Save and Associate Edited Occupations (Part 3)
# POST /api/admin/industry-documents/{document_id}/occupations/save-batch
# ==============================================================================
@router.post(
    "/industry-documents/{document_id}/occupations/save-batch",
    response_model=BatchSaveOccupationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Save & Associate Occupations (Batch)",
    description="Atomically validates, upserts into occupations, and associates with document_occupations using aligned_nco or target_role.",
)
async def save_occupations_batch(
    document_id: int,
    payload: BatchSaveOccupationsRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> BatchSaveOccupationsResponse:
    return save_document_occupations_batch(
        document_id=document_id,
        payload=payload,
        current_admin=current_admin,
    )


# ==============================================================================
# Endpoint 20: Start Skill Extraction Background Job
# POST /api/admin/industry-documents/{document_id}/extract-skills
# ==============================================================================
@router.post(
    "/industry-documents/{document_id}/extract-skills",
    response_model=JobStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Initiate LLM Skill Extraction Job",
    description="Starts an asynchronous job extracting technical skills with Gemini in 2-page windows.",
)
async def extract_skills(
    document_id: int,
    background_tasks: BackgroundTasks,
    dry_run: bool = Query(False, description="When true, executes LLM and validation without creating review session"),
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> JobStartResponse:
    admin_client = get_supabase_admin_client()
    if not admin_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database service unavailable.",
        )

    # 1. Verify that the document exists and retrieve storage_path
    doc_res = (
        admin_client.table("industry_documents")
        .select("document_id, document_name, document_type, storage_path")
        .eq("document_id", document_id)
        .limit(1)
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Industry document with ID {document_id} not found.",
        )

    # 2. Verify that occupation submission has succeeded
    doc_occ_res = (
        admin_client.table("document_occupations")
        .select("id")
        .eq("document_id", document_id)
        .limit(1)
        .execute()
    )
    if not doc_occ_res.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Occupation submission is required before extracting skills. Please review and submit occupations first.",
        )

    # 3. Start background skill extraction job
    job_id = str(uuid.uuid4())
    create_job_record(job_id=job_id, document_id=document_id, dry_run=dry_run, admin_email=current_admin.email)
    background_tasks.add_task(
        run_skill_extraction_job,
        job_id=job_id,
        document_id=document_id,
        dry_run=dry_run,
        admin_email=current_admin.email,
    )
    return JobStartResponse(
        job_id=job_id,
        status="running",
        document_id=document_id,
        dry_run=dry_run,
        message=f"Skill extraction job initiated in background ({'DRY RUN' if dry_run else 'FOR REVIEW'}).",
    )


# ==============================================================================
# Endpoint 21: Get Skill Extraction Job Status
# GET /api/admin/extraction-jobs/{job_id}
# ==============================================================================
@router.get(
    "/extraction-jobs/{job_id}",
    response_model=JobStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Poll Skill Extraction Job Status",
    description="Retrieves current progress, status, and final extraction summary of a background job.",
)
async def get_extraction_job_status(
    job_id: str,
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> JobStatusResponse:
    job = get_job_record(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extraction job '{job_id}' not found.",
        )
    return JobStatusResponse(**job)


# ==============================================================================
# Endpoint 21B: Save Reviewed Skills and Evidence (Part 5)
# POST /api/admin/industry-documents/{document_id}/save-skills
# ==============================================================================
@router.post(
    "/industry-documents/{document_id}/save-skills",
    response_model=SaveSkillsResponse,
    status_code=status.HTTP_200_OK,
    summary="Save Reviewed Skills & Evidence (Part 5)",
    description="Transactionally persists administrator-reviewed skills, reuses canonical skills, merges aliases, and links supporting evidence with duplicate prevention.",
)
async def save_reviewed_skills(
    document_id: int,
    payload: SaveSkillsRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> SaveSkillsResponse:
    saving_service = SkillSavingService()
    return saving_service.save_document_skills(
        document_id=document_id,
        skills=payload.skills,
        current_admin=current_admin,
    )


# ==============================================================================
# Endpoint 22: Delete Pending Evidence for Document
# DELETE /api/admin/industry-documents/{document_id}/pending-evidence
# ==============================================================================
@router.delete(
    "/industry-documents/{document_id}/pending-evidence",
    response_model=DeletePendingEvidenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete Pending Skill Evidence",
    description="Deletes ONLY skill evidence rows for the document with validation_status = 'pending'. Leaves verified rows intact.",
)
async def delete_pending_evidence_endpoint(
    document_id: int,
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> DeletePendingEvidenceResponse:
    try:
        deleted_count = svc_delete_pending_evidence(document_id)
        return DeletePendingEvidenceResponse(
            success=True,
            message=f"Successfully deleted {deleted_count} pending skill evidence row(s).",
            deleted_count=deleted_count,
            document_id=document_id,
        )
    except Exception as e:
        logger.exception("Failed to delete pending evidence for document %d: %s", document_id, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete pending evidence: {str(e)}",
        )


# ==============================================================================
# Endpoint 23: Get Document Extraction & Review Session Status
# GET /api/admin/industry-documents/{document_id}/extraction-status
# ==============================================================================
@router.get(
    "/industry-documents/{document_id}/extraction-status",
    status_code=status.HTTP_200_OK,
    summary="Get Document Extraction & Review Status",
    description="Returns the latest extraction job and review session state for a document.",
)
async def get_document_extraction_status(
    document_id: int,
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> Dict[str, Any]:
    latest_job = get_latest_job_for_document(document_id)
    review_session = get_review_session_by_document(document_id)
    return {
        "document_id": document_id,
        "latest_job": latest_job,
        "has_review_session": bool(review_session),
        "review_session_status": review_session.get("status") if review_session else None,
        "session_id": review_session.get("session_id") if review_session else None,
    }


# ==============================================================================
# Endpoint 24: Retry Failed Extraction Windows
# POST /api/admin/extraction-jobs/{job_id}/retry-failed
# ==============================================================================
@router.post(
    "/extraction-jobs/{job_id}/retry-failed",
    status_code=status.HTTP_200_OK,
    summary="Retry Failed Extraction Windows",
    description="Retries only the failed extraction windows of a job without duplicating evidence.",
)
async def retry_failed_windows_endpoint(
    job_id: str,
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> Dict[str, Any]:
    try:
        return retry_failed_windows_for_job(job_id=job_id, admin_email=current_admin.email)
    except Exception as e:
        logger.exception("Failed to retry windows for job %s: %s", job_id, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retry extraction windows: {str(e)}",
        )


# ==============================================================================
# Endpoint 25: Get or Create Review Session for Document
# GET /api/admin/industry-documents/{document_id}/review-session
# ==============================================================================
@router.get(
    "/industry-documents/{document_id}/review-session",
    response_model=ReviewSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Persistent Review Session",
    description="Retrieves the active review session for a document, initializing from the latest extraction if needed.",
)
async def get_document_review_session(
    document_id: int,
    current_admin: SafeAdmin = Depends(get_current_admin),
    review_svc: IndustryReviewService = Depends(get_industry_review_service),
) -> ReviewSessionResponse:
    session = review_svc.get_review_session(document_id)
    if not session:
        latest_job = get_latest_job_for_document(document_id)
        if latest_job and latest_job.get("extraction_data"):
            session = review_svc.create_or_update_session_from_extraction(
                document_id=document_id,
                extraction_items=latest_job["extraction_data"],
                admin_email=current_admin.email,
                job_id=latest_job["job_id"],
                extraction_status=latest_job["status"],
                failed_windows=latest_job.get("failed_windows"),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No review session or completed extraction found for document ID {document_id}.",
            )
    return session


# ==============================================================================
# Endpoint 25b: Get Review Session by ID
# GET /api/admin/review-sessions/{session_id}
# ==============================================================================
@router.get(
    "/review-sessions/{session_id}",
    response_model=ReviewSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Review Session by ID",
)
async def get_review_session_by_id_endpoint(
    session_id: str,
    current_admin: SafeAdmin = Depends(get_current_admin),
) -> ReviewSessionResponse:
    from app.services.review_session_store import get_review_session_by_id
    session_data = get_review_session_by_id(session_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Review session {session_id} not found.")
    return ReviewSessionResponse(**session_data)


# ==============================================================================
# Endpoint 26: Update Extracted Skill Details in Review
# PUT /api/admin/review-sessions/{session_id}/skills/{skill_id}
# ==============================================================================
@router.put(
    "/review-sessions/{session_id}/skills/{skill_id}",
    response_model=ReviewSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Skill in Review Session",
)
async def update_skill_in_session(
    session_id: str,
    skill_id: str,
    payload: UpdateSkillRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    review_svc: IndustryReviewService = Depends(get_industry_review_service),
) -> ReviewSessionResponse:
    try:
        return review_svc.update_skill(session_id=session_id, skill_id=skill_id, update=payload)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.exception("Error updating skill: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# Endpoint 27: Update Evidence Details in Review
# PUT /api/admin/review-sessions/{session_id}/evidence/{evidence_id}
# ==============================================================================
@router.put(
    "/review-sessions/{session_id}/evidence/{evidence_id}",
    response_model=ReviewSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Evidence in Review Session",
)
async def update_evidence_in_session(
    session_id: str,
    evidence_id: str,
    payload: UpdateEvidenceRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    review_svc: IndustryReviewService = Depends(get_industry_review_service),
) -> ReviewSessionResponse:
    try:
        return review_svc.update_evidence(session_id=session_id, evidence_id=evidence_id, update=payload)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.exception("Error updating evidence: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# Endpoint 28: Set Skill Approval Status
# POST /api/admin/review-sessions/{session_id}/skills/{skill_id}/status
# ==============================================================================
@router.post(
    "/review-sessions/{session_id}/skills/{skill_id}/status",
    response_model=ReviewSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Set Skill Review Status",
)
async def set_skill_status_endpoint(
    session_id: str,
    skill_id: str,
    payload: ApproveRejectRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    review_svc: IndustryReviewService = Depends(get_industry_review_service),
) -> ReviewSessionResponse:
    try:
        return review_svc.set_skill_status(session_id=session_id, skill_id=skill_id, status=payload.status)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.exception("Error setting skill status: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# Endpoint 29: Set Evidence Approval Status
# POST /api/admin/review-sessions/{session_id}/evidence/{evidence_id}/status
# ==============================================================================
@router.post(
    "/review-sessions/{session_id}/evidence/{evidence_id}/status",
    response_model=ReviewSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Set Evidence Review Status",
)
async def set_evidence_status_endpoint(
    session_id: str,
    evidence_id: str,
    payload: ApproveRejectRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    review_svc: IndustryReviewService = Depends(get_industry_review_service),
) -> ReviewSessionResponse:
    try:
        return review_svc.set_evidence_status(session_id=session_id, evidence_id=evidence_id, status=payload.status)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.exception("Error setting evidence status: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# Endpoint 30: Apply Bulk Review Actions
# POST /api/admin/review-sessions/{session_id}/bulk-action
# ==============================================================================
@router.post(
    "/review-sessions/{session_id}/bulk-action",
    response_model=ReviewSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Bulk Review Action",
)
async def bulk_review_action_endpoint(
    session_id: str,
    payload: BulkReviewActionRequest,
    current_admin: SafeAdmin = Depends(get_current_admin),
    review_svc: IndustryReviewService = Depends(get_industry_review_service),
) -> ReviewSessionResponse:
    try:
        return review_svc.apply_bulk_action(session_id=session_id, payload=payload)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.exception("Error applying bulk action: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# Endpoint 31: Get Review Session Summary
# GET /api/admin/review-sessions/{session_id}/summary
# ==============================================================================
@router.get(
    "/review-sessions/{session_id}/summary",
    response_model=ReviewSessionSummary,
    status_code=status.HTTP_200_OK,
    summary="Get Review Session Summary & Blocking Reasons",
)
async def get_session_summary_endpoint(
    session_id: str,
    current_admin: SafeAdmin = Depends(get_current_admin),
    review_svc: IndustryReviewService = Depends(get_industry_review_service),
) -> ReviewSessionSummary:
    from app.services.review_session_store import get_review_session_by_id
    session_data = get_review_session_by_id(session_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review session not found.")
    skills = [SkillReviewItem(**s) for s in session_data.get("skills", [])]
    return review_svc.calculate_summary(skills)


# ==============================================================================
# Endpoint 32: Confirm & Approve Dataset (Atomic Permanent DB Insertion)
# POST /api/admin/review-sessions/{session_id}/approve-and-save
# ==============================================================================
@router.post(
    "/review-sessions/{session_id}/approve-and-save",
    response_model=FinalApprovalResponse,
    status_code=status.HTTP_200_OK,
    summary="Approve & Save Dataset into Permanent Database",
    description="Validates all review decisions and atomically commits approved canonical skills and verified evidence into permanent D2 tables.",
)
async def approve_and_save_dataset_endpoint(
    session_id: str,
    current_admin: SafeAdmin = Depends(get_current_admin),
    approval_svc: IndustryApprovalService = Depends(get_industry_approval_service),
) -> FinalApprovalResponse:
    try:
        return approval_svc.approve_and_save_dataset(
            session_id=session_id,
            admin_email=current_admin.email,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.exception("Permanent approval commit failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Approval database commit failed: {str(e)}",
        )


# ==============================================================================
# Endpoint 33: Get PDF View / Download URL
# GET /api/admin/industry-documents/{document_id}/pdf-url
# ==============================================================================
@router.get(
    "/industry-documents/{document_id}/pdf-url",
    status_code=status.HTTP_200_OK,
    summary="Get Signed URL for PDF Viewer",
)
async def get_document_pdf_url(
    document_id: int,
    current_admin: SafeAdmin = Depends(get_current_admin),
    review_svc: IndustryReviewService = Depends(get_industry_review_service),
) -> Dict[str, Any]:
    doc_meta = review_svc.get_document_meta(document_id)
    pdf_url = review_svc.get_temporary_pdf_url(doc_meta.get("storage_path"))
    if not pdf_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF storage file not found.")
    return {"document_id": document_id, "pdf_url": pdf_url}







