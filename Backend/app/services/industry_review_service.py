import logging
import uuid
from typing import Any, Dict, List, Optional, Set

from app.core.supabase import get_supabase_admin_client
from app.schemas.industry_review import (
    BulkReviewActionRequest,
    EvidenceReviewItem,
    QuoteValidationStatus,
    ReviewPriority,
    ReviewSessionResponse,
    ReviewSessionSummary,
    ReviewStatus,
    SkillReviewItem,
    UpdateEvidenceRequest,
    UpdateSkillRequest,
)
from app.services.pdf_extraction_service import extract_pages
from app.services.review_session_store import (
    get_review_session_by_document,
    get_review_session_by_id,
    save_review_session,
    update_review_session_data,
)
from app.services.industry_storage_service import IndustryStorageService

logger = logging.getLogger("app.services.industry_review")


def normalize_skill_name(name: str) -> str:
    """Normalizes skill name for safe, case-insensitive comparison."""
    if not name:
        return ""
    return " ".join(name.strip().split()).lower()


class IndustryReviewService:
    """
    Stage 2 Service: Manages persistent review sessions, automated quality
    validation, inline editing, and review decision workflows.
    """

    def __init__(self):
        self.storage_service = IndustryStorageService()

    def get_document_meta(self, document_id: int) -> Dict[str, Any]:
        """Fetches document metadata and linked occupations from Supabase."""
        sb_admin = get_supabase_admin_client()
        if not sb_admin:
            raise RuntimeError("Database connection unavailable.")

        doc_res = (
            sb_admin.table("industry_documents")
            .select("*")
            .eq("document_id", document_id)
            .limit(1)
            .execute()
        )
        if not doc_res.data:
            raise ValueError(f"Industry document {document_id} not found in database.")

        doc = doc_res.data[0]

        # Fetch linked occupations via junction table
        try:
            links_res = (
                sb_admin.table("document_occupations")
                .select("id, document_id, occupation_id, relationship_type, occupations(occupation_id, classification_system, classification_code, occupation_name)")
                .eq("document_id", document_id)
                .execute()
            )
            occupations = []
            for link in links_res.data or []:
                occ_obj = link.get("occupations") or {}
                if occ_obj:
                    occupations.append({
                        "id": link["id"],
                        "occupation_id": link["occupation_id"],
                        "classification_system": occ_obj.get("classification_system", ""),
                        "classification_code": occ_obj.get("classification_code", ""),
                        "occupation_name": occ_obj.get("occupation_name", ""),
                        "relationship_type": link.get("relationship_type", "aligned_nco"),
                    })
            doc["occupations"] = occupations
        except Exception as e:
            logger.warning("Error fetching occupations for doc %d: %s", document_id, str(e))
            doc["occupations"] = []

        return doc

    def get_existing_skills_map(self) -> Dict[str, Dict[str, Any]]:
        """Retrieves existing skills from permanent database mapped by normalized name."""
        sb_admin = get_supabase_admin_client()
        if not sb_admin:
            return {}

        try:
            res = sb_admin.table("skills").select("skill_id, skill_name, skill_type, aliases").execute()
            mapping = {}
            for row in res.data or []:
                norm = normalize_skill_name(row["skill_name"])
                mapping[norm] = row
            return mapping
        except Exception as e:
            logger.warning("Error loading existing skills map: %s", str(e))
            return {}

    def calculate_summary(
        self,
        skills: List[SkillReviewItem],
    ) -> ReviewSessionSummary:
        """Calculates review progress, checks counts, and approval readiness."""
        total_skills = len(skills)
        total_evidence = sum(len(s.evidence_items) for s in skills)

        needs_review_count = 0
        passed_checks_count = 0
        failed_checks_count = 0

        approved_skills_count = sum(1 for s in skills if s.review_status == ReviewStatus.APPROVED)
        rejected_skills_count = sum(1 for s in skills if s.review_status == ReviewStatus.REJECTED)
        approved_evidence_count = 0
        rejected_evidence_count = 0

        blocking_reasons: List[str] = []

        # Analyze evidence items
        for s in skills:
            if s.validation_warnings:
                failed_checks_count += 1
            else:
                passed_checks_count += 1

            if s.review_status == ReviewStatus.PENDING:
                needs_review_count += 1

            for ev in s.evidence_items:
                if ev.review_status == ReviewStatus.APPROVED:
                    approved_evidence_count += 1
                elif ev.review_status == ReviewStatus.REJECTED:
                    rejected_evidence_count += 1
                else:
                    needs_review_count += 1

                if ev.validation_warnings:
                    failed_checks_count += 1
                else:
                    passed_checks_count += 1

        # Check approval blocking reasons
        pending_skills = sum(1 for s in skills if s.review_status == ReviewStatus.PENDING)
        pending_evidence = sum(
            sum(1 for ev in s.evidence_items if ev.review_status == ReviewStatus.PENDING)
            for s in skills
        )

        if pending_skills > 0:
            blocking_reasons.append(f"{pending_skills} skill(s) are still pending review.")
        if pending_evidence > 0:
            blocking_reasons.append(f"{pending_evidence} evidence record(s) are still pending review.")

        # Check for approved skills with 0 approved evidence
        for s in skills:
            if s.review_status == ReviewStatus.APPROVED:
                approved_ev_for_skill = [
                    ev for ev in s.evidence_items if ev.review_status == ReviewStatus.APPROVED
                ]
                if not approved_ev_for_skill:
                    blocking_reasons.append(
                        f"Skill '{s.canonical_name}' is approved but has no approved supporting evidence."
                    )

        if approved_skills_count == 0:
            blocking_reasons.append("At least one skill must be approved with supporting evidence.")

        # Progress percentage based on decisions made
        total_decisions_required = total_skills + total_evidence
        decisions_made = (
            approved_skills_count
            + rejected_skills_count
            + approved_evidence_count
            + rejected_evidence_count
        )
        progress_pct = (
            round((decisions_made / total_decisions_required) * 100, 1)
            if total_decisions_required > 0
            else 0.0
        )

        can_submit = len(blocking_reasons) == 0

        return ReviewSessionSummary(
            total_skills=total_skills,
            total_evidence=total_evidence,
            needs_review_count=needs_review_count,
            passed_checks_count=passed_checks_count,
            failed_checks_count=failed_checks_count,
            approved_skills_count=approved_skills_count,
            approved_evidence_count=approved_evidence_count,
            rejected_skills_count=rejected_skills_count,
            rejected_evidence_count=rejected_evidence_count,
            approval_progress_percent=progress_pct,
            can_submit_approval=can_submit,
            blocking_reasons=blocking_reasons,
        )

    def create_or_update_session_from_extraction(
        self,
        document_id: int,
        extraction_items: List[Dict[str, Any]],
        admin_email: Optional[str] = None,
        job_id: Optional[str] = None,
        extraction_status: str = "completed",
        failed_windows: Optional[List[Dict[str, Any]]] = None,
    ) -> ReviewSessionResponse:
        """
        Builds a structured, persistent review session from extraction output,
        running automated checks and calculating priorities.
        """
        doc_meta = self.get_document_meta(document_id)
        existing_skills_db = self.get_existing_skills_map()

        # Check if an existing review session already exists for this document
        existing_session = get_review_session_by_document(document_id)
        session_id = existing_session.get("session_id") if existing_session else str(uuid.uuid4())

        # Map existing edits or decisions if session already existed
        prev_skill_decisions: Dict[str, str] = {}
        prev_evidence_decisions: Dict[str, str] = {}
        if existing_session and "skills" in existing_session:
            for s in existing_session.get("skills", []):
                prev_skill_decisions[normalize_skill_name(s.get("canonical_name", ""))] = s.get(
                    "review_status", ReviewStatus.PENDING
                )
                for ev in s.get("evidence_items", []):
                    prev_evidence_decisions[ev.get("evidence_quote", "")] = ev.get(
                        "review_status", ReviewStatus.PENDING
                    )

        # 1. Group extraction items by canonical skill name
        grouped: Dict[str, Dict[str, Any]] = {}
        for it in extraction_items:
            raw_name = it.get("skill_name") or "Unnamed Skill"
            norm_name = normalize_skill_name(raw_name)

            if norm_name not in grouped:
                grouped[norm_name] = {
                    "canonical_name": raw_name.strip(),
                    "skill_type": (it.get("skill_type") or "technique").lower(),
                    "skill_category": it.get("skill_category"),
                    "description": it.get("description"),
                    "aliases": list(it.get("aliases") or []),
                    "evidence_items": [],
                }
            else:
                # Merge aliases
                for a in it.get("aliases") or []:
                    if a and a not in grouped[norm_name]["aliases"]:
                        grouped[norm_name]["aliases"].append(a)

            grouped[norm_name]["evidence_items"].append(it)

        # 2. Build SkillReviewItem and EvidenceReviewItem models
        skill_items: List[SkillReviewItem] = []
        for norm_name, g in grouped.items():
            temp_skill_id = str(uuid.uuid4())
            skill_warnings: List[str] = []
            skill_priority = ReviewPriority.LOW

            # Check matching against permanent database
            existing_rec = existing_skills_db.get(norm_name)
            existing_id = existing_rec.get("skill_id") if existing_rec else None
            existing_type_conflict = None

            if existing_rec:
                if existing_rec.get("skill_type") != g["skill_type"]:
                    existing_type_conflict = existing_rec.get("skill_type")
                    skill_warnings.append(
                        f"Database conflict: Existing skill is typed as '{existing_type_conflict}', but extracted as '{g['skill_type']}'."
                    )
                    skill_priority = ReviewPriority.MEDIUM

                # Merge aliases from database
                db_aliases = existing_rec.get("aliases") or []
                for dba in db_aliases:
                    if dba and dba not in g["aliases"]:
                        g["aliases"].append(dba)

            # Build evidence records for this skill
            evidence_models: List[EvidenceReviewItem] = []
            seen_evidence_quotes: Set[str] = set()

            for ev_raw in g["evidence_items"]:
                ev_id = str(uuid.uuid4())
                ev_quote = (ev_raw.get("evidence_quote") or "").strip()
                orig_page = int(ev_raw.get("page_number", 1))
                verified_page = ev_raw.get("verified_page_number")
                quote_status = ev_raw.get("quote_validation_status") or QuoteValidationStatus.EXACT_PAGE_MATCH
                section_name = ev_raw.get("section_name") or "General"
                raw_phrase = ev_raw.get("raw_phrase") or ""
                depth_cue = ev_raw.get("depth_cue") or ""
                confidence = float(ev_raw.get("confidence", 0.0))

                ev_warnings: List[str] = []
                ev_priority = ReviewPriority.LOW

                # Automated Quality Checks
                if quote_status == QuoteValidationStatus.QUOTE_NOT_FOUND:
                    ev_warnings.append("Evidence quote was not found anywhere in the 2-page extraction window.")
                    ev_priority = ReviewPriority.HIGH
                elif quote_status == QuoteValidationStatus.PAGE_MISMATCH:
                    ev_warnings.append(
                        f"Page mismatch: Found on page {verified_page}, while reported as page {orig_page}."
                    )
                    ev_priority = ReviewPriority.HIGH
                elif quote_status == QuoteValidationStatus.INVALID_QUOTE:
                    ev_warnings.append("Quote is empty or exceeds the 300-character maximum limit.")
                    ev_priority = ReviewPriority.HIGH

                # Qualification-specific check: Cloud Computing Associate Page 13 (Tools/Equipment lab inventory)
                if orig_page == 13 or verified_page == 13:
                    ev_warnings.append("Extracted from Page 13 (Tools/Equipment lab inventory). High risk of false competency.")
                    ev_priority = ReviewPriority.HIGH

                # Section name validation
                if "NOS 0" in section_name:
                    ev_warnings.append("Section name contains invalid 'NOS 0' numbering.")
                    ev_priority = ReviewPriority.MEDIUM
                elif not section_name or section_name.strip() in ("General", "None"):
                    ev_warnings.append("Section context is missing or uncertain.")
                    ev_priority = ReviewPriority.MEDIUM

                # Duplicate quote check within same skill
                norm_quote = ev_quote.strip().lower()
                if norm_quote in seen_evidence_quotes:
                    ev_warnings.append("Duplicate evidence quote for this skill.")
                else:
                    seen_evidence_quotes.add(norm_quote)

                # Short quote check
                if len(ev_quote) < 15:
                    ev_warnings.append("Evidence quote is very short (< 15 characters). Verify completeness.")
                    if ev_priority == ReviewPriority.LOW:
                        ev_priority = ReviewPriority.MEDIUM

                # Elevate skill priority if any evidence is high priority
                if ev_priority == ReviewPriority.HIGH:
                    skill_priority = ReviewPriority.HIGH
                elif ev_priority == ReviewPriority.MEDIUM and skill_priority == ReviewPriority.LOW:
                    skill_priority = ReviewPriority.MEDIUM

                # Restore previous decision if re-analyzing
                initial_status = prev_evidence_decisions.get(ev_quote, ReviewStatus.PENDING)

                evidence_models.append(
                    EvidenceReviewItem(
                        evidence_id=ev_id,
                        temp_skill_id=temp_skill_id,
                        evidence_quote=ev_quote,
                        original_page_number=orig_page,
                        verified_page_number=verified_page,
                        quote_validation_status=quote_status,
                        section_name=section_name,
                        raw_phrase=raw_phrase,
                        depth_cue=depth_cue,
                        confidence_score=round(confidence, 4),
                        review_priority=ev_priority,
                        review_status=initial_status,
                        validation_warnings=ev_warnings,
                        is_edited=False,
                    )
                )

            # Restore previous skill decision
            initial_skill_status = prev_skill_decisions.get(norm_name, ReviewStatus.PENDING)

            skill_items.append(
                SkillReviewItem(
                    skill_id=temp_skill_id,
                    canonical_name=g["canonical_name"],
                    skill_type=g["skill_type"],
                    skill_category=g["skill_category"],
                    description=g["description"],
                    aliases=g["aliases"],
                    evidence_items=evidence_models,
                    review_priority=skill_priority,
                    review_status=initial_skill_status,
                    validation_warnings=skill_warnings,
                    existing_canonical_id=existing_id,
                    existing_type_conflict=existing_type_conflict,
                    is_edited=False,
                )
            )

        # 3. Calculate summary
        summary = self.calculate_summary(skill_items)

        # 4. Save persistently
        session_dict = {
            "session_id": session_id,
            "document_id": document_id,
            "document_name": doc_meta.get("document_name"),
            "issuing_organization": doc_meta.get("issuing_organization"),
            "document_type": doc_meta.get("document_type"),
            "storage_path": doc_meta.get("storage_path"),
            "occupations": doc_meta.get("occupations") or [],
            "status": "in_review",
            "extraction_status": extraction_status,
            "failed_windows": failed_windows or [],
            "skills": [s.model_dump() for s in skill_items],
            "summary": summary.model_dump(),
        }

        save_review_session(
            session_id=session_id,
            document_id=document_id,
            session_data=session_dict,
            admin_email=admin_email,
            job_id=job_id,
            status="in_review",
        )

        # Add temporary signed PDF url for frontend viewer
        pdf_url = self.get_temporary_pdf_url(doc_meta.get("storage_path"))

        return ReviewSessionResponse(
            session_id=session_id,
            document_id=document_id,
            document_name=doc_meta.get("document_name"),
            issuing_organization=doc_meta.get("issuing_organization"),
            document_type=doc_meta.get("document_type"),
            storage_path=doc_meta.get("storage_path"),
            occupations=doc_meta.get("occupations") or [],
            pdf_url=pdf_url,
            status="in_review",
            extraction_status=extraction_status,
            failed_windows=failed_windows or [],
            skills=skill_items,
            summary=summary,
            created_at=session_dict.get("created_at", 0.0),
            updated_at=session_dict.get("updated_at", 0.0),
            created_by_admin=admin_email,
        )

    def get_temporary_pdf_url(self, storage_path: Optional[str]) -> Optional[str]:
        """Generates a temporary signed URL to view or embed the PDF."""
        if not storage_path:
            return None
        try:
            download_info = self.storage_service.get_signed_download_url(
                storage_path=storage_path,
                current_admin=None,
            )
            return download_info.signed_url
        except Exception as e:
            logger.warning("Could not generate signed download URL for '%s': %s", storage_path, str(e))
            return None

    def get_review_session(self, document_id: int) -> Optional[ReviewSessionResponse]:
        """Retrieves an active or completed review session for a document."""
        data = get_review_session_by_document(document_id)
        if not data:
            return None

        skills = [SkillReviewItem(**s) for s in data.get("skills", [])]
        summary = self.calculate_summary(skills)
        pdf_url = self.get_temporary_pdf_url(data.get("storage_path"))

        return ReviewSessionResponse(
            session_id=data["session_id"],
            document_id=data["document_id"],
            document_name=data.get("document_name", ""),
            issuing_organization=data.get("issuing_organization"),
            document_type=data.get("document_type", ""),
            storage_path=data.get("storage_path", ""),
            occupations=data.get("occupations", []),
            pdf_url=pdf_url,
            status=data.get("status", "in_review"),
            extraction_status=data.get("extraction_status", "completed"),
            failed_windows=data.get("failed_windows", []),
            skills=skills,
            summary=summary,
            created_at=data.get("created_at", 0.0),
            updated_at=data.get("updated_at", 0.0),
            created_by_admin=data.get("admin_email"),
        )

    def update_skill(
        self,
        session_id: str,
        skill_id: str,
        update: UpdateSkillRequest,
    ) -> ReviewSessionResponse:
        """Updates skill fields, triggers validation checks, and saves session."""
        data = get_review_session_by_id(session_id)
        if not data:
            raise ValueError(f"Review session {session_id} not found.")

        skills = [SkillReviewItem(**s) for s in data.get("skills", [])]
        target_skill = next((s for s in skills if s.skill_id == skill_id), None)
        if not target_skill:
            raise ValueError(f"Skill {skill_id} not found in session.")

        if update.canonical_name is not None and update.canonical_name.strip():
            target_skill.canonical_name = update.canonical_name.strip()
            target_skill.is_edited = True
        if update.skill_type is not None and update.skill_type.strip():
            target_skill.skill_type = update.skill_type.strip().lower()
            target_skill.is_edited = True
        if update.skill_category is not None:
            target_skill.skill_category = update.skill_category.strip() or None
            target_skill.is_edited = True
        if update.description is not None:
            target_skill.description = update.description.strip() or None
            target_skill.is_edited = True
        if update.aliases is not None:
            clean_aliases = [
                a.strip()
                for a in update.aliases
                if a and a.strip() and a.strip().lower() != target_skill.canonical_name.lower()
            ]
            target_skill.aliases = list(dict.fromkeys(clean_aliases))
            target_skill.is_edited = True

        summary = self.calculate_summary(skills)
        data["skills"] = [s.model_dump() for s in skills]
        data["summary"] = summary.model_dump()
        update_review_session_data(session_id, data)

        pdf_url = self.get_temporary_pdf_url(data.get("storage_path"))
        return ReviewSessionResponse(
            session_id=data["session_id"],
            document_id=data["document_id"],
            document_name=data.get("document_name", ""),
            issuing_organization=data.get("issuing_organization"),
            document_type=data.get("document_type", ""),
            storage_path=data.get("storage_path", ""),
            occupations=data.get("occupations", []),
            pdf_url=pdf_url,
            status=data.get("status", "in_review"),
            extraction_status=data.get("extraction_status", "completed"),
            failed_windows=data.get("failed_windows", []),
            skills=skills,
            summary=summary,
            created_at=data.get("created_at", 0.0),
            updated_at=data.get("updated_at", 0.0),
            created_by_admin=data.get("admin_email"),
        )

    def update_evidence(
        self,
        session_id: str,
        evidence_id: str,
        update: UpdateEvidenceRequest,
    ) -> ReviewSessionResponse:
        """Updates evidence fields, re-verifies quote against PDF text, and saves session."""
        data = get_review_session_by_id(session_id)
        if not data:
            raise ValueError(f"Review session {session_id} not found.")

        skills = [SkillReviewItem(**s) for s in data.get("skills", [])]
        target_ev = None
        for s in skills:
            for ev in s.evidence_items:
                if ev.evidence_id == evidence_id:
                    target_ev = ev
                    break
            if target_ev:
                break

        if not target_ev:
            raise ValueError(f"Evidence {evidence_id} not found in session.")

        if update.evidence_quote is not None:
            target_ev.evidence_quote = update.evidence_quote.strip()
            target_ev.is_edited = True
        if update.page_number is not None:
            target_ev.original_page_number = update.page_number
            target_ev.verified_page_number = update.page_number
            target_ev.is_edited = True
        if update.section_name is not None:
            target_ev.section_name = update.section_name.strip()
            target_ev.is_edited = True
        if update.raw_phrase is not None:
            target_ev.raw_phrase = update.raw_phrase.strip()
            target_ev.is_edited = True
        if update.depth_cue is not None:
            target_ev.depth_cue = update.depth_cue.strip().lower()
            target_ev.is_edited = True

        # Re-check quote verification status if quote or page were changed
        if update.evidence_quote is not None or update.page_number is not None:
            try:
                pages = extract_pages(data["document_id"])
                p_text = next(
                    (p["text"] for p in pages if p["page_number"] == target_ev.original_page_number),
                    "",
                )
                from app.services.skill_extraction_service import normalize_for_quote_matching

                norm_quote = normalize_for_quote_matching(target_ev.evidence_quote)
                norm_page = normalize_for_quote_matching(p_text)
                if norm_quote in norm_page:
                    target_ev.quote_validation_status = QuoteValidationStatus.EXACT_PAGE_MATCH
                    target_ev.verified_page_number = target_ev.original_page_number
                    # Clear quote-not-found warnings
                    target_ev.validation_warnings = [
                        w for w in target_ev.validation_warnings if "not found" not in w.lower()
                    ]
            except Exception as e:
                logger.warning("Could not re-verify quote against page text: %s", str(e))

        summary = self.calculate_summary(skills)
        data["skills"] = [s.model_dump() for s in skills]
        data["summary"] = summary.model_dump()
        update_review_session_data(session_id, data)

        pdf_url = self.get_temporary_pdf_url(data.get("storage_path"))
        return ReviewSessionResponse(
            session_id=data["session_id"],
            document_id=data["document_id"],
            document_name=data.get("document_name", ""),
            issuing_organization=data.get("issuing_organization"),
            document_type=data.get("document_type", ""),
            storage_path=data.get("storage_path", ""),
            occupations=data.get("occupations", []),
            pdf_url=pdf_url,
            status=data.get("status", "in_review"),
            extraction_status=data.get("extraction_status", "completed"),
            failed_windows=data.get("failed_windows", []),
            skills=skills,
            summary=summary,
            created_at=data.get("created_at", 0.0),
            updated_at=data.get("updated_at", 0.0),
            created_by_admin=data.get("admin_email"),
        )

    def set_skill_status(
        self,
        session_id: str,
        skill_id: str,
        status: str,
    ) -> ReviewSessionResponse:
        """Sets review status for an individual skill (approved, rejected, pending)."""
        data = get_review_session_by_id(session_id)
        if not data:
            raise ValueError(f"Review session {session_id} not found.")

        skills = [SkillReviewItem(**s) for s in data.get("skills", [])]
        target_skill = next((s for s in skills if s.skill_id == skill_id), None)
        if not target_skill:
            raise ValueError(f"Skill {skill_id} not found in session.")

        target_skill.review_status = status

        summary = self.calculate_summary(skills)
        data["skills"] = [s.model_dump() for s in skills]
        data["summary"] = summary.model_dump()
        update_review_session_data(session_id, data)

        pdf_url = self.get_temporary_pdf_url(data.get("storage_path"))
        return ReviewSessionResponse(
            session_id=data["session_id"],
            document_id=data["document_id"],
            document_name=data.get("document_name", ""),
            issuing_organization=data.get("issuing_organization"),
            document_type=data.get("document_type", ""),
            storage_path=data.get("storage_path", ""),
            occupations=data.get("occupations", []),
            pdf_url=pdf_url,
            status=data.get("status", "in_review"),
            extraction_status=data.get("extraction_status", "completed"),
            failed_windows=data.get("failed_windows", []),
            skills=skills,
            summary=summary,
            created_at=data.get("created_at", 0.0),
            updated_at=data.get("updated_at", 0.0),
            created_by_admin=data.get("admin_email"),
        )

    def set_evidence_status(
        self,
        session_id: str,
        evidence_id: str,
        status: str,
    ) -> ReviewSessionResponse:
        """Sets review status for an individual evidence record (approved, rejected, pending)."""
        data = get_review_session_by_id(session_id)
        if not data:
            raise ValueError(f"Review session {session_id} not found.")

        skills = [SkillReviewItem(**s) for s in data.get("skills", [])]
        target_ev = None
        for s in skills:
            for ev in s.evidence_items:
                if ev.evidence_id == evidence_id:
                    target_ev = ev
                    break
            if target_ev:
                break

        if not target_ev:
            raise ValueError(f"Evidence {evidence_id} not found in session.")

        target_ev.review_status = status

        summary = self.calculate_summary(skills)
        data["skills"] = [s.model_dump() for s in skills]
        data["summary"] = summary.model_dump()
        update_review_session_data(session_id, data)

        pdf_url = self.get_temporary_pdf_url(data.get("storage_path"))
        return ReviewSessionResponse(
            session_id=data["session_id"],
            document_id=data["document_id"],
            document_name=data.get("document_name", ""),
            issuing_organization=data.get("issuing_organization"),
            document_type=data.get("document_type", ""),
            storage_path=data.get("storage_path", ""),
            occupations=data.get("occupations", []),
            pdf_url=pdf_url,
            status=data.get("status", "in_review"),
            extraction_status=data.get("extraction_status", "completed"),
            failed_windows=data.get("failed_windows", []),
            skills=skills,
            summary=summary,
            created_at=data.get("created_at", 0.0),
            updated_at=data.get("updated_at", 0.0),
            created_by_admin=data.get("admin_email"),
        )

    def apply_bulk_action(
        self,
        session_id: str,
        payload: BulkReviewActionRequest,
    ) -> ReviewSessionResponse:
        """Applies permitted bulk operations across selected records."""
        data = get_review_session_by_id(session_id)
        if not data:
            raise ValueError(f"Review session {session_id} not found.")

        skills = [SkillReviewItem(**s) for s in data.get("skills", [])]

        if payload.action in ("approve_evidence", "approve", "approve_skills"):
            ev_id_set = set(payload.evidence_ids or [])
            skill_id_set = set(payload.skill_ids or [])
            for s in skills:
                if s.skill_id in skill_id_set:
                    s.review_status = ReviewStatus.APPROVED
                    for ev in s.evidence_items:
                        ev.review_status = ReviewStatus.APPROVED
                else:
                    for ev in s.evidence_items:
                        if ev.evidence_id in ev_id_set:
                            ev.review_status = ReviewStatus.APPROVED

        elif payload.action in ("reject_evidence", "reject", "reject_skills"):
            ev_id_set = set(payload.evidence_ids or [])
            skill_id_set = set(payload.skill_ids or [])
            for s in skills:
                if s.skill_id in skill_id_set:
                    s.review_status = ReviewStatus.REJECTED
                    for ev in s.evidence_items:
                        ev.review_status = ReviewStatus.REJECTED
                else:
                    for ev in s.evidence_items:
                        if ev.evidence_id in ev_id_set:
                            ev.review_status = ReviewStatus.REJECTED

        elif payload.action in ("reset", "pending", "pending_review", "reset_skills"):
            ev_id_set = set(payload.evidence_ids or [])
            skill_id_set = set(payload.skill_ids or [])
            for s in skills:
                if s.skill_id in skill_id_set:
                    s.review_status = ReviewStatus.PENDING
                    for ev in s.evidence_items:
                        ev.review_status = ReviewStatus.PENDING
                else:
                    for ev in s.evidence_items:
                        if ev.evidence_id in ev_id_set:
                            ev.review_status = ReviewStatus.PENDING

        elif payload.action == "update_skill_type":
            target_type = (payload.target_skill_type or "").strip().lower()
            if target_type in {"tool", "technique", "concept", "domain_knowledge"}:
                skill_id_set = set(payload.skill_ids or [])
                for s in skills:
                    if s.skill_id in skill_id_set:
                        s.skill_type = target_type
                        s.is_edited = True

        elif payload.action in ("approve_low_priority", "approve_all_low_priority"):
            for s in skills:
                if s.review_priority == ReviewPriority.LOW:
                    s.review_status = ReviewStatus.APPROVED
                for ev in s.evidence_items:
                    if ev.review_priority == ReviewPriority.LOW:
                        ev.review_status = ReviewStatus.APPROVED

        summary = self.calculate_summary(skills)
        data["skills"] = [s.model_dump() for s in skills]
        data["summary"] = summary.model_dump()
        update_review_session_data(session_id, data)

        pdf_url = self.get_temporary_pdf_url(data.get("storage_path"))
        return ReviewSessionResponse(
            session_id=data["session_id"],
            document_id=data["document_id"],
            document_name=data.get("document_name", ""),
            issuing_organization=data.get("issuing_organization"),
            document_type=data.get("document_type", ""),
            storage_path=data.get("storage_path", ""),
            occupations=data.get("occupations", []),
            pdf_url=pdf_url,
            status=data.get("status", "in_review"),
            extraction_status=data.get("extraction_status", "completed"),
            failed_windows=data.get("failed_windows", []),
            skills=skills,
            summary=summary,
            created_at=data.get("created_at", 0.0),
            updated_at=data.get("updated_at", 0.0),
            created_by_admin=data.get("admin_email"),
        )
