import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("app.core.gemini_models")

PROMPT_VERSION = "v2"


class GeminiModelConfig(BaseModel):
    """Centralized configuration for a supported AI model (Gemini or Groq)."""
    model_key: str = Field(..., description="Unique allowlist key for frontend and API")
    model_id: str = Field(..., description="Verified upstream provider API model identifier")
    provider: str = Field(default="gemini", description="AI Provider identifier: 'gemini' or 'groq'")
    display_name: str = Field(..., description="User-facing display name")
    tag: Optional[str] = Field(default=None, description="UI badge tag, e.g. 'Primary' or 'Better'")
    description: str = Field(..., description="User-facing descriptive explanation of the model")
    is_enabled: bool = Field(default=True, description="Whether this model is currently active and selectable")
    generation_config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Model-specific generation compatibility settings",
    )


# Backward and forward compatibility alias
AIModelConfig = GeminiModelConfig

# -----------------------------------------------------------------------------
# Supported Models Registry (Strict Backend Allowlist)
# Exactly 3 Models in Display Order:
# 1. Gemini 3.1 Flash-Lite (Standard) (Primary/Default)
# 2. Gemini 3.5 Flash-Lite (Most Reliable)
# 3. GPT-OSS 120B (Groq) (Faster)
# -----------------------------------------------------------------------------
DEFAULT_MODEL_KEY = "gemini-3.1-flash-lite"

SUPPORTED_GEMINI_MODELS: Dict[str, GeminiModelConfig] = {
    "gemini-3.1-flash-lite": GeminiModelConfig(
        model_key="gemini-3.1-flash-lite",
        model_id="gemini-3.1-flash-lite",
        provider="gemini",
        display_name="Gemini 3.1 Flash-Lite",
        tag="(Standard) (Primary/Default)",
        description="Standard primary extraction option optimized for rapid document processing, balanced consistency, and low latency.",
        is_enabled=True,
        generation_config={"temperature": 0.0},
    ),
    "gemini-3.5-flash-lite": GeminiModelConfig(
        model_key="gemini-3.5-flash-lite",
        model_id="gemini-3.5-flash-lite",
        provider="gemini",
        display_name="Gemini 3.5 Flash-Lite",
        tag="Most Reliable",
        description="Most reliable extraction model offering strict negative constraint adherence, comprehensive extraction accuracy, and high quality.",
        is_enabled=True,
        generation_config={"temperature": 0.0},
    ),
    "gpt-oss-120b": GeminiModelConfig(
        model_key="gpt-oss-120b",
        model_id="openai/gpt-oss-120b",
        provider="groq",
        display_name="GPT-OSS 120B (Groq)",
        tag="Faster",
        description="Faster open-weight reasoning model via Groq LPU inference for high-speed technical skill extraction.",
        is_enabled=True,
        generation_config={"temperature": 0.0},
    ),
}

# Alias for general AI models terminology
SUPPORTED_AI_MODELS = SUPPORTED_GEMINI_MODELS

# Alias mapping for backwards compatibility and user convenience
_MODEL_KEY_ALIASES: Dict[str, str] = {
    "gemini-3.5": "gemini-3.5-flash-lite",
    "gemini-3.5-flash-lite": "gemini-3.5-flash-lite",
    "gemini 3.5 flash lite": "gemini-3.5-flash-lite",
    "gemini 3.5 flash-lite": "gemini-3.5-flash-lite",
    "gpt-oss-120b": "gpt-oss-120b",
    "openai/gpt-oss-120b": "gpt-oss-120b",
    "gpt-oss": "gpt-oss-120b",
    "gpt 120b": "gpt-oss-120b",
    "gpt-120b": "gpt-oss-120b",
    "gpt-oss 120b": "gpt-oss-120b",
    "gpt-oss 120b (groq)": "gpt-oss-120b",
    "gemini-3.1": "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
    "gemini 3.1 flash lite": "gemini-3.1-flash-lite",
    "gemini 3.1 flash-lite": "gemini-3.1-flash-lite",
}


def get_supported_models() -> List[GeminiModelConfig]:
    """
    Returns public metadata of all enabled models for admin UI display.
    Never exposes API keys or privileged server credentials.
    """
    return [cfg for cfg in SUPPORTED_GEMINI_MODELS.values() if cfg.is_enabled]


def get_model_display_name(model_key_or_id: Optional[str]) -> str:
    """Returns user-facing display name for a model key or ID."""
    if not model_key_or_id:
        return "AI Model"
    normalized = model_key_or_id.strip().lower()
    canonical = _MODEL_KEY_ALIASES.get(normalized, normalized)
    if canonical in SUPPORTED_GEMINI_MODELS:
        return SUPPORTED_GEMINI_MODELS[canonical].display_name
    for cfg in SUPPORTED_GEMINI_MODELS.values():
        if cfg.model_id.lower() == normalized or cfg.model_key.lower() == normalized:
            return cfg.display_name
    return model_key_or_id


def validate_model_key(raw_key: Optional[str]) -> GeminiModelConfig:
    """
    Validates a requested model key against the strict server-side allowlist.
    Raises HTTPException(400) if model key is missing, unsupported, or disabled.
    """
    if not raw_key or not isinstance(raw_key, str) or not raw_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A supported AI model must be selected before starting extraction.",
        )

    normalized_key = raw_key.strip().lower()
    canonical_key = _MODEL_KEY_ALIASES.get(normalized_key, normalized_key)

    if canonical_key not in SUPPORTED_GEMINI_MODELS:
        allowed_list = [cfg.display_name for cfg in SUPPORTED_GEMINI_MODELS.values() if cfg.is_enabled]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model '{raw_key}' is not a supported AI model. Allowed models: {allowed_list}.",
        )

    config = SUPPORTED_GEMINI_MODELS[canonical_key]
    if not config.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model '{config.display_name}' is currently disabled in system configuration.",
        )

    return config


def get_extraction_method_for_model(model_id: str, prompt_version: str = PROMPT_VERSION) -> str:
    """
    Generates the exact standardized extraction_method identifier for database storage:
    Format: 'llm/<verified-model-id>/<prompt-version>'
    Example: 'llm/openai/gpt-oss-120b/v2' or 'llm/gemini-3.5-flash-lite/v2'
    """
    clean_id = model_id.strip()
    return f"llm/{clean_id}/{prompt_version}"
