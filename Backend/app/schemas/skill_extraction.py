from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# 1. Pydantic Models for Structured Output from Gemini LLM
# -----------------------------------------------------------------------------

class ExtractedSkillItem(BaseModel):
    """A single skill extracted by Gemini from a 2-page window."""
    skill_name: str = Field(
        ...,
        description="A short, standard name without verbs, e.g. 'Wireshark', 'Subnetting', 'Docker', 'SQL injection'",
    )
    skill_type: str = Field(
        ...,
        description="One of: tool, technique, concept, domain_knowledge, soft_skill",
    )
    depth_cue: str = Field(
        ...,
        description="The main verb from the source phrase in lowercase, e.g. 'understand', 'configure', 'create'",
    )
    raw_phrase: str = Field(
        ...,
        description="The skill as worded in the source",
    )
    evidence_quote: str = Field(
        ...,
        description="Copied EXACTLY, character for character, as one contiguous passage of at most 300 characters from the page text",
    )
    page_number: int = Field(
        ...,
        description="The page number where the quote appears",
    )
    section_name: str = Field(
        ...,
        description="The NOS or section heading, e.g. 'NOS 3 | NIE/ITS/N0906 | Cryptography and Ethical Hacking'",
    )
    confidence: float = Field(
        ...,
        description="Confidence score from 0.0 to 1.0",
    )


class WindowExtractionLLMResponse(BaseModel):
    """The structured JSON response expected per window of 2 pages."""
    last_section_seen: Optional[str] = Field(
        default=None,
        description="The last NOS or section heading seen in the window",
    )
    items: List[ExtractedSkillItem] = Field(
        default_factory=list,
        description="List of extracted skills from the window",
    )


# -----------------------------------------------------------------------------
# 2. API Request and Response Models
# -----------------------------------------------------------------------------

class ExtractionProgress(BaseModel):
    """Real-time progress metrics of an in-flight extraction job."""
    windows_done: int = 0
    total_windows: int = 0
    current_step: str = ""


class SampleAcceptedItem(BaseModel):
    """Accepted skill sample for UI inspection (especially during dry runs)."""
    skill_name: str
    skill_type: str
    depth_cue: str
    raw_phrase: str
    evidence_quote: str
    page_number: int
    section_name: str
    confidence: float


class SampleRejectedItem(BaseModel):
    """Rejected item sample with explicit explanation for auditing."""
    item: Dict[str, Any]
    reason: str


class ExtractionSummary(BaseModel):
    """Final aggregated statistics and audit samples for an extraction job."""
    pages_total: int = 0
    windows_total: int = 0
    windows_processed: int = 0
    windows_failed: int = 0
    items_returned_by_llm: int = 0
    items_rejected_quote_not_found: int = 0
    items_rejected_invalid_fields: int = 0
    evidence_inserted: int = 0
    duplicates_skipped: int = 0
    new_skills_created: int = 0
    duration_seconds: float = 0.0
    dry_run: bool = False
    sample_accepted_items: List[SampleAcceptedItem] = Field(default_factory=list)
    sample_rejected_items: List[SampleRejectedItem] = Field(default_factory=list)


class JobStartResponse(BaseModel):
    """Response returned upon initiating a skill extraction job."""
    job_id: str
    status: str = "running"
    document_id: int
    dry_run: bool
    message: str


class JobStatusResponse(BaseModel):
    """Response returned when polling extraction job status."""
    job_id: str
    status: str  # "running" | "done" | "failed"
    progress: ExtractionProgress
    summary: Optional[ExtractionSummary] = None
    error: Optional[str] = None


class DeletePendingEvidenceResponse(BaseModel):
    """Response returned when deleting pending skill evidence for a document."""
    success: bool = True
    message: str
    deleted_count: int
    document_id: int
