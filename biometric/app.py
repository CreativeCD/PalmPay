"""
PalmPay Biometric Microservice
==============================
Processes NIR palm images and returns similarity scores.

IMPORTANT CONSTRAINTS:
- This service does NOT connect to any database.
- This service does NOT debit wallets or authorise payments.
- This service returns raw similarity scores only.
- The authorization threshold is applied exclusively by the Express backend.
- Bind to 127.0.0.1 only (internal service — not exposed to the browser).
"""
import logging
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from routers import process as process_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("palmpay-biometric")

app = FastAPI(
    title="PalmPay Biometric Service",
    description=(
        "Internal NIR palm-image processing microservice. "
        "Returns similarity scores only. "
        "Authorization decisions are made by the Express backend."
    ),
    version="1.0.0",
)

app.include_router(process_router.router, prefix="/process", tags=["process"])


@app.on_event("startup")
async def on_startup():
    logger.info("=" * 60)
    logger.info("PalmPay Biometric Service started.")
    logger.info("This service returns similarity scores only.")
    logger.info("Authorization decisions are made by the Express backend.")
    logger.info("=" * 60)


@app.get("/health", tags=["health"])
async def health():
    return JSONResponse({
        "status": "ok",
        "service": "palmpay-biometric",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
