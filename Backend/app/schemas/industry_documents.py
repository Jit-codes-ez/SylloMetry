from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field

DocumentTypeLiteral = Literal[
    "qualification_file",
    "job_description",
]

RelationshipTypeLiteral = Literal[
    "aligned_nco",
    "target_role",
]

ALLOWED_DOCUMENT_TYPES = (
    "qualification_file",
    "job_description",
)

ALLOWED_RELATIONSHIP_TYPES = (
    "aligned_nco",
    "target_role",
)


class DocumentRegistrationRequest(BaseModel):
    """Payload to register an uploaded storage PDF into industry_documents."""
    document_name: str = Field(..., min_length=1, max_length=255, description="Document display name")
    document_type: str = Field(..., description="Classification type from allowlist")
    issuing_organization: Optional[str] = Field(default=None, max_length=255, description="Issuing body, e.g. NSDC / NCVET")
    source_url: Optional[str] = Field(default=None, description="Original source or reference URL")
    published_date: Optional[str] = Field(default=None, description="Date of publication (YYYY-MM-DD or string)")
    storage_path: str = Field(..., min_length=5, description="Target path in Supabase storage bucket")


class LinkedOccupationItem(BaseModel):
    """Occupation linked to a registered industry document."""
    id: int = Field(..., description="ID from document_occupations join table")
    occupation_code: str = Field(default="", description="e.g. 2522.0201 NCO code")
    occupation_name: str = Field(default="", description="Name of occupation")
    relationship_type: str = Field(..., description="'aligned_nco' or 'target_role'")
    occupation_id: Optional[Any] = Field(default=None, description="Legacy field for backward compatibility")
    classification_system: Optional[str] = Field(default="NCO", description="Legacy classification system")
    classification_code: Optional[str] = Field(default=None, description="Legacy code field")


class IndustryDocumentItem(BaseModel):
    """Registered industry document representation."""
    document_id: int
    document_name: str
    document_type: str
    issuing_organization: Optional[str] = None
    source_url: Optional[str] = None
    published_date: Optional[str] = None
    storage_path: str
    occupations: List[LinkedOccupationItem] = Field(default_factory=list)


class AddOccupationRequest(BaseModel):
    """Payload to link an occupation to a document."""
    classification_system: str = Field(..., min_length=1, max_length=100, description="e.g. NCO-2015")
    classification_code: str = Field(..., min_length=1, max_length=100, description="Unique code within system")
    occupation_name: str = Field(..., min_length=1, max_length=255, description="Occupation title")
    relationship_type: str = Field(..., description="'aligned_nco' or 'target_role'")


class AddOccupationResponse(BaseModel):
    success: bool = True
    message: str
    link: LinkedOccupationItem


class DeleteOccupationResponse(BaseModel):
    success: bool = True
    message: str


class PagePreviewItem(BaseModel):
    """Summary and snippet of extracted page text."""
    page_number: int = Field(..., description="1-indexed page number")
    char_count: int = Field(..., description="Total characters extracted on this page")
    snippet: str = Field(..., description="First 300 characters of cleaned text")
    low_text: bool = Field(..., description="True if char_count < 200 (likely scanned)")
    page_text: Optional[str] = Field(default=None, description="Full text when single page requested")


class DocumentTextPreviewResponse(BaseModel):
    """Response returned for document text preview."""
    document_id: int
    document_name: str
    storage_path: str
    total_pages: int
    pages: List[PagePreviewItem] = Field(default_factory=list)
    single_page: Optional[PagePreviewItem] = None


# ==============================================================================
# Part 3: Extraction Preview & Occupation Persistence Schemas
# ==============================================================================

class CompleteExtractedPageItem(BaseModel):
    """Complete page text preserving page boundary, number, and status."""
    page_number: int = Field(..., description="1-based page number")
    text: str = Field(..., description="Full cleaned extracted text for this page")
    char_count: int = Field(..., description="Character count on this page")
    is_empty: bool = Field(default=False, description="True if page contains 0 extractable text")


class ExtractedOccupationItem(BaseModel):
    """Extracted or registered occupation item with source page tracking."""
    occupation_code: str = Field(..., max_length=20, description="Occupation / NCO code as string (preserving dots)")
    occupation_name: str = Field(default="", max_length=255, description="Occupation or Role title")
    source_page: Optional[int] = Field(default=None, description="Source page number where extracted")


class DocumentExtractionPreviewResponse(BaseModel):
    """Combined preview response containing complete page-wise text and extracted occupations."""
    success: bool = True
    document_id: int
    document_name: str
    document_type: str
    storage_path: str
    total_pages: int
    total_characters: int
    pages: List[CompleteExtractedPageItem] = Field(default_factory=list)
    occupations: List[ExtractedOccupationItem] = Field(default_factory=list)
    is_already_submitted: bool = Field(default=False, description="True if document already has linked occupations saved")


class OccupationSubmitItem(BaseModel):
    """Single occupation record to validate and persist."""
    occupation_code: str = Field(..., min_length=1, max_length=20, description="String code preserving dots/punctuation")
    occupation_name: str = Field(..., min_length=1, max_length=255, description="Role or Occupation title")
    source_page: Optional[int] = Field(default=None, description="Optional source page number")


class BatchSaveOccupationsRequest(BaseModel):
    """Request payload to save edited occupations and link them to document."""
    occupations: List[OccupationSubmitItem] = Field(..., min_items=1, description="List of at least one valid occupation")


class BatchSaveOccupationsResponse(BaseModel):
    """Response after saving occupations and associations."""
    success: bool = True
    message: str
    document_id: int
    relationship_type: str
    saved_count: int
    occupations: List[OccupationSubmitItem] = Field(default_factory=list)
