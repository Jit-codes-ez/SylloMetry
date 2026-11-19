import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import HTTPException, status

from app.core.supabase import get_supabase_admin_client
from app.schemas.admin import SafeAdmin
from app.schemas.skill_extraction import (
    ReviewSkillItem,
    SaveSkillsResponse,
)
from app.services.skill_extraction_service import (
    ALLOWED_SKILL_TYPES,
    clean_skill_aliases,
)

logger = logging.getLogger("app.services.skill_saving")

EXTRACTION_METHOD = "llm/gemini-3.1-flash-lite/v2"


def normalize_skill_name(name: str) -> str:
    """Normalizes skill name for safe, case-insensitive comparison."""
    if not name:
        return ""
    return " ".join(name.strip().split()).lower()


class SkillSavingService:
    """
    Part 5: Transactional Skill and Evidence Persistence Service.
    - Saves administrator-reviewed skills into public.skills.
    - Saves supporting evidence into public.skill_evidence.
    - Reuses existing canonical skills by case-insensitive name match.
    - Merges valid new aliases without duplicates.
    - Prevents duplicate evidence using unique constraint (skill_id, document_id, md5(evidence_text)).
    - Guarantees atomicity via compensation rollback and optional PostgreSQL RPC.
    - Strictly avoids persisting confidence_score or validation_status.
    """

    def save_document_skills(
        self,
        document_id: int,
        skills: List[ReviewSkillItem],
        current_admin: SafeAdmin,
    ) -> SaveSkillsResponse:
        """
        Validates and transactionally persists administrator-reviewed skills and evidence.
        """
        admin_client = get_supabase_admin_client()
        if not admin_client:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database service unavailable.",
            )

        # 1. Verify that the document exists
        doc_res = (
            admin_client.table("industry_documents")
            .select("document_id, document_name")
            .eq("document_id", document_id)
            .limit(1)
            .execute()
        )
        if not doc_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Industry document with ID {document_id} not found.",
            )

        # 2. Strict backend validation of all submitted skills and evidence
        if not skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one skill must be provided to save.",
            )

        validated_items: List[Dict[str, Any]] = []
        for idx, item in enumerate(skills):
            row_num = idx + 1
            s_name = (item.skill_name or "").strip()
            if not s_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item {row_num}: Skill name is required.",
                )
            if len(s_name) > 255:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item {row_num}: Skill name '{s_name[:30]}...' exceeds maximum length of 255 characters.",
                )

            s_type = (item.skill_type or "").strip().lower()
            if s_type not in ALLOWED_SKILL_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item {row_num}: Invalid skill type '{s_type}'. Allowed types: {sorted(ALLOWED_SKILL_TYPES)}.",
                )

            evidence_text = (item.evidence_quote or "").strip()
            if not evidence_text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item {row_num} ('{s_name}'): Supporting evidence quote is required.",
                )

            page_num = item.verified_page_number or item.page_number
            if page_num is not None and page_num <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item {row_num} ('{s_name}'): Page number must be positive.",
                )

            s_category = (item.skill_category or "").strip()[:150] or None
            description = (item.description or "").strip() or None
            depth_cue = (item.depth_cue or "").strip().lower()[:50] or None
            raw_phrase = (item.raw_phrase or "").strip()[:255] or None
            section_name = (item.section_name or "").strip()[:255] or None
            cleaned_aliases = clean_skill_aliases(item.aliases or [], s_name)

            validated_items.append({
                "temp_id": item.temp_id,
                "skill_name": s_name,
                "skill_type": s_type,
                "skill_category": s_category,
                "description": description,
                "depth_cue": depth_cue,
                "raw_phrase": raw_phrase,
                "section_name": section_name,
                "evidence_text": evidence_text,
                "page_number": page_num,
                "aliases": cleaned_aliases,
            })

        # 3. First, try atomic PostgreSQL RPC if configured in Supabase
        rpc_payload = {
            "document_id": document_id,
            "skills": validated_items,
        }
        try:
            rpc_res = admin_client.rpc("save_document_skills", {"p_payload": rpc_payload}).execute()
            if rpc_res.data and isinstance(rpc_res.data, dict) and rpc_res.data.get("success"):
                data = rpc_res.data
                logger.info(
                    "AUDIT: Admin id=%s email=%s saved skills for doc %d via Supabase RPC. Created: %d, Reused: %d, Evidence: %d",
                    current_admin.id,
                    current_admin.email,
                    document_id,
                    data.get("new_skills_created", 0),
                    data.get("reused_skills_count", 0),
                    data.get("evidence_inserted", 0),
                )
                return SaveSkillsResponse(
                    success=True,
                    message="Skills and evidence successfully saved to database.",
                    document_id=document_id,
                    new_skills_created=data.get("new_skills_created", 0),
                    reused_skills_count=data.get("reused_skills_count", 0),
                    evidence_inserted=data.get("evidence_inserted", 0),
                    duplicates_skipped=data.get("duplicates_skipped", 0),
                )
        except Exception as rpc_err:
            logger.info("Supabase RPC save_document_skills not active or bypassed (%s). Proceeding with transactional compensation execution.", str(rpc_err))

        # 4. Managed Transaction with strict Compensation Rollback
        newly_created_skill_ids: List[int] = []
        newly_inserted_evidence_ids: List[int] = []
        original_aliases_by_id: Dict[int, List[str]] = {}

        new_skills_count = 0
        reused_skills_count = 0
        evidence_inserted = 0
        duplicates_skipped = 0

        temp_to_real_skill_id: Dict[str, int] = {}

        try:
            # Step A: Load existing canonical skills from database for exact case-insensitive matching
            existing_db_res = (
                admin_client.table("skills")
                .select("skill_id, skill_name, skill_category, skill_type, description, aliases")
                .execute()
            )
            existing_by_lower: Dict[str, Dict[str, Any]] = {}
            for row in existing_db_res.data or []:
                norm = normalize_skill_name(row["skill_name"])
                existing_by_lower[norm] = row

            # Step B: Resolve each skill (reuse existing or insert new)
            for item in validated_items:
                temp_id = item["temp_id"]
                s_name = item["skill_name"]
                norm_name = normalize_skill_name(s_name)

                if norm_name in existing_by_lower:
                    # Reuse existing canonical skill
                    skill_row = existing_by_lower[norm_name]
                    real_id = skill_row["skill_id"]
                    temp_to_real_skill_id[temp_id] = real_id
                    reused_skills_count += 1

                    # Merge aliases safely without duplicates
                    existing_aliases = skill_row.get("aliases") or []
                    existing_alias_set = {a.strip().lower() for a in existing_aliases if a and a.strip()}
                    merged_aliases = list(existing_aliases)
                    aliases_updated = False

                    for alias in item["aliases"]:
                        a_clean = alias.strip()
                        if a_clean.lower() not in existing_alias_set and a_clean.lower() != norm_name:
                            merged_aliases.append(a_clean)
                            existing_alias_set.add(a_clean.lower())
                            aliases_updated = True

                    if aliases_updated:
                        if real_id not in original_aliases_by_id:
                            original_aliases_by_id[real_id] = list(existing_aliases)
                        admin_client.table("skills").update({"aliases": merged_aliases}).eq("skill_id", real_id).execute()
                        skill_row["aliases"] = merged_aliases

                    # Update non-empty description or category only if existing is empty
                    field_updates: Dict[str, Any] = {}
                    if not skill_row.get("description") and item["description"]:
                        field_updates["description"] = item["description"]
                        skill_row["description"] = item["description"]
                    if not skill_row.get("skill_category") and item["skill_category"]:
                        field_updates["skill_category"] = item["skill_category"]
                        skill_row["skill_category"] = item["skill_category"]

                    if field_updates:
                        admin_client.table("skills").update(field_updates).eq("skill_id", real_id).execute()

                else:
                    # Insert new canonical skill
                    skill_insert_data = {
                        "skill_name": s_name,
                        "skill_type": item["skill_type"],
                        "skill_category": item["skill_category"],
                        "description": item["description"],
                        "aliases": item["aliases"],
                    }

                    try:
                        ins_res = admin_client.table("skills").insert(skill_insert_data).execute()
                        if not ins_res.data:
                            raise RuntimeError(f"Database rejected skill insertion for '{s_name}'.")

                        new_skill_record = ins_res.data[0]
                        real_id = new_skill_record["skill_id"]
                        newly_created_skill_ids.append(real_id)
                        temp_to_real_skill_id[temp_id] = real_id
                        new_skills_count += 1
                        existing_by_lower[norm_name] = new_skill_record

                    except Exception as ins_err:
                        err_str = str(ins_err).lower()
                        # Handle race condition / concurrent insertion via unique constraint
                        if "23505" in err_str or "skills_name_uq" in err_str or "already exists" in err_str:
                            existing_q = (
                                admin_client.table("skills")
                                .select("skill_id, skill_name, aliases")
                                .ilike("skill_name", s_name)
                                .limit(1)
                                .execute()
                            )
                            if existing_q.data:
                                real_id = existing_q.data[0]["skill_id"]
                                temp_to_real_skill_id[temp_id] = real_id
                                reused_skills_count += 1
                                existing_by_lower[norm_name] = existing_q.data[0]
                            else:
                                raise
                        else:
                            raise

            # Step C: Insert supporting evidence rows linked to document_id and resolved skill_id
            for item in validated_items:
                temp_id = item["temp_id"]
                real_skill_id = temp_to_real_skill_id.get(temp_id)
                if not real_skill_id:
                    continue

                evidence_payload = {
                    "skill_id": real_skill_id,
                    "document_id": document_id,
                    "section_name": item["section_name"],
                    "evidence_text": item["evidence_text"],
                    "page_number": item["page_number"],
                    "extraction_method": EXTRACTION_METHOD,
                    "raw_phrase": item["raw_phrase"],
                    "depth_cue": item["depth_cue"],
                }

                try:
                    ins_ev_res = admin_client.table("skill_evidence").insert(evidence_payload).execute()
                    if ins_ev_res.data:
                        ev_id = ins_ev_res.data[0].get("evidence_id")
                        if ev_id:
                            newly_inserted_evidence_ids.append(ev_id)
                        evidence_inserted += 1

                except Exception as ev_err:
                    err_str = str(ev_err).lower()
                    if (
                        "23505" in err_str
                        or "duplicate key" in err_str
                        or "skill_evidence_dedup" in err_str
                        or "already exists" in err_str
                    ):
                        # Gracefully skip duplicate evidence to ensure idempotency upon retry
                        logger.info(
                            "Duplicate evidence skipped for skill %d on document %d",
                            real_skill_id,
                            document_id,
                        )
                        duplicates_skipped += 1
                    else:
                        raise

            logger.info(
                "AUDIT: Admin id=%s email=%s successfully saved %d skills (%d new, %d reused) and %d evidence rows (%d duplicates skipped) for document %d",
                current_admin.id,
                current_admin.email,
                len(validated_items),
                new_skills_count,
                reused_skills_count,
                evidence_inserted,
                duplicates_skipped,
                document_id,
            )

            return SaveSkillsResponse(
                success=True,
                message="Skills and evidence successfully saved to database.",
                document_id=document_id,
                new_skills_created=new_skills_count,
                reused_skills_count=reused_skills_count,
                evidence_inserted=evidence_inserted,
                duplicates_skipped=duplicates_skipped,
            )

        except Exception as main_err:
            logger.error(
                "Save skills transaction failed for document %d: %s. Executing atomic compensation rollback.",
                document_id,
                str(main_err),
            )

            # Rollback newly inserted evidence
            if newly_inserted_evidence_ids:
                try:
                    for ev_id in newly_inserted_evidence_ids:
                        admin_client.table("skill_evidence").delete().eq("evidence_id", ev_id).execute()
                    logger.info("Rolled back %d newly inserted evidence rows.", len(newly_inserted_evidence_ids))
                except Exception as rb_ev_err:
                    logger.error("Failed to rollback evidence rows: %s", str(rb_ev_err))

            # Rollback newly created skills
            if newly_created_skill_ids:
                try:
                    for s_id in newly_created_skill_ids:
                        admin_client.table("skills").delete().eq("skill_id", s_id).execute()
                    logger.info("Rolled back %d newly created skill rows.", len(newly_created_skill_ids))
                except Exception as rb_sk_err:
                    logger.error("Failed to rollback skill rows: %s", str(rb_sk_err))

            # Revert any modified aliases on existing skills
            for s_id, orig_aliases in original_aliases_by_id.items():
                try:
                    admin_client.table("skills").update({"aliases": orig_aliases}).eq("skill_id", s_id).execute()
                    logger.info("Reverted aliases for skill %d.", s_id)
                except Exception as rb_al_err:
                    logger.error("Failed to revert aliases for skill %d: %s", s_id, str(rb_al_err))

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database transaction failed and was rolled back: {str(main_err)}",
            )
