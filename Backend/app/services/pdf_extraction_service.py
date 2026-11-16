import logging
import re
from collections import Counter
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
import pymupdf

from app.core.config import settings
from app.core.supabase import get_supabase_admin_client
from app.schemas.industry_documents import (
    DocumentTextPreviewResponse,
    PagePreviewItem,
)

logger = logging.getLogger("app.services.pdf_extraction")

MAX_ALLOWED_PAGES = 60
LOW_TEXT_THRESHOLD_CHARS = 200
MAX_HEADER_LINE_LENGTH = 100


def clean_line_whitespace(line: str) -> str:
    """Collapses runs of whitespace within a single line while preserving content."""
    return re.sub(r"[ \t]+", " ", line).strip()


def normalize_line_digits(line: str) -> str:
    """Replaces sequences of digits with '#' to detect repeating header/footer patterns."""
    return re.sub(r"\d+", "#", line.strip())


def extract_pages(document_id: int) -> List[Dict[str, Any]]:
    """
    Core reusable extraction function for industry documents:
    - Retrieves PDF binary from Supabase Storage for given document_id
    - Enforces max 60-page threshold (rejects with 400)
    - Removes repeated header/footer lines appearing on >= 50% of pages
    - Collapses inner whitespace within lines while preserving line breaks
    - Returns structured list of pages:
      [{ "page_number": int, "text": str, "char_count": int, "low_text": bool, "snippet": str }, ...]
    Reused by document text preview and subsequent LLM skill extraction.
    """
    admin_client = get_supabase_admin_client()
    if not admin_client:
        logger.error("Supabase admin client unavailable for PDF extraction.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Storage service unavailable.",
        )

    # 1. Fetch document record to obtain storage_path
    doc_res = admin_client.table("industry_documents").select("*").eq("document_id", document_id).limit(1).execute()
    if not doc_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Industry document with ID {document_id} not found.",
        )

    doc_record = doc_res.data[0]
    storage_path = doc_record.get("storage_path")
    if not storage_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document record is missing storage_path.",
        )

    bucket_name = settings.SUPABASE_INDUSTRY_BUCKET

    # 2. Download PDF file bytes from private Supabase Storage
    try:
        pdf_bytes = admin_client.storage.from_(bucket_name).download(storage_path)
    except Exception as e:
        logger.error("Failed to download PDF '%s' from bucket '%s': %s", storage_path, bucket_name, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document file from storage: {str(e)}",
        )

    # 3. Open PDF with PyMuPDF
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error("PyMuPDF failed to parse document '%s': %s", storage_path, str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse PDF document: {str(e)}",
        )

    total_pages = len(doc)

    # 4. Enforce page limit (< 60 pages)
    if total_pages > MAX_ALLOWED_PAGES:
        logger.warning(
            "Rejected document %d (%s) exceeding %d pages: found %d pages",
            document_id,
            storage_path,
            MAX_ALLOWED_PAGES,
            total_pages,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document exceeds the {MAX_ALLOWED_PAGES}-page limit (found {total_pages} pages). Processing high-page documents is not supported.",
        )

    # 5. First pass: Collect raw lines per page & count repeating header/footer patterns
    raw_pages_lines: List[List[str]] = []
    pattern_page_counts: Counter[str] = Counter()

    for page_idx in range(total_pages):
        page = doc[page_idx]
        raw_text = page.get_text("text") or ""
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        raw_pages_lines.append(lines)

        # Count unique normalized short line patterns on this page
        page_patterns = set()
        for line in lines:
            if len(line) <= MAX_HEADER_LINE_LENGTH:
                norm = normalize_line_digits(line)
                if norm:
                    page_patterns.add(norm)

        for p in page_patterns:
            pattern_page_counts[p] += 1

    # Drop short lines that repeat on at least half of the pages (for docs with >= 2 pages)
    min_repeats_to_drop = max(2, (total_pages + 1) // 2) if total_pages >= 2 else 999999
    repeated_patterns_to_drop = {
        pattern for pattern, count in pattern_page_counts.items() if count >= min_repeats_to_drop
    }

    # 6. Second pass: Filter repeated headers/footers & clean whitespace
    extracted_results: List[Dict[str, Any]] = []

    for page_idx, lines in enumerate(raw_pages_lines):
        page_num = page_idx + 1
        cleaned_lines: List[str] = []

        for line in lines:
            norm = normalize_line_digits(line)
            if norm in repeated_patterns_to_drop:
                continue

            collapsed = clean_line_whitespace(line)
            if collapsed:
                cleaned_lines.append(collapsed)

        page_text = "\n".join(cleaned_lines).strip()
        char_count = len(page_text)
        low_text = char_count < LOW_TEXT_THRESHOLD_CHARS
        snippet = page_text[:300] if page_text else ""

        extracted_results.append({
            "page_number": page_num,
            "text": page_text,
            "char_count": char_count,
            "low_text": low_text,
            "snippet": snippet,
        })

    return extracted_results


def get_document_text_preview(
    document_id: int,
    page: Optional[int] = None,
) -> DocumentTextPreviewResponse:
    """
    Retrieves preview metrics for all pages of an industry document,
    or full text if a specific page number is requested.
    """
    admin_client = get_supabase_admin_client()
    doc_res = admin_client.table("industry_documents").select("*").eq("document_id", document_id).limit(1).execute()
    if not doc_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Industry document with ID {document_id} not found.",
        )

    doc_record = doc_res.data[0]
    pages_data = extract_pages(document_id)
    total_pages = len(pages_data)

    single_page_item: Optional[PagePreviewItem] = None

    if page is not None:
        if page < 1 or page > total_pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid page number {page}. Document has {total_pages} pages.",
            )
        target = pages_data[page - 1]
        single_page_item = PagePreviewItem(
            page_number=target["page_number"],
            char_count=target["char_count"],
            snippet=target["snippet"],
            low_text=target["low_text"],
            page_text=target["text"],
        )

    page_items = [
        PagePreviewItem(
            page_number=p["page_number"],
            char_count=p["char_count"],
            snippet=p["snippet"],
            low_text=p["low_text"],
            page_text=None,
        )
        for p in pages_data
    ]

    return DocumentTextPreviewResponse(
        document_id=doc_record["document_id"],
        document_name=doc_record["document_name"],
        storage_path=doc_record["storage_path"],
        total_pages=total_pages,
        pages=page_items,
        single_page=single_page_item,
    )
