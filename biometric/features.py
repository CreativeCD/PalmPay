"""
PalmPay Biometric Microservice — Feature Extraction Module
==========================================================
Extracts quantitative feature representations from preprocessed palm images.

Baseline Method: Histogram of Oriented Gradients (HOG)
- Captures gradient direction and magnitude distributions across local spatial cells.
- Produces a compact, translation-tolerant descriptor of vascular pattern contours.
- The resulting descriptor is L2-normalized to ensure unit length, making cosine
  similarity mathematically equivalent to the inner dot product.

ACADEMIC & EVALUATION NOTE:
  HOG serves as an experimental baseline. Team members (e.g. Shree Sai Deekhshit)
  can evaluate alternative or hybrid feature extractors such as Local Binary
  Patterns (LBP), Gabor wavelets, or Maximum Curvature methods on the chosen NIR dataset.
  Accuracy claims must be backed by empirical test results.
"""

import numpy as np
from skimage.feature import hog

HOG_ORIENTATIONS = 8
HOG_PIXELS_PER_CELL = (16, 16)
HOG_CELLS_PER_BLOCK = (2, 2)
HOG_BLOCK_NORM = "L2-Hys"
METHOD_NAME = "hog-baseline-v1"


def extract_features(image: np.ndarray) -> np.ndarray:
    """
    Extract an L2-normalized 1-D feature vector from a preprocessed image.

    Parameters
    ----------
    image : np.ndarray
        Preprocessed single-channel uint8 image (typically 128x128).

    Returns
    -------
    np.ndarray
        1-D float32 feature vector with unit L2 norm.
    """
    if image is None or image.ndim != 2:
        raise ValueError("extract_features expects a 2-D single-channel image.")

    descriptor = hog(
        image,
        orientations=HOG_ORIENTATIONS,
        pixels_per_cell=HOG_PIXELS_PER_CELL,
        cells_per_block=HOG_CELLS_PER_BLOCK,
        block_norm=HOG_BLOCK_NORM,
        channel_axis=None,
    )

    feature_vec = descriptor.astype(np.float32)

    # Enforce unit L2 norm
    norm = np.linalg.norm(feature_vec)
    if norm > 1e-8:
        feature_vec = feature_vec / norm

    return feature_vec
