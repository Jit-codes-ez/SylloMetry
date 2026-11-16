from typing import List, Literal, Optional
from pydantic import BaseModel, Field

DocumentTypeLiteral = Literal[
    "qualification_file",
    "job_description",
    "certification_guide",
    "hiring_assessment_syllabus",
    "industry_report",
]

RelationshipTypeLiteral = Literal[
    "aligned_nco",
    "target_role",
]

ALLOWED_DOCUMENT_TYPES = (
    "qualification_file",
    "job_description",
    "certification_guide",
    "hiring_assessment_syllabus",
    "industry_report",
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
    occupation_id: int = Field(..., description="ID from occupations table")
    classification_system: str = Field(..., description="e.g. NCO-2015, O*NET")
    classification_code: str = Field(..., description="e.g. 2512.0101")
    occupation_name: str = Field(..., description="Name of occupation")
    relationship_type: str = Field(..., description="'aligned_nco' or 'target_role'")


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
