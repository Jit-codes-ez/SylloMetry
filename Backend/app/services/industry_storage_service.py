import logging
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.supabase import get_supabase_admin_client
from app.schemas.admin import SafeAdmin
from app.schemas.industry_files import (
    ALLOWED_INDUSTRY_CATEGORIES,
    IndustryFileDeleteResponse,
    IndustryFileDownloadResponse,
    IndustryFileItem,
    IndustryFileListResponse,
    IndustryFileUploadResponse,
)

logger = logging.getLogger("app.services.industry_storage")

# Maximum allowed file size: 5 MB (5 * 1024 * 1024 bytes)
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
PDF_MAGIC_NUMBER = b"%PDF-"


class IndustryStorageService:
    """
    Manages private Supabase Storage operations for industry PDF documents.
    All operations use the service-role client and enforce admin authorization,
    category allowlisting, file validation, path safety, and structured audit logging.
    """

    def __init__(self):
        self.bucket_name = settings.SUPABASE_INDUSTRY_BUCKET

    def _get_storage(self):
        """Returns the private bucket storage client using service-role credentials."""
        admin_client = get_supabase_admin_client()
        if not admin_client:
            logger.error("Supabase admin client unavailable for storage operations.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Backend storage configuration error. Admin client unavailable.",
            )
        return admin_client.storage.from_(self.bucket_name)

    @staticmethod
    def sanitize_filename(filename: str, max_length: int = 100) -> str:
        """
        Sanitizes original filename keeping only letters, digits, dots, hyphens, and underscores.
        Replaces any other character with an underscore, limits length, and guarantees .pdf extension.
        """
        base = Path(filename).name
        # Keep letters, digits, dots, hyphens, underscores; replace everything else with '_'
        sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
        # Collapse repeated underscores
        sanitized = re.sub(r"_+", "_", sanitized)

        if not sanitized.lower().endswith(".pdf"):
            sanitized = f"{sanitized}.pdf"

        # Truncate length while preserving the .pdf extension
        if len(sanitized) > max_length:
            stem = sanitized[:-4][: max_length - 4].rstrip("._-")
            sanitized = f"{stem}.pdf"

        # Safe fallback
        if sanitized.lower() in ("", ".pdf", "_.pdf"):
            sanitized = "industry_document.pdf"

        return sanitized

    @staticmethod
    def extract_display_name(filename: str) -> str:
        """
        Extracts original display filename by stripping the {uuid}_ prefix.
        """
        parts = filename.split("_", 1)
        if len(parts) > 1 and parts[1]:
            return parts[1]
        return filename

    @staticmethod
    def validate_storage_path(storage_path: str) -> tuple[str, str]:
        """
        Validates that storage_path:
        - Does not contain path traversal (..)
        - Does not contain leading or back slashes
        - Exactly matches {category}/{filename} where category is in allowlist
        - Filename ends with .pdf
        Returns (category, filename).
        """
        if not storage_path or not isinstance(storage_path, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Storage path is required.",
            )

        clean_path = storage_path.strip()

        # Reject path traversal, leading slashes, and Windows path separators
        if ".." in clean_path or clean_path.startswith("/") or clean_path.startswith("\\") or "\\" in clean_path:
            logger.warning("Rejected suspicious storage path traversal attempt: %s", clean_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid storage path format.",
            )

        parts = clean_path.split("/")
        if len(parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Storage path must be in {category}/{filename} format.",
            )

        category, filename = parts[0], parts[1]

        if category not in ALLOWED_INDUSTRY_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category '{category}'. Must be one of: {', '.join(ALLOWED_INDUSTRY_CATEGORIES)}.",
            )

        if not filename.lower().endswith(".pdf") or len(filename) <= 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target file in storage path must be a .pdf document.",
            )

        return category, filename

    async def upload_industry_file(
        self,
        file: UploadFile,
        category: str,
        current_admin: SafeAdmin,
    ) -> IndustryFileUploadResponse:
        """
        Uploads an industry PDF to Supabase Storage with strict validations:
        - Category must belong to the allowlist
        - Extension is .pdf
        - MIME type is application/pdf
        - File size <= 5 MB
        - Non-empty and starts with %PDF- magic signature
        - Upload with upsert=False and unique UUID prefix
        """
        # 1. Category validation
        category = category.strip().lower() if category else ""
        if category not in ALLOWED_INDUSTRY_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category '{category}'. Must be one of: {', '.join(ALLOWED_INDUSTRY_CATEGORIES)}.",
            )

        # 2. Extension validation
        original_filename = file.filename or "uploaded_document.pdf"
        if not original_filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Only PDF files (.pdf) are allowed.",
            )

        # 3. MIME type validation
        content_type = (file.content_type or "").strip().lower()
        if content_type != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file MIME type '{content_type}'. Expected 'application/pdf'.",
            )

        # 4. Read content & validate size
        file_bytes = await file.read()
        file_size = len(file_bytes)

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF file is empty (0 bytes).",
            )

        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size ({file_size / (1024*1024):.2f} MB) exceeds maximum allowed limit of 5 MB.",
            )

        # 5. Magic signature validation
        if not file_bytes.startswith(PDF_MAGIC_NUMBER):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF content. The file does not start with the '%PDF-' magic header.",
            )

        # 6. Sanitize filename & generate unique object path
        sanitized_display_name = self.sanitize_filename(original_filename)
        unique_id = uuid.uuid4().hex
        object_filename = f"{unique_id}_{sanitized_display_name}"
        storage_path = f"{category}/{object_filename}"

        # 7. Upload to Supabase Storage with overwrite disabled
        storage = self._get_storage()
        try:
            storage.upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": "application/pdf", "upsert": "false"},
            )
        except Exception as e:
            err_str = str(e)
            logger.error("Supabase storage upload error for path '%s': %s", storage_path, err_str)
            if "Duplicate" in err_str or "already exists" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A file with this identifier already exists in storage.",
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload document to storage: {err_str}",
            )

        now_iso = datetime.utcnow().isoformat() + "Z"

        # Structured audit log: admin identifier, action, storage path, timestamp
        logger.info(
            "AUDIT: Admin id=%s email=%s action=upload path=%s size=%d timestamp=%s",
            current_admin.id,
            current_admin.email,
            storage_path,
            file_size,
            now_iso,
        )

        item = IndustryFileItem(
            storage_path=storage_path,
            display_name=sanitized_display_name,
            category=category,
            size_bytes=file_size,
            upload_date=now_iso,
            content_type="application/pdf",
        )

        return IndustryFileUploadResponse(
            success=True,
            message=f"File '{sanitized_display_name}' uploaded successfully to category '{category}'.",
            file=item,
        )

    def list_industry_files(
        self,
        category: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> IndustryFileListResponse:
        """
        Lists stored industry files, optionally filtered by category, sorted newest-first.
        Since Supabase Storage returns folders and files separately, lists each category prefix.
        Calculates total count and total size across all matching files.
        """
        storage = self._get_storage()

        if category:
            cat_clean = category.strip().lower()
            if cat_clean not in ALLOWED_INDUSTRY_CATEGORIES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid category '{cat_clean}'. Must be one of: {', '.join(ALLOWED_INDUSTRY_CATEGORIES)}.",
                )
            categories_to_query = [cat_clean]
        else:
            categories_to_query = list(ALLOWED_INDUSTRY_CATEGORIES)

        all_items: List[IndustryFileItem] = []

        for cat in categories_to_query:
            try:
                # List files under category folder
                raw_items = storage.list(cat)
            except Exception as e:
                logger.warning("Error listing files for category '%s': %s", cat, str(e))
                continue

            for raw in raw_items:
                # Exclude folder placeholders or items without metadata/name
                name = raw.get("name")
                if not name or not name.lower().endswith(".pdf"):
                    continue

                metadata = raw.get("metadata") or {}
                size = metadata.get("size") or raw.get("size") or 0
                created_at = raw.get("created_at") or raw.get("updated_at")

                storage_path = f"{cat}/{name}"
                display_name = self.extract_display_name(name)

                all_items.append(
                    IndustryFileItem(
                        storage_path=storage_path,
                        display_name=display_name,
                        category=cat,
                        size_bytes=int(size),
                        upload_date=created_at,
                        content_type=metadata.get("mimetype") or "application/pdf",
                    )
                )

        # Sort newest-first (descending by upload_date)
        all_items.sort(key=lambda x: x.upload_date or "", reverse=True)

        total_count = len(all_items)
        total_size_bytes = sum(item.size_bytes for item in all_items)

        # Apply pagination
        paginated_files = all_items[offset : offset + limit]

        return IndustryFileListResponse(
            success=True,
            files=paginated_files,
            total_count=total_count,
            total_size_bytes=total_size_bytes,
            limit=limit,
            offset=offset,
        )

    def get_signed_download_url(
        self,
        storage_path: str,
        current_admin: SafeAdmin,
    ) -> IndustryFileDownloadResponse:
        """
        Generates a 60-second temporary signed download URL for an industry PDF.
        Sets download filename to the original display name.
        """
        _, filename = self.validate_storage_path(storage_path)
        display_name = self.extract_display_name(filename)

        storage = self._get_storage()
        try:
            # 60-second signed URL with download filename
            signed_res = storage.create_signed_url(
                path=storage_path,
                expires_in=60,
                options={"download": display_name},
            )
        except Exception as e:
            logger.error("Error creating signed download URL for path '%s': %s", storage_path, str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate secure signed download URL.",
            )

        url = signed_res.get("signedURL") or signed_res.get("signedUrl")
        if not url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Signed URL generation failed to return a valid URL.",
            )

        now_iso = datetime.utcnow().isoformat() + "Z"

        # Structured audit log
        logger.info(
            "AUDIT: Admin id=%s email=%s action=download path=%s timestamp=%s",
            current_admin.id,
            current_admin.email,
            storage_path,
            now_iso,
        )

        return IndustryFileDownloadResponse(
            success=True,
            signed_url=url,
            storage_path=storage_path,
            display_name=display_name,
            expires_in_seconds=60,
        )

    def delete_industry_file(
        self,
        storage_path: str,
        current_admin: SafeAdmin,
    ) -> IndustryFileDeleteResponse:
        """
        Deletes an industry PDF document from private Supabase Storage.
        Requires admin privileges, safe path validation, and creates audit log.
        Refuses (409 Conflict) if the storage_path is registered in industry_documents.
        """
        self.validate_storage_path(storage_path)

        # Refuse deletion if file is registered in public.industry_documents
        admin_client = get_supabase_admin_client()
        if admin_client:
            registered_res = (
                admin_client.table("industry_documents")
                .select("document_id, document_name")
                .eq("storage_path", storage_path)
                .limit(1)
                .execute()
            )
            if registered_res.data and len(registered_res.data) > 0:
                doc_info = registered_res.data[0]
                logger.warning(
                    "Blocked deletion of registered storage file '%s' (Document ID: %s, Name: '%s')",
                    storage_path,
                    doc_info.get("document_id"),
                    doc_info.get("document_name"),
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot delete file '{storage_path}': It is registered as industry document ID {doc_info.get('document_id')} ('{doc_info.get('document_name')}').",
                )

        storage = self._get_storage()
        try:
            storage.remove([storage_path])
        except Exception as e:
            logger.error("Error deleting file at path '%s': %s", storage_path, str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete file from storage: {str(e)}",
            )

        now_iso = datetime.utcnow().isoformat() + "Z"

        # Structured audit log
        logger.info(
            "AUDIT: Admin id=%s email=%s action=delete path=%s timestamp=%s",
            current_admin.id,
            current_admin.email,
            storage_path,
            now_iso,
        )

        return IndustryFileDeleteResponse(
            success=True,
            message="Industry document deleted successfully.",
            storage_path=storage_path,
        )
