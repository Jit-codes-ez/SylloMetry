import logging
import re
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from app.core.supabase import get_supabase_admin_client
from app.schemas.admin import SafeAdmin
from app.schemas.industry_documents import (
    BatchSaveOccupationsRequest,
    BatchSaveOccupationsResponse,
    OccupationSubmitItem,
)

logger = logging.getLogger("app.services.occupation_extraction")


def clean_line_whitespace(line: str) -> str:
    """Collapses runs of whitespace within a line."""
    return re.sub(r"[ \t]+", " ", line).strip()


def extract_occupations_from_pages(
    pages_data: List[Dict[str, Any]],
    document_type: str = "qualification_file",
) -> List[Dict[str, Any]]:
    """
    Deterministically extracts occupations from page-wise text without an LLM.
    - For qualification_file: Prioritizes Section 1, Field 14 (Aligned to NCO/ISCO Code/s).
    - For job_description: Extracts explicitly stated Job Titles/Roles.
    Never invents missing occupation names.
    Returns: List of dicts with 'occupation_code', 'occupation_name', 'source_page'.
    """
    if document_type == "job_description":
        return _extract_job_description_occupations(pages_data)
    return _extract_qualification_occupations(pages_data)


def _extract_qualification_occupations(pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extracts NCO / ISCO occupation codes and names from Qualification Files.
    Focuses on Section 1, Field 14: 'Aligned to NCO/ISCO Code/s'.
    Supports:
    - Codes with parenthesized names: '2522.0201 (Security Analyst)'
    - Multiple codes on same or separate lines
    - Codes without names: '2512.0100' -> occupation_name is ''
    - Preserves exact dotted code string (e.g. '2522.0201')
    """
    results: List[Dict[str, Any]] = []

    # Regex targeting start of Field 14
    field_14_start_regex = re.compile(
        r"(?:14\.\s*)?(?:Aligned\s+to\s+)?NCO[\s/]*ISCO(?:\s+Code[/s]*)?",
        re.IGNORECASE,
    )
    # Stop before next numbered item (e.g. 15.)
    next_field_regex = re.compile(r"\n\s*15\.\s*", re.IGNORECASE)

    # 1. First pass: look inside Field 14 section
    for page in pages_data:
        p_no = page.get("page_number", 1)
        text = page.get("text", "")
        if not text:
            continue

        start_match = field_14_start_regex.search(text)
        if start_match:
            start_pos = start_match.end()
            end_match = next_field_regex.search(text, start_pos)
            section_text = (
                text[start_pos : end_match.start()]
                if end_match
                else text[start_pos : start_pos + 600]
            )

            found_in_section = _parse_nco_section_text(section_text, p_no)
            if found_in_section:
                results.extend(found_in_section)

    # 2. Fallback pass: if Field 14 header was not matched, scan pages mentioning 'nco'
    if not results:
        for page in pages_data:
            p_no = page.get("page_number", 1)
            text = page.get("text", "")
            if not text or "nco" not in text.lower():
                continue
            found = _parse_nco_section_text(text, p_no)
            if found:
                results.extend(found)

    # Deduplicate by occupation_code preserving order
    deduped: List[Dict[str, Any]] = []
    seen_codes = set()
    for item in results:
        code = item["occupation_code"]
        if code and code not in seen_codes:
            seen_codes.add(code)
            deduped.append(item)

    return deduped


def _parse_nco_section_text(text: str, page_num: int) -> List[Dict[str, Any]]:
    """
    Parses a text block looking for NCO codes and accompanying occupation names.
    Preserves exact dotted code string (e.g. '2522.0201').
    """
    items: List[Dict[str, Any]] = []
    lines = text.splitlines()

    for line in lines:
        cleaned_line = clean_line_whitespace(line)
        if not cleaned_line:
            continue

        # Skip boilerplate parenthetical guidance
        if (
            "if no code is available" in cleaned_line.lower()
            or "mention the same" in cleaned_line.lower()
        ):
            continue

        # Split items if comma or semicolon separated on the same line
        subparts = re.split(r"[,;]|\band\b", cleaned_line, flags=re.IGNORECASE)
        for part in subparts:
            # Strip standard NCO prefixes like 'NCO-2015 Code:', 'NCO-2015/', 'NCO:'
            part_no_prefix = re.sub(
                r"\b(NCO|ISCO)[-_ ]*(2015|2008|\d{4})?\b",
                "",
                part,
                flags=re.IGNORECASE,
            )
            part_no_prefix = re.sub(
                r"\bCode\s*[:/]?\s*", "", part_no_prefix, flags=re.IGNORECASE
            ).strip()

            # Match 4-digit dotted codes (e.g. 2522.0201, 2511.9900) or 4-digit standalone NCO codes
            code_match = re.search(
                r"(\b\d{4}\.\d{2,4}\b|\b[1-9]\d{3}\b)", part_no_prefix
            )
            if not code_match:
                continue

            code = code_match.group(1).strip()
            # Ignore year 2015 or common years if accidentally matched
            if code in ("2015", "2008", "2016", "2024", "2025", "2026"):
                continue

            # Look for occupation name following the code
            after_code = part_no_prefix[code_match.end() :].strip(" :/–-")
            name = ""

            # Case A: Name enclosed in parentheses, e.g. (Security Analyst)
            paren_match = re.search(r"\(([^)]+)\)", after_code)
            if paren_match:
                candidate = paren_match.group(1).strip()
                if any(c.isalpha() for c in candidate):
                    name = candidate
            elif after_code:
                # Case B: Name directly following code without parentheses
                candidate = after_code.strip("() ")
                if any(c.isalpha() for c in candidate):
                    name = candidate

            items.append({
                "occupation_code": code,
                "occupation_name": name,
                "source_page": page_num,
            })

    return items


def _extract_job_description_occupations(pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extracts explicitly stated Job Titles / Roles for Job Description documents.
    If no reliable title is found, returns an empty list so the administrator can provide it.
    """
    results: List[Dict[str, Any]] = []
    title_patterns = [
        re.compile(
            r"(?:Job\s+Title|Position\s+Title|Position|Role|Designation)\s*[:\-–]\s*([^\n\r]+)",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?:Job\s+Description\s+for|Hiring\s+for|Looking\s+for)\s*[:\-–]?\s*([^\n\r]+)",
            re.IGNORECASE,
        ),
    ]
    code_pattern = re.compile(
        r"(?:Job\s*Code|Req(?:uisition)?\s*(?:ID|#|Code)?|Position\s*Code|Role\s*ID|NCO[\w-]*)\s*[:\-–]\s*([\w\.-]+)",
        re.IGNORECASE,
    )

    for page in pages_data[:3]:
        p_no = page.get("page_number", 1)
        text = page.get("text", "")
        if not text:
            continue

        detected_code = ""
        detected_title = ""

        code_match = code_pattern.search(text)
        if code_match:
            detected_code = code_match.group(1).strip()

        for pat in title_patterns:
            m = pat.search(text)
            if m:
                raw_title = m.group(1).strip()
                # Split off non-title metadata like Location, Date, Experience
                clean_title = re.split(
                    r"[\(\[\{]|\bDate\b|\bLocation\b|\bExperience\b|\bDepartment\b",
                    raw_title,
                    flags=re.IGNORECASE,
                )[0].strip(" -:–")
                if 3 <= len(clean_title) <= 100:
                    detected_title = clean_title
                    break

        if detected_title:
            results.append({
                "occupation_code": detected_code,
                "occupation_name": detected_title,
                "source_page": p_no,
            })
            break

    return results


