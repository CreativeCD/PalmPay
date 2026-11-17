"""
FastAPI router: /process/enroll and /process/verify

CONSTRAINTS:
  - No database access.
  - No wallet writes.
  - No authorization threshold — raw scores returned only.
  - 'matched' field in verify response is ALWAYS False from this service.
    The Express backend applies the threshold and sets the final decision.
"""
import base64
import logging

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from preprocessing import preprocess
from features import extract_features, METHOD_NAME
from matcher import compute_similarity

logger = logging.getLogger("palmpay-biometric.process")
router = APIRouter()


def _decode_image(raw_bytes: bytes) -> np.ndarray:
    """Decode image bytes to an OpenCV ndarray. Raises HTTPException on failure."""
    arr = np.frombuffer(raw_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(
            status_code=422,
            detail="Could not decode image. Upload a valid PNG or JPEG file.",
        )
    return img


# ── POST /process/enroll ──────────────────────────────────────────────────────
@router.post("/enroll")
async def enroll(palm_image: UploadFile = File(...)):
    """
    Accept a NIR palm image, preprocess it, extract a HOG feature vector,
    and return the vector serialised as a base64 string.
    """
    try:
        raw = await palm_image.read()
        img = _decode_image(raw)
        preprocessed = preprocess(img)
        feature_vec = extract_features(preprocessed)

        # Serialise numpy float32 array to base64
        template_b64 = base64.b64encode(feature_vec.tobytes()).decode("ascii")

        h, w = preprocessed.shape
        logger.info(
            "Enrolled: method=%s shape=(%d,%d) vec_len=%d",
            METHOD_NAME, h, w, len(feature_vec)
        )

        return JSONResponse({
            "success": True,
            "template": template_b64,
            "method": METHOD_NAME,
            "shape": [int(h), int(w)],
        })
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Enroll error: %s", exc)
        return JSONResponse({"success": False, "error": str(exc)}, status_code=422)


# ── POST /process/verify ──────────────────────────────────────────────────────
@router.post("/verify")
async def verify(
    palm_image: UploadFile = File(...),
    reference_template: str = Form(...),
):
    """
    Compare a probe palm image against a stored base64-encoded template.

    Returns a raw similarity score. 'matched' is ALWAYS False here.
    The Express backend applies the threshold and decides authorisation.
    """
    try:
        raw = await palm_image.read()
        probe_img = _decode_image(raw)

        # Deserialise the reference template
        try:
            ref_bytes = base64.b64decode(reference_template)
            ref_vec = np.frombuffer(ref_bytes, dtype=np.float32).copy()
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid reference_template encoding.")

        # Process probe image
        preprocessed = preprocess(probe_img)
        probe_vec = extract_features(preprocessed)

        similarity = compute_similarity(probe_vec, ref_vec)

        logger.info(
            "Verify: method=%s similarity=%.6f  "
            "(threshold applied by Express backend only)",
            METHOD_NAME, similarity,
        )

        return JSONResponse({
            "success": True,
            "matched": False,   # Express applies threshold — not this service
            "similarity": similarity,
            "method": METHOD_NAME,
        })
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Verify error: %s", exc)
        return JSONResponse({"success": False, "error": str(exc)}, status_code=422)
