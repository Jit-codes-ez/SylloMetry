import logging
from typing import Any, Dict, List, Optional, Set

from app.core.supabase import get_supabase_admin_client
from app.schemas.industry_review import (
    FinalApprovalResponse,
    ReviewPriority,
    ReviewStatus,
    SkillReviewItem,
)
from app.services.review_session_store import (
    get_review_session_by_id,
    update_review_session_data,
)

logger = logging.getLogger("app.services.industry_approval")


def normalize_skill_name(name: str) -> str:
    """Normalizes skill name for safe, case-insensitive comparison."""
    if not name:
        return ""
    return " ".join(name.strip().split()).lower()


class IndustryApprovalService:
    """
    Stage 3 Service: Validates final review decisions and atomically commits
    approved skills and verified evidence into permanent D2 tables.
    """

    def approve_and_save_dataset(
        self,
        session_id: str,
        admin_email: Optional[str] = None,
    ) -> FinalApprovalResponse:
        """
        Validates all administrator review decisions and commits approved data
        transactionally to the permanent D2 database.
        """
        sb_admin = get_supabase_admin_client()
        if not sb_admin:
            raise RuntimeError("Database connection unavailable.")

        # 1. Load persistent review session
        session_data = get_review_session_by_id(session_id)
        if not session_data:
            raise ValueError(f"Review session {session_id} not found.")

        if session_data.get("status") == "approved_and_saved":
            raise ValueError("This review dataset has already been approved and committed to the database.")

        document_id = int(session_data["document_id"])
        raw_skills = session_data.get("skills", [])
        skills = [SkillReviewItem(**s) for s in raw_skills]

        # 2. Strict backend verification of review decisions
        # Ensure NO unreviewed (pending) records exist
        pending_skills = [s for s in skills if s.review_status == ReviewStatus.PENDING]
        if pending_skills:
            raise ValueError(
                f"Cannot commit dataset: {len(pending_skills)} skill(s) are still pending review."
            )

        all_evidence = [ev for s in skills for ev in s.evidence_items]
        pending_evidence = [ev for ev in all_evidence if ev.review_status == ReviewStatus.PENDING]
        if pending_evidence:
            raise ValueError(
                f"Cannot commit dataset: {len(pending_evidence)} evidence record(s) are still pending review."
            )

        # Filter only approved skills
        approved_skills = [s for s in skills if s.review_status == ReviewStatus.APPROVED]
        if not approved_skills:
            raise ValueError("Cannot commit dataset: No skills were approved.")

        # Ensure every approved skill has at least one approved supporting evidence record
        for s in approved_skills:
            approved_ev = [ev for ev in s.evidence_items if ev.review_status == ReviewStatus.APPROVED]
            if not approved_ev:
                raise ValueError(
                    f"Cannot commit dataset: Approved skill '{s.canonical_name}' has no approved supporting evidence."
                )

        # 3. Construct structured payload
        payload_skills = []
        for s in approved_skills:
            payload_skills.append({
                "temp_id": s.skill_id,
                "canonical_name": s.canonical_name.strip(),
                "skill_type": s.skill_type.strip().lower(),
                "skill_category": s.skill_category,
                "description": s.description,
                "aliases": s.aliases or [],
            })

        payload_evidence = []
        for s in approved_skills:
            for ev in s.evidence_items:
                if ev.review_status == ReviewStatus.APPROVED:
                    payload_evidence.append({
                        "temp_skill_id": s.skill_id,
                        "section_name": ev.section_name.strip()[:255],
                        "evidence_quote": ev.evidence_quote.strip(),
                        "page_number": int(ev.verified_page_number or ev.original_page_number),
                        "extraction_method": "llm/gemini-3.1-flash-lite/v2",
                        "confidence_score": round(float(ev.confidence_score), 4),
                        "raw_phrase": ev.raw_phrase.strip()[:255],
                        "depth_cue": ev.depth_cue.strip().lower()[:50],
                    })

        payload = {
            "document_id": document_id,
            "skills": payload_skills,
            "evidence": payload_evidence,
        }

        # 4. Attempt atomic commit via Supabase PostgreSQL RPC if available
        new_skills_count = 0
        reused_skills_count = 0
        evidence_inserted = 0

        rpc_succeeded = False
        try:
            rpc_res = sb_admin.rpc("approve_industry_review_dataset", {"p_payload": payload}).execute()
            if rpc_res.data and isinstance(rpc_res.data, dict) and rpc_res.data.get("success"):
                rpc_succeeded = True
                new_skills_count = rpc_res.data.get("new_skills_count", 0)
                reused_skills_count = rpc_res.data.get("reused_skills_count", 0)
                evidence_inserted = rpc_res.data.get("evidence_inserted", 0)
                logger.info(
                    "Committed dataset via Supabase RPC. New skills: %d, Reused: %d, Evidence: %d",
                    new_skills_count,
                    reused_skills_count,
                    evidence_inserted,
                )
        except Exception as rpc_err:
            logger.info("Supabase RPC not available or failed (%s). Executing managed Python transaction.", str(rpc_err))
            rpc_succeeded = False

        # 5. Managed Python Transaction with compensation rollback if RPC unavailable
        if not rpc_succeeded:
            new_skills_count, reused_skills_count, evidence_inserted = self._execute_managed_insertion(
                sb_admin=sb_admin,
                document_id=document_id,
                payload_skills=payload_skills,
                payload_evidence=payload_evidence,
            )

        # 6. Mark review session as approved_and_saved in persistent store
        session_data["status"] = "approved_and_saved"
        session_data["approved_by"] = admin_email
        update_review_session_data(session_id, session_data, status="approved_and_saved")

        total_extracted_evidence = len(all_evidence)
        excluded_count = total_extracted_evidence - evidence_inserted

        return FinalApprovalResponse(
            success=True,
            message="Dataset successfully verified and committed to the permanent database.",
            document_id=document_id,
            new_skills_created=new_skills_count,
            reused_skills_count=reused_skills_count,
            evidence_inserted=evidence_inserted,
            excluded_evidence_count=max(0, excluded_count),
        )

    def _execute_managed_insertion(
        self,
        sb_admin: Any,
        document_id: int,
        payload_skills: List[Dict[str, Any]],
        payload_evidence: List[Dict[str, Any]],
    ) -> tuple[int, int, int]:
        """
        Executes database insertion with strict compensation tracking so that
        any failure triggers an automatic rollback of all newly inserted rows.
        """
        newly_created_skill_ids: List[int] = []
        newly_inserted_evidence_ids: List[int] = []
        temp_to_real_skill_id: Dict[str, int] = {}

        new_skills_count = 0
        reused_skills_count = 0
        evidence_inserted = 0

        try:
            # 1. Fetch existing skills to do exact case-insensitive matching
            existing_db_res = sb_admin.table("skills").select("skill_id, skill_name, aliases").execute()
            existing_by_norm: Dict[str, Dict[str, Any]] = {}
            for row in existing_db_res.data or []:
                existing_by_norm[normalize_skill_name(row["skill_name"])] = row

            # 2. Insert or reuse skills
            for ps in payload_skills:
                temp_id = ps["temp_id"]
                norm_name = normalize_skill_name(ps["canonical_name"])

                if norm_name in existing_by_norm:
                    # Reuse existing skill
                    skill_row = existing_by_norm[norm_name]
                    real_id = skill_row["skill_id"]
                    reused_skills_count += 1

                    # Merge aliases without duplicates
                    existing_aliases = skill_row.get("aliases") or []
                    merged_aliases = list(existing_aliases)
                    seen_aliases = {a.lower() for a in existing_aliases}
                    updated = False
                    for a in ps.get("aliases", []):
                        if a and a.strip() and a.strip().lower() not in seen_aliases:
                            merged_aliases.append(a.strip())
                            seen_aliases.add(a.strip().lower())
                            updated = True
                    if updated:
                        try:
                            sb_admin.table("skills").update({"aliases": merged_aliases}).eq("skill_id", real_id).execute()
                        except Exception as a_err:
                            logger.warning("Could not update aliases on skill %d: %s", real_id, str(a_err))

                    temp_to_real_skill_id[temp_id] = real_id
                else:
                    # Insert new skill
                    ins_skill_res = (
                        sb_admin.table("skills")
                        .insert({
                            "skill_name": ps["canonical_name"],
                            "skill_type": ps["skill_type"],
                            "skill_category": ps.get("skill_category"),
                            "description": ps.get("description"),
                            "aliases": ps.get("aliases", []),
                        })
                        .execute()
                    )
                    if not ins_skill_res.data:
                        raise RuntimeError(f"Failed to insert canonical skill '{ps['canonical_name']}'.")

                    real_id = ins_skill_res.data[0]["skill_id"]
                    newly_created_skill_ids.append(real_id)
                    new_skills_count += 1
                    temp_to_real_skill_id[temp_id] = real_id
                    existing_by_norm[norm_name] = ins_skill_res.data[0]

            # 3. Insert approved evidence records
            for pev in payload_evidence:
                temp_skill_id = pev["temp_skill_id"]
                real_skill_id = temp_to_real_skill_id.get(temp_skill_id)
                if not real_skill_id:
                    continue

                evidence_row = {
                    "skill_id": real_skill_id,
                    "document_id": document_id,
                    "section_name": pev["section_name"],
                    "evidence_text": pev["evidence_quote"],
                    "page_number": pev["page_number"],
                    "extraction_method": pev["extraction_method"],
                    "confidence_score": pev["confidence_score"],
                    "validation_status": "verified",  # Permanently marked as verified
                    "raw_phrase": pev["raw_phrase"],
                    "depth_cue": pev["depth_cue"],
                }

                try:
                    ins_ev_res = sb_admin.table("skill_evidence").insert(evidence_row).execute()
                    if ins_ev_res.data:
                        ev_id = ins_ev_res.data[0].get("evidence_id")
                        if ev_id:
                            newly_inserted_evidence_ids.append(ev_id)
                        evidence_inserted += 1
                except Exception as ev_err:
                    err_msg = str(ev_err).lower()
                    if "23505" in err_msg or "duplicate key" in err_msg or "unique constraint" in err_msg:
                        # Duplicate evidence gracefully skipped
                        continue
                    raise

            return new_skills_count, reused_skills_count, evidence_inserted

        except Exception as main_err:
            logger.error("Managed insertion failed. Executing compensation rollback: %s", str(main_err))
            # Compensation rollback
            if newly_inserted_evidence_ids:
                try:
                    for ev_id in newly_inserted_evidence_ids:
                        sb_admin.table("skill_evidence").delete().eq("evidence_id", ev_id).execute()
                except Exception as rb_ev_err:
                    logger.error("Failed to rollback evidence rows: %s", str(rb_ev_err))

            if newly_created_skill_ids:
                try:
                    for s_id in newly_created_skill_ids:
                        sb_admin.table("skills").delete().eq("skill_id", s_id).execute()
                except Exception as rb_sk_err:
                    logger.error("Failed to rollback skill rows: %s", str(rb_sk_err))

            raise RuntimeError(f"Approval database commit failed and was rolled back: {str(main_err)}")
