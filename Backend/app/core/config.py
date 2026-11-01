import os
from pathlib import Path
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Automatically find Backend/.env regardless of current working directory
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_PATH = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """SylloMetry application settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=(_ENV_PATH if _ENV_PATH.exists() else ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application metadata
    PROJECT_NAME: str = "SylloMetry Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    API_PREFIX: str = "/api"

    # Frontend URL for CORS and OAuth redirection
    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        description="Origin URL of the frontend application",
    )

    # Supabase Credentials
    SUPABASE_URL: str = Field(
        default="https://placeholder-project.supabase.co",
        description="Supabase Project URL (https://<project-ref>.supabase.co)",
    )
    SUPABASE_PUBLISHABLE_KEY: str = Field(
        default="placeholder-publishable-key",
        description="Supabase Anon / Publishable API Key",
    )
    SUPABASE_ANON_KEY: Optional[str] = Field(
        default=None,
        description="Alias for SUPABASE_PUBLISHABLE_KEY",
    )
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(
        default=None,
        description="Supabase Backend-only Service Role Secret Key",
    )

    @property
    def publishable_key(self) -> str:
        """Returns the publishable anon key, respecting alias if provided."""
        return self.SUPABASE_ANON_KEY or self.SUPABASE_PUBLISHABLE_KEY or ""

    @property
    def is_supabase_configured(self) -> bool:
        """Checks if real Supabase credentials have been configured."""
        url_valid = bool(self.SUPABASE_URL) and "placeholder" not in self.SUPABASE_URL
        key_valid = bool(self.publishable_key) and "placeholder" not in self.publishable_key
        return url_valid and key_valid

    @property
    def cors_origins(self) -> List[str]:
        """Calculates allowed CORS origins without allowing credentials on wildcard origins."""
        origins = [self.FRONTEND_URL.rstrip("/")]
        # Also include standard local vite development origins if in development
        if self.ENVIRONMENT == "development":
            dev_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
            for o in dev_origins:
                if o not in origins:
                    origins.append(o)
        return origins


settings = Settings()

