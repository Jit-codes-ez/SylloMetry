"""
SylloMetry - Centralized LLM Error Classifier

Normalizes and classifies errors across all supported LLM providers
(Google Gemini 3.5 Flash-Lite, Groq GPT-OSS 120B, Google Gemini 3.1 Flash-Lite).

Implements fail-fast logic for fatal provider errors:
- Immediately terminates extraction jobs on fatal errors (e.g. quota exhausted, auth failure).
- Bounded retries for transient errors (e.g. 503, temporary network failure).
- If retries on a window are exhausted, fails the extraction job cleanly instead of repeating failures.
- Provides sanitized, user-friendly messages for each error category without exposing secrets or raw stack traces.
"""

from enum import Enum
import logging
import re
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("app.core.llm_error_classifier")


class ErrorCategory(str, Enum):
    QUOTA_EXHAUSTED = "quota_exhausted"
    TEMPORARY_RATE_LIMIT = "temporary_rate_limit"
    INVALID_API_KEY = "invalid_api_key"
    MISSING_API_KEY = "missing_api_key"
    PERMISSION_DENIED = "permission_denied"
    MODEL_UNAVAILABLE = "model_unavailable"
    BILLING_RESTRICTION = "billing_restriction"
    REQUEST_CONFIG_ERROR = "request_config_error"
    CONTEXT_LIMIT_EXCEEDED = "context_limit_exceeded"
    PROVIDER_POLICY_VIOLATION = "provider_policy_violation"
    TEMPORARY_OUTAGE = "temporary_outage"
    INVALID_RESPONSE = "invalid_response"
    UNKNOWN_ERROR = "unknown_error"


USER_FACING_ERROR_MESSAGES: Dict[ErrorCategory, str] = {
    ErrorCategory.QUOTA_EXHAUSTED: (
        "Your selected AI provider has exhausted its token quota. "
        "Please wait for the quota to reset or choose another available model."
    ),
    ErrorCategory.TEMPORARY_RATE_LIMIT: (
        "The AI provider is temporarily rate-limiting requests. Please retry shortly."
    ),
    ErrorCategory.INVALID_API_KEY: (
        "The API key for the selected AI provider is invalid or expired. "
        "Please contact the administrator."
    ),
    ErrorCategory.MISSING_API_KEY: (
        "The selected AI provider is not configured correctly. "
        "Please contact the administrator."
    ),
    ErrorCategory.MODEL_UNAVAILABLE: (
        "The selected AI model is currently unavailable or is not accessible with the configured account."
    ),
    ErrorCategory.PERMISSION_DENIED: (
        "The configured API account does not have permission to access this model."
    ),
    ErrorCategory.BILLING_RESTRICTION: (
        "The selected AI provider account has a billing or credit restriction."
    ),
    ErrorCategory.CONTEXT_LIMIT_EXCEEDED: (
        "The document content exceeds the selected model's context limit."
    ),
    ErrorCategory.REQUEST_CONFIG_ERROR: (
        "The extraction request configuration is invalid for this model. "
        "Please contact the administrator."
    ),
    ErrorCategory.PROVIDER_POLICY_VIOLATION: (
        "The AI provider rejected the content due to safety or usage policies."
    ),
    ErrorCategory.TEMPORARY_OUTAGE: (
        "The AI provider is temporarily unavailable. Please try again later."
    ),
    ErrorCategory.INVALID_RESPONSE: (
        "The AI provider returned an invalid response. "
        "Please retry or choose another available model."
    ),
    ErrorCategory.UNKNOWN_ERROR: (
        "Skill extraction encountered an unexpected error. Please retry."
    ),
}


class ExtractionError(Exception):
    """Base exception for skill extraction errors."""

    def __init__(
        self,
        category: ErrorCategory,
        message: Optional[str] = None,
        technical_details: Optional[str] = None,
        is_fatal: bool = True,
        status_code: Optional[int] = None,
        retry_after: Optional[float] = None,
    ):
        self.category = category
        self.user_message = message or USER_FACING_ERROR_MESSAGES.get(
            category, USER_FACING_ERROR_MESSAGES[ErrorCategory.UNKNOWN_ERROR]
        )
        self.technical_details = technical_details or str(category.value)
        self.is_fatal = is_fatal
        self.status_code = status_code
        self.retry_after = retry_after
        super().__init__(self.user_message)


