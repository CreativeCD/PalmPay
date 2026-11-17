"""
PalmPay Biometric Microservice — Preprocessing Module
=====================================================
Near-Infrared (NIR) palm-vein image preprocessing.

Steps:
  1. Grayscale conversion: converts 3-channel or 4-channel images to 1-channel uint8.
  2. Resizing: resizes image to fixed canonical dimensions (TARGET_SIZE).
  3. CLAHE (Contrast Limited Adaptive Histogram Equalization): improves local
     contrast to highlight subcutaneous vascular structures captured in NIR illumination.
  4. Gaussian Blur: reduces high-frequency sensor noise while preserving edge boundaries.

IMPORTANT SCIENTIFIC CONSTRAINT:
  Palm-vein authentication relies on hemoglobin absorption in the near-infrared
  spectrum (approx. 760nm - 850nm). Normal RGB webcams with standard daylight filters
  cannot reliably capture subcutaneous veins. This system is designed for NIR images
  and experimental evaluation on permissible research datasets (e.g. CASIA, VERA, PolyU).
"""

import cv2
import numpy as np

TARGET_SIZE = (128, 128)


def preprocess(image: np.ndarray) -> np.ndarray:
    """
    Preprocess a raw palm image for feature extraction.

    Parameters
    ----------
    image : np.ndarray
        Raw OpenCV image array (uint8, grayscale, BGR, or BGRA).

    Returns
    -------
    np.ndarray
        Preprocessed single-channel uint8 image of shape TARGET_SIZE.
    """
    if image is None or not isinstance(image, np.ndarray):
        raise ValueError("Invalid image input: expected a non-empty numpy ndarray.")

    # Step 1: Convert to single-channel grayscale if multi-channel
    if image.ndim == 3 and image.shape[2] == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    elif image.ndim == 3 and image.shape[2] == 4:
        gray = cv2.cvtColor(image, cv2.COLOR_BGRA2GRAY)
    elif image.ndim == 2:
        gray = image.copy()
    else:
        raise ValueError(f"Unsupported image shape: {image.shape}")

    # Step 2: Canonical resize using INTER_AREA for downsampling
    resized = cv2.resize(gray, TARGET_SIZE, interpolation=cv2.INTER_AREA)

    # Step 3: Contrast Limited Adaptive Histogram Equalization (CLAHE)
    # Essential for accentuating vein absorption lines against surrounding tissue
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(resized)

    # Step 4: Gaussian blur to attenuate high-frequency acquisition noise
    denoised = cv2.GaussianBlur(enhanced, (3, 3), 0)

    return denoised
