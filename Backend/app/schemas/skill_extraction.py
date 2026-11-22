from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# 1. Pydantic Models for Structured Output from Gemini LLM
# -----------------------------------------------------------------------------

class ExtractedSkillItem(BaseModel):
    """A single skill extracted by Gemini from a 2-page window."""
    skill_name: str = Field(
        ...,
        description="A short, standard canonical noun phrase without action verbs, e.g. 'Wireshark', 'Subnetting', 'Docker', 'OpenStack'",
    )
    skill_type: str = Field(
        ...,
        description="One of: tool, technique, concept, domain_knowledge",
    )
    skill_category: Optional[str] = Field(
        default=None,
        description="Broad technical domain or category, e.g. 'Network Security', 'Cloud Infrastructure', 'Web Development'",
    )
    description: Optional[str] = Field(
        default=None,
        description="Brief concise technical description of what this skill entails",
    )
    depth_cue: str = Field(
        ...,
        description="The main verb or cognitive depth cue from the source in lowercase, e.g. 'understand', 'configure', 'install', 'troubleshoot'",
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
        description="The NOS heading and subsection, formatted as 'NOS <N>: <Name> | <Knowledge/Skill/Responsibility/Criteria>'",
    )
    confidence: float = Field(
        ...,
        description="Confidence score from 0.0 to 1.0",
    )
    aliases: List[str] = Field(
        default_factory=list,
        description="Common technical aliases, acronyms, or spelling variations (excluding canonical skill name), e.g. ['AD'] for Active Directory",
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
    aliases: List[str] = Field(default_factory=list)


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


class ExtractSkillsRequest(BaseModel):
    """Request payload to initiate skill extraction with admin-selected AI model."""
    model_key: str = Field(
        ...,
        description="Selected AI model key from the allowlist (e.g. 'gemini-3.5-flash-lite', 'gpt-oss-120b', 'gemini-3.1-flash-lite')",
    )
    dry_run: bool = Field(
        default=False,
        description="When true, executes extraction and validation without permanent saving",
    )


class JobStartResponse(BaseModel):
    """Response returned upon initiating a skill extraction job."""
    job_id: str
    status: str = "running"
    document_id: int
    dry_run: bool = False
    message: str = ""
    selected_model: Optional[str] = None
    model_key: Optional[str] = None
    extraction_method: Optional[str] = None


class ReviewSkillItem(BaseModel):
    """Temporary extracted skill item for in-memory / review-phase editing prior to Part 5 persistence."""
    temp_id: str = Field(
        ...,
        description="Unique temporary client/session identifier for the extracted skill record",
    )
    skill_name: str = Field(
        ...,
        description="Canonical technical skill name",
    )
    skill_type: str = Field(
        ...,
        description="One of: tool, technique, concept, domain_knowledge",
    )
    skill_category: Optional[str] = Field(
        default="",
        description="Broad technical category or domain",
    )
    description: Optional[str] = Field(
        default="",
        description="Brief technical description of what the skill entails",
    )
    depth_cue: Optional[str] = Field(
        default="",
        description="Cognitive depth cue or main action verb in lowercase",
    )
    raw_phrase: Optional[str] = Field(
        default="",
        description="Raw phrase as stated in source document",
    )
    evidence_quote: str = Field(
        ...,
        description="Exact contiguous quotation from source text",
    )
    page_number: int = Field(
        ...,
        description="Stated 1-based source page number",
    )
    verified_page_number: Optional[int] = Field(
        default=None,
        description="Verified 1-based page number after PDF text matching",
    )
    quote_validation_status: str = Field(
        default="exact_page_match",
        description="Verification result: exact_page_match, page_mismatch, quote_not_found, invalid_quote",
    )
    section_name: Optional[str] = Field(
        default="",
        description="Source section or NOS heading",
    )
    confidence_score: float = Field(
        default=0.0,
        description="Temporary review confidence score (0.0 to 1.0)",
    )
    aliases: List[str] = Field(
        default_factory=list,
        description="Technical aliases or abbreviations",
    )
    extraction_method: Optional[str] = Field(
        default=None,
        description="Standardized extraction method identifier 'llm/<model-id>/<version>'",
    )


class JobStatusResponse(BaseModel):
    """Response returned when polling extraction job status."""
    job_id: str
    status: str  # "running" | "done" | "completed" | "completed_with_warnings" | "failed"
    progress: ExtractionProgress
    summary: Optional[ExtractionSummary] = None
    session_id: Optional[str] = None
    error: Optional[str] = None
    selected_model: Optional[str] = None
    model_key: Optional[str] = None
    extraction_method: Optional[str] = None
    extracted_skills: List[ReviewSkillItem] = Field(
        default_factory=list,
        description="List of extracted skills available for administrator review and editing",
    )


class GeminiModelItem(BaseModel):
    """Metadata of an allowlisted AI model (Gemini or Groq) for UI display."""
    model_key: str
    model_id: str
    provider: str = Field(default="gemini", description="AI Provider: 'gemini' or 'groq'")
    display_name: str
    tag: Optional[str] = None
    description: str
    is_enabled: bool = True


class GeminiModelsListResponse(BaseModel):
    """Response containing list of supported AI models."""
    success: bool = True
    models: List[GeminiModelItem]


# Aliases for broader AI models terminology
AIModelItem = GeminiModelItem
AIModelsListResponse = GeminiModelsListResponse


class RetryJobResponse(BaseModel):
    """Response returned when retrying failed extraction windows."""
    job_id: str
    status: str
    document_id: int
    message: str
    retrying_windows: List[int] = Field(default_factory=list)


class DeletePendingEvidenceResponse(BaseModel):
    """Response returned when deleting pending skill evidence for a document."""
    success: bool = True
    message: str
    deleted_count: int
    document_id: int


class SaveSkillsRequest(BaseModel):
    """Request payload containing administrator-reviewed skills to persist."""
    skills: List[ReviewSkillItem] = Field(
        ...,
        description="List of reviewed and edited skills with supporting evidence to save",
    )


class SaveSkillsResponse(BaseModel):
    """Response returned upon saving skills and evidence to the database."""
    success: bool = True
    message: str
    document_id: int
    new_skills_created: int
    reused_skills_count: int
    evidence_inserted: int
    duplicates_skipped: int