class FatalExtractionError(ExtractionError):
    """
    Raised when an unrecoverable/fatal LLM error occurs.
    Halts the extraction loop immediately and marks the job as failed.
    """

    def __init__(
        self,
        category: ErrorCategory,
        message: Optional[str] = None,
        technical_details: Optional[str] = None,
        status_code: Optional[int] = None,
        user_message: Optional[str] = None,
    ):
        super().__init__(
            category=category,
            message=message or user_message,
            technical_details=technical_details,
            is_fatal=True,
            status_code=status_code,
            retry_after=None,
        )


class TransientExtractionError(ExtractionError):
    """
    Raised when a temporary/recoverable error occurs.
    May be retried with exponential backoff up to max_retries.
    """

    def __init__(
        self,
        category: ErrorCategory,
        message: Optional[str] = None,
        technical_details: Optional[str] = None,
        status_code: Optional[int] = None,
        retry_after: Optional[float] = None,
        user_message: Optional[str] = None,
    ):
        super().__init__(
            category=category,
            message=message or user_message,
            technical_details=technical_details,
            is_fatal=False,
            status_code=status_code,
            retry_after=retry_after,
        )


class ClassifiedError:
    """Normalized structured error representation."""

    def __init__(
        self,
        category: ErrorCategory,
        is_fatal: bool,
        user_message: str,
        technical_details: str,
        status_code: Optional[int] = None,
        retry_after: Optional[float] = None,
    ):
        self.category = category
        self.is_fatal = is_fatal
        self.user_message = user_message
        self.technical_details = technical_details
        self.status_code = status_code
        self.retry_after = retry_after

    def to_exception(self) -> ExtractionError:
        if self.is_fatal:
            return FatalExtractionError(
                category=self.category,
                message=self.user_message,
                technical_details=self.technical_details,
                status_code=self.status_code,
            )
        return TransientExtractionError(
            category=self.category,
            message=self.user_message,
            technical_details=self.technical_details,
            status_code=self.status_code,
            retry_after=self.retry_after,
        )


def _extract_error_parts(exc: Exception) -> Tuple[Optional[int], str, str, str, Dict[str, Any], Optional[float]]:
    """
    Extracts (status_code, error_code, error_type, message, body_or_details, retry_after)
    across Google GenAI, Groq, HTTPX, and standard exceptions.
    """
    status_code: Optional[int] = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    error_code = ""
    error_type = ""
    message = str(getattr(exc, "message", "") or str(exc) or "")
    body_or_details: Dict[str, Any] = {}
    retry_after: Optional[float] = None

    # Check response object
    response = getattr(exc, "response", None)
    if response is not None:
        if status_code is None and hasattr(response, "status_code"):
            try:
                status_code = int(response.status_code)
            except Exception:
                pass

        # Check response headers for retry-after
        headers = getattr(response, "headers", None)
        if headers:
            raw_retry = headers.get("retry-after") or headers.get("Retry-After")
            if raw_retry:
                try:
                    retry_after = float(raw_retry)
                except Exception:
                    pass

    # Groq structured body
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        body_or_details = body
        err_obj = body.get("error")
        if isinstance(err_obj, dict):
            error_code = str(err_obj.get("code") or "")
            error_type = str(err_obj.get("type") or "")
            body_msg = str(err_obj.get("message") or "")
            if body_msg:
                message = f"{message} {body_msg}"

    # Google GenAI details
    details = getattr(exc, "details", None)
    if isinstance(details, dict):
        body_or_details = details
        err_dict = details.get("error", details)
        if isinstance(err_dict, dict):
            genai_status = str(err_dict.get("status") or "")
            if genai_status:
                error_type = genai_status
            body_msg = str(err_dict.get("message") or "")
            if body_msg:
                message = f"{message} {body_msg}"
            # Check detailed quota violations
            sub_details = err_dict.get("details", [])
            if isinstance(sub_details, list):
                for d in sub_details:
                    if isinstance(d, dict):
                        d_type = str(d.get("@type") or "")
                        d_reason = str(d.get("reason") or "")
                        if d_reason:
                            error_code = d_reason
                        if "QuotaFailure" in d_type or "ErrorInfo" in d_type:
                            error_type = d_type
                            violations = d.get("violations", [])
                            if isinstance(violations, list):
                                for v in violations:
                                    if isinstance(v, dict):
                                        message += f" violation: {v.get('description', '')} ({v.get('subject', '')})"

    # Status attribute on GenAI APIError
    genai_status_attr = getattr(exc, "status", None)
    if genai_status_attr and not error_type:
        error_type = str(genai_status_attr)

    # Fallback status code from class name or message
    exc_type_name = type(exc).__name__
    if status_code is None:
        if "Authentication" in exc_type_name:
            status_code = 401
        elif "PermissionDenied" in exc_type_name:
            status_code = 403
        elif "NotFound" in exc_type_name:
            status_code = 404
        elif "RateLimit" in exc_type_name:
            status_code = 429
        elif "Timeout" in exc_type_name or "Connection" in exc_type_name:
            status_code = 504
        elif "InternalServer" in exc_type_name or "Server" in exc_type_name:
            status_code = 500

    return status_code, error_code, error_type, message, body_or_details, retry_after


