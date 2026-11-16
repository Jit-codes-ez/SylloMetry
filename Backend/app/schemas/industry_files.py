from typing import List, Literal, Optional
from pydantic import BaseModel, Field

# Fixed allowlist of categories for industry documents
ALLOWED_INDUSTRY_CATEGORIES = (
    "qualification_file",
    "job_description",
    "certification_guide",
    "hiring_assessment_syllabus",
    "industry_report",
)

IndustryCategory = Literal[
    "qualification_file",
    "job_description",
    "certification_guide",
    "hiring_assessment_syllabus",
    "industry_report",
]


class IndustryFileItem(BaseModel):
    """Metadata representation of an industry document stored in Supabase Storage."""
    storage_path: str = Field(..., description="Object key inside bucket, e.g. category/uuid_name.pdf")
    display_name: str = Field(..., description="Original sanitized filename without UUID prefix")
    category: str = Field(..., description="Document classification category")
    size_bytes: int = Field(default=0, description="File size in bytes")
    upload_date: Optional[str] = Field(default=None, description="ISO-8601 creation/update timestamp")
    content_type: str = Field(default="application/pdf", description="MIME type of stored document")


class IndustryFileUploadResponse(BaseModel):
    """Response returned after successful industry PDF upload."""
    success: bool = True
    message: str = "Industry document uploaded successfully."
    file: IndustryFileItem


class IndustryFileListResponse(BaseModel):
    """Paginated list of stored industry documents."""
    success: bool = True
    files: List[IndustryFileItem] = Field(default_factory=list)
    total_count: int = Field(default=0, description="Total number of stored files matching filter")
    total_size_bytes: int = Field(default=0, description="Cumulative size of matching files in bytes")
    limit: int = Field(default=20, description="Page limit")
    offset: int = Field(default=0, description="Page offset")


class IndustryFileDownloadResponse(BaseModel):
    """Temporary signed URL for downloading a private industry document."""
    success: bool = True
    signed_url: str = Field(..., description="60-second temporary signed download URL")
    storage_path: str = Field(..., description="Storage path in bucket")
    display_name: str = Field(..., description="Sanitized download filename")
    expires_in_seconds: int = Field(default=60, description="Signed URL TTL in seconds")


class IndustryFileDeleteResponse(BaseModel):
    """Response returned after deleting an industry document."""
    success: bool = True
    message: str = "Industry document deleted successfully."
    storage_path: str = Field(..., description="Deleted file storage path")
