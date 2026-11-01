import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase_auth.errors import AuthApiError

from app.core.config import settings
from app.routes.signup import router as signup_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s",
)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting %s v%s in %s mode", settings.PROJECT_NAME, settings.VERSION, settings.ENVIRONMENT)
    if not settings.is_supabase_configured:
        logger.warning(
            "⚠️ Supabase configuration is incomplete or using placeholders. "
            "Update your .env file with valid SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY."
        )
    yield
    logger.info("Shutting down %s", settings.PROJECT_NAME)


# Initialize FastAPI Application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SylloMetry Backend API - AI-powered curriculum-to-industry skill-gap analysis",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS Middleware
# Explicitly uses configured frontend origins; forbids wildcard with credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global Exception Handler for Supabase AuthApiError
@app.exception_handler(AuthApiError)
async def auth_api_error_handler(request: Request, exc: AuthApiError):
    logger.warning("AuthApiError handled: status=%s, code=%s", exc.status, exc.code)
    status_code = exc.status if isinstance(exc.status, int) and 400 <= exc.status <= 599 else 400
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": exc.message or "Authentication error occurred.",
            "error_code": str(exc.code) if exc.code else None,
        },
    )


# Health Check Endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend service status and configuration."""
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "supabase_configured": settings.is_supabase_configured,
    }


# Include Signup Routers
app.include_router(signup_router)