def classify_llm_exception(
    exc: Exception,
    provider: str = "gemini",
    model_id: str = "",
) -> ClassifiedError:
    """
    Centralized classifier that inspects provider-specific error details
    and maps them to an ErrorCategory, fatal/transient classification, and user message.
    """
    # If already a classified ExtractionError, wrap cleanly
    if isinstance(exc, ExtractionError):
        return ClassifiedError(
            category=exc.category,
            is_fatal=exc.is_fatal,
            user_message=exc.user_message,
            technical_details=exc.technical_details,
            status_code=exc.status_code,
            retry_after=exc.retry_after,
        )

    status_code, error_code, error_type, raw_message, details, retry_after = _extract_error_parts(exc)
    msg_lower = raw_message.lower()
    code_lower = error_code.lower()
    type_lower = error_type.lower()
    exc_name = type(exc).__name__

    sanitized_tech_details = (
        f"Provider={provider}, Model={model_id}, Type={exc_name}, Status={status_code}, "
        f"Code={error_code}, ErrorType={error_type}: {raw_message[:280]}"
    )

    # -------------------------------------------------------------------------
    # 1. Missing API Key
    # -------------------------------------------------------------------------
    if (
        "is not configured on the backend" in msg_lower
        or "missing api key" in msg_lower
        or "api_key is required" in msg_lower
        or "api key not provided" in msg_lower
        or "api key must be provided" in msg_lower
        or "must provide an api key" in msg_lower
        or ("not configured" in msg_lower and "key" in msg_lower)
    ):
        return ClassifiedError(
            category=ErrorCategory.MISSING_API_KEY,
            is_fatal=True,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.MISSING_API_KEY],
            technical_details=sanitized_tech_details,
            status_code=status_code or 401,
        )

    # -------------------------------------------------------------------------
    # 2. Authentication Errors (401 / Invalid API Key)
    # -------------------------------------------------------------------------
    if (
        status_code == 401
        or "authentication" in exc_name.lower()
        or code_lower in ("invalid_api_key", "api_key_invalid")
        or type_lower in ("unauthenticated", "invalid_api_key")
        or "api key not valid" in msg_lower
        or "invalid api key" in msg_lower
        or "incorrect api key" in msg_lower
        or "unauthenticated" in msg_lower
    ):
        return ClassifiedError(
            category=ErrorCategory.INVALID_API_KEY,
            is_fatal=True,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.INVALID_API_KEY],
            technical_details=sanitized_tech_details,
            status_code=401,
        )

    # -------------------------------------------------------------------------
    # 3. Billing & Credit Restrictions (HTTP 402 / Payment Required)
    #    Note: Must exclude HTTP 429 (Groq rate-limit errors include a link to /settings/billing)
    # -------------------------------------------------------------------------
    if status_code != 429 and "ratelimit" not in exc_name.lower() and (
        status_code == 402
        or "insufficient credit" in msg_lower
        or "credit balance" in msg_lower
        or "account suspended" in msg_lower
        or "payment required" in msg_lower
        or "billing_disabled" in msg_lower
        or "insufficient_quota" in code_lower
        or ("billing" in msg_lower and "settings/billing" not in msg_lower and "console.groq.com" not in msg_lower)
    ):
        return ClassifiedError(
            category=ErrorCategory.BILLING_RESTRICTION,
            is_fatal=True,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.BILLING_RESTRICTION],
            technical_details=sanitized_tech_details,
            status_code=status_code or 402,
        )

    # -------------------------------------------------------------------------
    # 4. Authorization / Permission Denied (403)
    # -------------------------------------------------------------------------
    if (
        status_code == 403
        or "permissiondenied" in exc_name.lower()
        or "permission_denied" in type_lower
        or "permission denied" in msg_lower
        or "access denied" in msg_lower
        or "forbidden" in msg_lower
        or "not permitted" in msg_lower
    ):
        return ClassifiedError(
            category=ErrorCategory.PERMISSION_DENIED,
            is_fatal=True,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.PERMISSION_DENIED],
            technical_details=sanitized_tech_details,
            status_code=403,
        )

    # -------------------------------------------------------------------------
    # 5. Model Errors (404 / Model Unavailable / Deprecated / Not Found)
    # -------------------------------------------------------------------------
    if (
        status_code == 404
        or "notfound" in exc_name.lower()
        or code_lower == "model_not_found"
        or "not_found" in type_lower
        or "model not found" in msg_lower
        or "does not exist" in msg_lower
        or "is not supported for generatecontent" in msg_lower
        or "model is deprecated" in msg_lower
        or "unavailable to this account" in msg_lower
        or "decommissioned" in msg_lower
    ):
        return ClassifiedError(
            category=ErrorCategory.MODEL_UNAVAILABLE,
            is_fatal=True,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.MODEL_UNAVAILABLE],
            technical_details=sanitized_tech_details,
            status_code=404,
        )

    # -------------------------------------------------------------------------
    # 6. Context Window Exceeded
    # -------------------------------------------------------------------------
    if (
        "context_length_exceeded" in code_lower
        or "context_length_exceeded" in msg_lower
        or "maximum context length" in msg_lower
        or "context window" in msg_lower
        or "too many tokens" in msg_lower
        or "token limit exceeded" in msg_lower
        or "reduce the length of the messages" in msg_lower
    ):
        return ClassifiedError(
            category=ErrorCategory.CONTEXT_LIMIT_EXCEEDED,
            is_fatal=True,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.CONTEXT_LIMIT_EXCEEDED],
            technical_details=sanitized_tech_details,
            status_code=status_code or 400,
        )

    # -------------------------------------------------------------------------
    # 7. Provider Policy / Content Moderation
    # -------------------------------------------------------------------------
    if (
        "safety" in msg_lower
        or "content policy" in msg_lower
        or "policy rejection" in msg_lower
        or "harmful content" in msg_lower
        or "blocked by safety filters" in msg_lower
    ):
        return ClassifiedError(
            category=ErrorCategory.PROVIDER_POLICY_VIOLATION,
            is_fatal=True,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.PROVIDER_POLICY_VIOLATION],
            technical_details=sanitized_tech_details,
            status_code=status_code or 400,
        )

    # -------------------------------------------------------------------------
    # 8. Rate Limits & Quotas (HTTP 429 / RESOURCE_EXHAUSTED)
    #    Carefully distinguish exhausted quotas (Fatal) vs temporary throttling (Transient)
    # -------------------------------------------------------------------------
    if status_code == 429 or "ratelimit" in exc_name.lower() or "resource_exhausted" in type_lower:
        # Check quota exhaustion indicators
        is_exhausted = (
            # Groq: Daily tokens (TPD) or daily requests (RPD)
            "tokens per day" in msg_lower
            or "tpd" in msg_lower
            or "requests per day" in msg_lower
            or "rpd" in msg_lower
            or (type_lower == "tokens" and ("exceeded" in msg_lower or "limit" in msg_lower))
            or "quota exhausted" in msg_lower
            or "daily allowance" in msg_lower
            or "daily limit" in msg_lower
            or "daily request" in msg_lower
            or "exceeded your current quota" in msg_lower
            # Gemini: Resource exhausted specifically for quota
            or "quota exceeded" in msg_lower
            or "quota has been exhausted" in msg_lower
            or "free_tier" in msg_lower
            or "per_day" in msg_lower
            or "quotafailure" in type_lower
            or "check quota" in msg_lower
            # Unrecoverable retry-after window (> 120 seconds)
            or (retry_after is not None and retry_after > 120)
        )

        if is_exhausted:
            return ClassifiedError(
                category=ErrorCategory.QUOTA_EXHAUSTED,
                is_fatal=True,
                user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.QUOTA_EXHAUSTED],
                technical_details=sanitized_tech_details,
                status_code=429,
                retry_after=retry_after,
            )

        # Otherwise: Short-term RPM/TPM throttling (Transient)
        return ClassifiedError(
            category=ErrorCategory.TEMPORARY_RATE_LIMIT,
            is_fatal=False,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.TEMPORARY_RATE_LIMIT],
            technical_details=sanitized_tech_details,
            status_code=429,
            retry_after=retry_after or 2.0,
        )

    # -------------------------------------------------------------------------
    # 9. Temporary Server Outage / Network Failures (5xx, Timeouts, Connection)
    # -------------------------------------------------------------------------
    if (
        (status_code is not None and 500 <= status_code <= 599)
        or "timeout" in exc_name.lower()
        or "connection" in exc_name.lower()
        or "service unavailable" in msg_lower
        or "server error" in msg_lower
        or "bad gateway" in msg_lower
        or "gateway timeout" in msg_lower
        or "connection reset" in msg_lower
        or "dns" in msg_lower
    ):
        return ClassifiedError(
            category=ErrorCategory.TEMPORARY_OUTAGE,
            is_fatal=False,  # Transient, retryable with backoff
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.TEMPORARY_OUTAGE],
            technical_details=sanitized_tech_details,
            status_code=status_code or 503,
            retry_after=retry_after or 2.0,
        )

    # -------------------------------------------------------------------------
    # 10. Malformed or Invalid Request Configurations (HTTP 400)
    # -------------------------------------------------------------------------
    if status_code == 400 or "badrequest" in exc_name.lower() or "invalid_argument" in type_lower:
        return ClassifiedError(
            category=ErrorCategory.REQUEST_CONFIG_ERROR,
            is_fatal=True,
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.REQUEST_CONFIG_ERROR],
            technical_details=sanitized_tech_details,
            status_code=400,
        )

    # -------------------------------------------------------------------------
    # 11. Response Parsing / Malformed Response Errors
    # -------------------------------------------------------------------------
    if (
        "jsondecodeerror" in exc_name.lower()
        or "validationerror" in exc_name.lower()
        or "invalid response" in msg_lower
        or "malformed" in msg_lower
    ):
        return ClassifiedError(
            category=ErrorCategory.INVALID_RESPONSE,
            is_fatal=False,  # Transient if first attempt, fatal once max retries exhausted
            user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.INVALID_RESPONSE],
            technical_details=sanitized_tech_details,
            status_code=status_code,
        )

    # -------------------------------------------------------------------------
    # 12. Fallback / Unknown Error
    # -------------------------------------------------------------------------
    return ClassifiedError(
        category=ErrorCategory.UNKNOWN_ERROR,
        is_fatal=True,
        user_message=USER_FACING_ERROR_MESSAGES[ErrorCategory.UNKNOWN_ERROR],
        technical_details=sanitized_tech_details,
        status_code=status_code,
    )