def save_document_occupations_batch(
    document_id: int,
    payload: BatchSaveOccupationsRequest,
    current_admin: SafeAdmin,
) -> BatchSaveOccupationsResponse:
    """
    Atomically validates and persists edited occupations into public.occupations
    and associations into public.document_occupations for the specified document.
    - Enforces correct relationship_type ('aligned_nco' for qualification_file, 'target_role' for job_description)
    - Enforces uniqueness and prevents duplicates
    - Performs atomic synchronization with rollback on failure
    """
    admin_client = get_supabase_admin_client()
    if not admin_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database service unavailable. Admin client could not be initialized.",
        )

    # 1. Verify document exists and retrieve its document_type
    doc_res = (
        admin_client.table("industry_documents")
        .select("*")
        .eq("document_id", document_id)
        .limit(1)
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Industry document with ID {document_id} not found.",
        )

    doc_record = doc_res.data[0]
    category = doc_record.get("document_type") or "qualification_file"
    relationship_type = (
        "aligned_nco" if category == "qualification_file" else "target_role"
    )

    # 2. Strict validation of input occupations
    if not payload.occupations or len(payload.occupations) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one valid occupation or role must be provided.",
        )

    validated_occupations: List[Dict[str, Any]] = []
    seen_codes = set()

    for idx, item in enumerate(payload.occupations):
        code = str(item.occupation_code).strip()
        name = str(item.occupation_name).strip()

        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {idx + 1}: Occupation Code cannot be empty.",
            )
        if len(code) > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {idx + 1}: Occupation Code '{code}' exceeds maximum allowed length of 20 characters.",
            )
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {idx + 1}: Occupation Name cannot be empty.",
            )
        if len(name) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {idx + 1}: Occupation Name exceeds maximum allowed length of 255 characters.",
            )

        if code.lower() in seen_codes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate occupation code '{code}' detected. Each occupation code in the document must be unique.",
            )
        seen_codes.add(code.lower())

        validated_occupations.append({
            "occupation_code": code,
            "occupation_name": name,
            "source_page": item.source_page,
        })

    # 3. Snapshot existing associations for this document & relationship_type for rollback
    existing_links_res = (
        admin_client.table("document_occupations")
        .select("*")
        .eq("document_id", document_id)
        .eq("relationship_type", relationship_type)
        .execute()
    )
    original_links = existing_links_res.data or []

    # 4. Atomic execution & synchronization
    try:
        # A. Upsert occupations into public.occupations
        occ_rows = [
            {
                "occupation_code": o["occupation_code"],
                "occupation_name": o["occupation_name"],
            }
            for o in validated_occupations
        ]
        admin_client.table("occupations").upsert(
            occ_rows, on_conflict="occupation_code"
        ).execute()

        # B. Upsert document_occupations links
        doc_occ_rows = [
            {
                "document_id": document_id,
                "occupation_code": o["occupation_code"],
                "relationship_type": relationship_type,
            }
            for o in validated_occupations
        ]
        admin_client.table("document_occupations").upsert(
            doc_occ_rows,
            on_conflict="document_id,occupation_code,relationship_type",
        ).execute()

        # C. Remove any previously associated occupations that the admin deleted from this document
        submitted_codes = [o["occupation_code"] for o in validated_occupations]
        to_remove = [
            row["occupation_code"]
            for row in original_links
            if row["occupation_code"] not in submitted_codes
        ]
        if to_remove:
            (
                admin_client.table("document_occupations")
                .delete()
                .eq("document_id", document_id)
                .eq("relationship_type", relationship_type)
                .in_("occupation_code", to_remove)
                .execute()
            )

        logger.info(
            "AUDIT: Admin id=%s email=%s saved %d occupations for document_id=%d (%s)",
            current_admin.id,
            current_admin.email,
            len(validated_occupations),
            document_id,
            relationship_type,
        )

        return BatchSaveOccupationsResponse(
            success=True,
            message="Occupations saved and associated successfully.",
            document_id=document_id,
            relationship_type=relationship_type,
            saved_count=len(validated_occupations),
            occupations=[
                OccupationSubmitItem(
                    occupation_code=o["occupation_code"],
                    occupation_name=o["occupation_name"],
                    source_page=o.get("source_page"),
                )
                for o in validated_occupations
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Database error during save_document_occupations_batch for doc %d: %s. Initiating rollback.",
            document_id,
            str(e),
        )
        # Rollback step: restore original links if possible
        try:
            current_codes = [o["occupation_code"] for o in validated_occupations]
            (
                admin_client.table("document_occupations")
                .delete()
                .eq("document_id", document_id)
                .eq("relationship_type", relationship_type)
                .in_("occupation_code", current_codes)
                .execute()
            )
            if original_links:
                for link in original_links:
                    admin_client.table("document_occupations").upsert(
                        {
                            "document_id": document_id,
                            "occupation_code": link["occupation_code"],
                            "relationship_type": link["relationship_type"],
                        },
                        on_conflict="document_id,occupation_code,relationship_type",
                    ).execute()
        except Exception as rollback_err:
            logger.critical(
                "Rollback failed for document_id %d: %s",
                document_id,
                str(rollback_err),
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist occupations: {str(e)}",
        )
