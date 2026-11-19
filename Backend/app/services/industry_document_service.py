import logging
import re
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.supabase import get_supabase_admin_client
from app.schemas.admin import SafeAdmin
from app.schemas.industry_documents import (
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_RELATIONSHIP_TYPES,
    AddOccupationRequest,
    AddOccupationResponse,
    DeleteOccupationResponse,
    DocumentRegistrationRequest,
    IndustryDocumentItem,
    LinkedOccupationItem,
)
from app.services.industry_storage_service import IndustryStorageService

logger = logging.getLogger("app.services.industry_document")


class IndustryDocumentService:
    """
    Manages industry document registration, occupation links,
    and storage synchronization against public.industry_documents,
    public.occupations, and public.document_occupations.
    """

    def __init__(self):
        self.storage_service = IndustryStorageService()
        self.bucket_name = settings.SUPABASE_INDUSTRY_BUCKET

    def _get_client(self):
        client = get_supabase_admin_client()
        if not client:
            logger.error("Supabase admin client unavailable in IndustryDocumentService.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database client unavailable.",
            )
        return client

    def get_unregistered_files(self) -> List[Dict[str, Any]]:
        """
        Returns stored files in Supabase bucket whose storage_path is NOT
        present in public.industry_documents.
        """
        client = self._get_client()

        # 1. Fetch all registered storage paths
        doc_res = client.table("industry_documents").select("storage_path").execute()
        registered_paths = {row["storage_path"] for row in (doc_res.data or []) if row.get("storage_path")}

        # 2. Fetch all stored files in bucket
        files_res = self.storage_service.list_industry_files(limit=1000, offset=0)
        stored_files = files_res.files

        # 3. Filter for unregistered files only
        unregistered = [
            f.model_dump() if hasattr(f, "model_dump") else f.dict()
            for f in stored_files
            if f.storage_path not in registered_paths
        ]

        return unregistered

    def register_document(
        self,
        payload: DocumentRegistrationRequest,
        current_admin: SafeAdmin,
    ) -> IndustryDocumentItem:
        """
        Registers an uploaded PDF into public.industry_documents.
        - Validates document_type against allowlist
        - Verifies storage_path exists in private bucket
        - Enforces unique storage_path constraint (409 Conflict if already registered)
        """
        client = self._get_client()

        doc_type = payload.document_type.strip().lower()
        if doc_type not in ALLOWED_DOCUMENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document_type '{doc_type}'. Must be one of: {', '.join(ALLOWED_DOCUMENT_TYPES)}.",
            )

        storage_path = payload.storage_path.strip()

        # 1. Validate storage path syntax
        category, filename = self.storage_service.validate_storage_path(storage_path)

        # 2. Check if already registered
        existing = client.table("industry_documents").select("document_id, document_name").eq("storage_path", storage_path).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Document with storage path '{storage_path}' is already registered (ID: {existing.data[0]['document_id']}).",
            )

        # 3. Verify file exists in bucket
        storage = client.storage.from_(self.bucket_name)
        try:
            files_in_cat = storage.list(category)
            file_exists = any(item.get("name") == filename for item in files_in_cat)
        except Exception as e:
            logger.error("Error inspecting bucket for file existence '%s': %s", storage_path, str(e))
            file_exists = False

        if not file_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Storage path '{storage_path}' does not exist in bucket '{self.bucket_name}'.",
            )

        # 4. Insert into public.industry_documents
        clean_doc_name = re.sub(r"(?i)(\.pdf)+$", "", payload.document_name.strip()).strip("._-")
        if not clean_doc_name:
            clean_doc_name = "document"
        clean_doc_name = f"{clean_doc_name}.pdf"

        insert_data = {
            "document_name": clean_doc_name,
            "document_type": doc_type,
            "issuing_organization": payload.issuing_organization.strip() if payload.issuing_organization else None,
            "source_url": payload.source_url.strip() if payload.source_url else None,
            "published_date": payload.published_date.strip() if payload.published_date else None,
            "storage_path": storage_path,
        }

        try:
            insert_res = client.table("industry_documents").insert(insert_data).execute()
        except Exception as e:
            err_str = str(e)
            logger.error("Error inserting industry document: %s", err_str)
            if "duplicate" in err_str.lower() or "unique" in err_str.lower() or "23505" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A document with storage path '{storage_path}' is already registered.",
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to register industry document: {err_str}",
            )

        if not insert_res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Insert failed to return created document row.",
            )

        created_row = insert_res.data[0]
        logger.info(
            "AUDIT: Admin id=%s email=%s action=register_document document_id=%s path=%s",
            current_admin.id,
            current_admin.email,
            created_row["document_id"],
            storage_path,
        )

        return IndustryDocumentItem(
            document_id=created_row["document_id"],
            document_name=created_row["document_name"],
            document_type=created_row["document_type"],
            issuing_organization=created_row.get("issuing_organization"),
            source_url=created_row.get("source_url"),
            published_date=created_row.get("published_date"),
            storage_path=created_row["storage_path"],
            occupations=[],
        )

    def get_registered_documents(self) -> List[IndustryDocumentItem]:
        """
        Retrieves all registered industry documents with their linked occupations.
        """
        client = self._get_client()

        # 1. Fetch documents
        docs_res = client.table("industry_documents").select("*").order("document_id", desc=True).execute()
        docs = docs_res.data or []
        if not docs:
            return []

        # 2. Fetch linked occupations
        try:
            links_res = (
                client.table("document_occupations")
                .select("id, document_id, occupation_code, relationship_type, occupations(occupation_code, occupation_name)")
                .execute()
            )
            links = links_res.data or []
        except Exception as e:
            logger.warning("Error fetching linked occupations: %s", str(e))
            links = []

        # Map occupations by document_id
        occupations_by_doc: Dict[int, List[LinkedOccupationItem]] = {}
        for link in links:
            d_id = link.get("document_id")
            occ_obj = link.get("occupations") or {}
            occ_code = link.get("occupation_code") or (occ_obj.get("occupation_code") if isinstance(occ_obj, dict) else "") or ""
            occ_name = (occ_obj.get("occupation_name") if isinstance(occ_obj, dict) else "") or ""

            item = LinkedOccupationItem(
                id=link["id"],
                occupation_code=str(occ_code),
                occupation_name=str(occ_name),
                relationship_type=link.get("relationship_type", "aligned_nco"),
                classification_code=str(occ_code),
                classification_system="NCO",
                occupation_id=link.get("id"),
            )
            occupations_by_doc.setdefault(d_id, []).append(item)

        results: List[IndustryDocumentItem] = []
        for doc in docs:
            d_id = doc["document_id"]
            raw_name = doc.get("document_name") or "document.pdf"
            clean_name = re.sub(r"(?i)(\.pdf)+$", "", raw_name).strip("._-")
            clean_name = f"{clean_name}.pdf" if clean_name else "document.pdf"
            results.append(
                IndustryDocumentItem(
                    document_id=d_id,
                    document_name=clean_name,
                    document_type=doc["document_type"],
                    issuing_organization=doc.get("issuing_organization"),
                    source_url=doc.get("source_url"),
                    published_date=doc.get("published_date"),
                    storage_path=doc["storage_path"],
                    occupations=occupations_by_doc.get(d_id, []),
                )
            )

        return results

    def link_occupation(
        self,
        document_id: int,
        payload: AddOccupationRequest,
        current_admin: SafeAdmin,
    ) -> AddOccupationResponse:
        """
        Finds or creates an occupation by (classification_system, classification_code)
        and inserts a relationship link into public.document_occupations.
        Ignores duplicate links gracefully.
        """
        client = self._get_client()

        rel_type = payload.relationship_type.strip().lower()
        if rel_type not in ALLOWED_RELATIONSHIP_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid relationship_type '{rel_type}'. Must be one of: {', '.join(ALLOWED_RELATIONSHIP_TYPES)}.",
            )

        # 1. Verify document exists
        doc_res = client.table("industry_documents").select("document_id, document_name").eq("document_id", document_id).limit(1).execute()
        if not doc_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Industry document with ID {document_id} not found.",
            )

        system = payload.classification_system.strip()
        code = payload.classification_code.strip()
        name = payload.occupation_name.strip()

        # 2. Find or create occupation by (classification_system, classification_code)
        occ_res = (
            client.table("occupations")
            .select("*")
            .eq("classification_system", system)
            .eq("classification_code", code)
            .limit(1)
            .execute()
        )

        if occ_res.data and len(occ_res.data) > 0:
            occ_record = occ_res.data[0]
            occ_id = occ_record["occupation_id"]
        else:
            # Create new occupation
            new_occ_res = client.table("occupations").insert({
                "classification_system": system,
                "classification_code": code,
                "occupation_name": name,
            }).execute()
            if not new_occ_res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create new occupation entry.",
                )
            occ_record = new_occ_res.data[0]
            occ_id = occ_record["occupation_id"]

        # 3. Check for existing link (graceful duplicate handling)
        existing_link_res = (
            client.table("document_occupations")
            .select("id, document_id, occupation_id, relationship_type")
            .eq("document_id", document_id)
            .eq("occupation_id", occ_id)
            .eq("relationship_type", rel_type)
            .limit(1)
            .execute()
        )

        if existing_link_res.data and len(existing_link_res.data) > 0:
            existing = existing_link_res.data[0]
            logger.info("Occupation %d already linked to document %d (%s)", occ_id, document_id, rel_type)
            return AddOccupationResponse(
                success=True,
                message="Occupation is already linked to this document.",
                link=LinkedOccupationItem(
                    id=existing["id"],
                    occupation_id=occ_id,
                    classification_system=system,
                    classification_code=code,
                    occupation_name=occ_record.get("occupation_name", name),
                    relationship_type=rel_type,
                ),
            )

        # 4. Insert new link
        try:
            link_insert = client.table("document_occupations").insert({
                "document_id": document_id,
                "occupation_id": occ_id,
                "relationship_type": rel_type,
            }).execute()
        except Exception as e:
            err_str = str(e)
            logger.warning("Insert error on document_occupations: %s", err_str)
            # Check if race condition duplicate occurred
            if "duplicate" in err_str.lower() or "unique" in err_str.lower() or "23505" in err_str:
                existing_retry = (
                    client.table("document_occupations")
                    .select("id")
                    .eq("document_id", document_id)
                    .eq("occupation_id", occ_id)
                    .eq("relationship_type", rel_type)
                    .limit(1)
                    .execute()
                )
                link_id = existing_retry.data[0]["id"] if existing_retry.data else 0
                return AddOccupationResponse(
                    success=True,
                    message="Occupation is already linked to this document.",
                    link=LinkedOccupationItem(
                        id=link_id,
                        occupation_id=occ_id,
                        classification_system=system,
                        classification_code=code,
                        occupation_name=occ_record.get("occupation_name", name),
                        relationship_type=rel_type,
                    ),
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to link occupation to document: {err_str}",
            )

        link_record = link_insert.data[0]
        logger.info(
            "AUDIT: Admin id=%s email=%s action=link_occupation document_id=%d occupation_id=%d relationship=%s",
            current_admin.id,
            current_admin.email,
            document_id,
            occ_id,
            rel_type,
        )

        return AddOccupationResponse(
            success=True,
            message="Occupation linked successfully.",
            link=LinkedOccupationItem(
                id=link_record["id"],
                occupation_id=occ_id,
                classification_system=system,
                classification_code=code,
                occupation_name=occ_record.get("occupation_name", name),
                relationship_type=rel_type,
            ),
        )

    def unlink_occupation(
        self,
        document_id: int,
        occupation_id: int,
        relationship_type: Optional[str],
        current_admin: SafeAdmin,
    ) -> DeleteOccupationResponse:
        """
        Removes an occupation link from public.document_occupations.
        """
        client = self._get_client()

        query = (
            client.table("document_occupations")
            .delete()
            .eq("document_id", document_id)
            .eq("occupation_id", occupation_id)
        )
        if relationship_type:
            query = query.eq("relationship_type", relationship_type.strip().lower())

        try:
            query.execute()
        except Exception as e:
            logger.error("Error unlinking occupation %d from document %d: %s", occupation_id, document_id, str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to unlink occupation: {str(e)}",
            )

        logger.info(
            "AUDIT: Admin id=%s email=%s action=unlink_occupation document_id=%d occupation_id=%d",
            current_admin.id,
            current_admin.email,
            document_id,
            occupation_id,
        )

        return DeleteOccupationResponse(
            success=True,
            message="Occupation unlinked successfully from document.",
        )
