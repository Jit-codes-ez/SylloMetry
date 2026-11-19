from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class QuoteValidationStatus:
    EXACT_PAGE_MATCH = "exact_page_match"
    PAGE_MISMATCH = "page_mismatch"
    QUOTE_NOT_FOUND = "quote_not_found"
    INVALID_QUOTE = "invalid_quote"


class ReviewPriority:
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ReviewStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EvidenceReviewItem(BaseModel):
    """A single supporting evidence record inside the review workspace."""
    evidence_id: str = Field(..., description="Unique staging UUID for the evidence record")
    temp_skill_id: str = Field(..., description="Reference to parent temporary skill UUID")
    evidence_quote: str = Field(..., description="Contiguous evidence quote from the PDF")
    original_page_number: int = Field(..., description="Original page number reported by Gemini")
    verified_page_number: Optional[int] = Field(None, description="Programmatically verified PDF page number")
    quote_validation_status: str = Field(
        ...,
        description="One of: exact_page_match, page_mismatch, quote_not_found, invalid_quote",
    )
    section_name: str = Field(..., description="NOS or section heading")
    raw_phrase: str = Field(..., description="Raw competency phrase as worded in the source")
    depth_cue: str = Field(..., description="Active verb or depth cue from the phrase")
    confidence_score: float = Field(..., description="Gemini model confidence score (up to 4 decimals)")
    review_priority: str = Field("low", description="Priority level: high, medium, low")
    review_status: str = Field("pending", description="Current review decision: pending, approved, rejected")
    validation_warnings: List[str] = Field(default_factory=list, description="Automated quality warnings")
    is_edited: bool = Field(False, description="True if edited by an administrator")


class SkillReviewItem(BaseModel):
    """A canonical skill candidate undergoing administrative review."""
    skill_id: str = Field(..., description="Unique staging UUID for the skill")
    canonical_name: str = Field(..., description="Standardized canonical noun phrase")
    skill_type: str = Field(..., description="One of: tool, technique, concept, domain_knowledge")
    skill_category: Optional[str] = Field(None, description="Optional high-level skill category")
    description: Optional[str] = Field(None, description="Optional skill description")
    aliases: List[str] = Field(default_factory=list, description="Common technical aliases and acronyms")
    evidence_items: List[EvidenceReviewItem] = Field(default_factory=list, description="Associated evidence records")
    review_priority: str = Field("low", description="Priority level: high, medium, low")
    review_status: str = Field("pending", description="Current review decision: pending, approved, rejected")
    validation_warnings: List[str] = Field(default_factory=list, description="Automated quality warnings")
    existing_canonical_id: Optional[int] = Field(None, description="Existing skills table ID if matching in DB")
    existing_type_conflict: Optional[str] = Field(None, description="Previous skill_type if different in DB")
    is_edited: bool = Field(False, description="True if edited by an administrator")


class ReviewSessionSummary(BaseModel):
    """Real-time calculated metrics and approval readiness for a review session."""
    total_skills: int = 0
    total_evidence: int = 0
    needs_review_count: int = 0
    passed_checks_count: int = 0
    failed_checks_count: int = 0
    approved_skills_count: int = 0
    approved_evidence_count: int = 0
    rejected_skills_count: int = 0
    rejected_evidence_count: int = 0
    approval_progress_percent: float = 0.0
    can_submit_approval: bool = False
    blocking_reasons: List[str] = Field(default_factory=list)


class ReviewSessionResponse(BaseModel):
    """Complete persistent review session response returned to the frontend."""
    session_id: str
    document_id: int
    document_name: str
    issuing_organization: Optional[str] = None
    document_type: str
    storage_path: str
    occupations: List[Dict[str, Any]] = Field(default_factory=list)
    pdf_url: Optional[str] = None
    status: str = "in_review"  # "in_review" | "approved_and_saved"
    extraction_status: str = "completed"  # "in_progress" | "completed" | "completed_with_warnings" | "failed"
    failed_windows: List[Dict[str, Any]] = Field(default_factory=list)
    skills: List[SkillReviewItem] = Field(default_factory=list)
    summary: ReviewSessionSummary
    created_at: float
    updated_at: float
    created_by_admin: Optional[str] = None


class UpdateSkillRequest(BaseModel):
    """Payload to update an extracted skill during review."""
    canonical_name: Optional[str] = None
    skill_type: Optional[str] = None
    skill_category: Optional[str] = None
    description: Optional[str] = None
    aliases: Optional[List[str]] = None


class UpdateEvidenceRequest(BaseModel):
    """Payload to update an extracted evidence record during review."""
    evidence_quote: Optional[str] = None
    page_number: Optional[int] = None
    section_name: Optional[str] = None
    raw_phrase: Optional[str] = None
    depth_cue: Optional[str] = None


class ApproveRejectRequest(BaseModel):
    """Payload to set approval decision on an item."""
    status: str = Field(..., description="Target decision: approved, rejected, or pending")


class BulkReviewActionRequest(BaseModel):
    """Payload for permitted bulk operations."""
    action: str = Field(
        ...,
        description="Action type: approve_evidence, reject_evidence, update_skill_type, approve_low_priority",
    )
    evidence_ids: Optional[List[str]] = None
    skill_ids: Optional[List[str]] = None
    target_skill_type: Optional[str] = None


class FinalApprovalResponse(BaseModel):
    """Response returned upon committing the approved dataset into permanent D2 tables."""
    success: bool = True
    message: str
    document_id: int
    new_skills_created: int
    reused_skills_count: int
    evidence_inserted: int
    excluded_evidence_count: int
