"""
PalmPay Biometric Microservice — Matcher Module
===============================================
Computes similarity between probe and reference palm feature vectors.

Score Function:
  Cosine similarity in the range [-1.0, 1.0]:
    +1.0 -> identical descriptors
     0.0 -> orthogonal (unrelated)
    -1.0 -> completely inverted

Score Direction: HIGHER IS MORE SIMILAR.

CRITICAL SECURITY CONSTRAINT:
  The Python microservice returns RAW similarity scores.
  It DOES NOT enforce an authorization threshold or grant access.
  The authorization threshold is defined in the Express backend environment
  (BIOMETRIC_THRESHOLD) and enforced solely on the server before orchestrating
  any wallet debit.
"""

import numpy as np


def compute_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Calculate the cosine similarity between two feature vectors.

    Parameters
    ----------
    vec_a : np.ndarray
        Probe feature vector.
    vec_b : np.ndarray
        Enrolled reference feature vector.

    Returns
    -------
    float
        Cosine similarity bounded in [-1.0, 1.0], rounded to 6 decimal places.
        Returns 0.0 if either vector has near-zero magnitude.
    """
    if vec_a is None or vec_b is None:
        raise ValueError("Both feature vectors must be provided.")

    flat_a = np.asarray(vec_a, dtype=np.float32).flatten()
    flat_b = np.asarray(vec_b, dtype=np.float32).flatten()

    if len(flat_a) == 0 or len(flat_b) == 0:
        return 0.0

    if len(flat_a) != len(flat_b):
        raise ValueError(
            f"Vector dimension mismatch: probe has {len(flat_a)} elements, "
            f"reference has {len(flat_b)} elements."
        )

    norm_a = np.linalg.norm(flat_a)
    norm_b = np.linalg.norm(flat_b)

    if norm_a < 1e-8 or norm_b < 1e-8:
        return 0.0

    similarity = float(np.dot(flat_a, flat_b) / (norm_a * norm_b))
    return round(similarity, 6)
