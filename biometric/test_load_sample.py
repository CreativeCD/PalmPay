"""
test_load_sample.py — Phase 1 image-loading evidence
======================================================
IMPORTANT: No licensed NIR dataset (CASIA / PolyU / VERA) is available in
this repository.  Real vein-pattern evaluation requires a licensed dataset
obtained through the dataset provider's application process.

This script creates a *synthetic* grayscale image that is structurally
compatible with the preprocessing pipeline (uint8, 2-D array).  Its purpose
is ONLY to prove that the pipeline can decode, process, and return a correctly-
shaped output from a valid image file.  It makes NO claim about biometric
accuracy on real NIR data.
"""

import os
import sys
import pathlib

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT   = pathlib.Path(__file__).resolve().parent
SAMPLES_DIR = REPO_ROOT / "samples"
OUT_PATH    = SAMPLES_DIR / "synthetic_test.png"   # ignored by .gitignore

# ---------------------------------------------------------------------------
# 1. Create a synthetic 200×200 grayscale test image
#    (gradient + a few rectangles to give the HOG extractor real structure)
# ---------------------------------------------------------------------------
def make_synthetic_image(size: int = 200) -> np.ndarray:
    """Return a synthetic uint8 grayscale ndarray – NOT an NIR palm image."""
    img = np.zeros((size, size), dtype=np.uint8)
    # gradient background
    for row in range(size):
        img[row, :] = int(row / size * 200)
    # a few rectangles to create edges that HOG can detect
    cv2.rectangle(img, (20, 20),  (80, 80),  180, thickness=4)
    cv2.rectangle(img, (100, 50), (170, 150), 220, thickness=3)
    cv2.circle(img, (100, 100), 40, 255, thickness=2)
    return img


def main():
    print("=" * 60)
    print("Phase 1 — Image Loading Evidence")
    print("NOTE: synthetic test image; NOT an NIR palm sample")
    print("=" * 60)

    # -- Step 1: create and save synthetic image --
    synthetic = make_synthetic_image()
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT_PATH), synthetic)
    print(f"\n[1] Synthetic image created  : {OUT_PATH}")
    print(f"    Shape                    : {synthetic.shape}")
    print(f"    dtype                    : {synthetic.dtype}")

    # -- Step 2: reload via cv2.imdecode (mimics the FastAPI endpoint) --
    raw_bytes = OUT_PATH.read_bytes()
    arr       = np.frombuffer(raw_bytes, dtype=np.uint8)
    loaded    = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)

    if loaded is None:
        print("\n[FAIL] cv2.imdecode returned None — image file is corrupt.")
        sys.exit(1)

    print(f"\n[2] Reloaded with cv2.imdecode")
    print(f"    Shape  : {loaded.shape}")
    print(f"    dtype  : {loaded.dtype}")

    # -- Step 3: run the preprocessing pipeline --
    sys.path.insert(0, str(REPO_ROOT))
    from preprocessing import preprocess

    processed = preprocess(loaded)
    print(f"\n[3] Preprocessing pipeline completed")
    print(f"    Output shape : {processed.shape}  (expected (128, 128))")
    print(f"    Output dtype : {processed.dtype}  (expected uint8)")
    print(f"    Min pixel    : {processed.min()}")
    print(f"    Max pixel    : {processed.max()}")

    assert processed.shape == (128, 128), "Shape mismatch after preprocessing!"
    assert processed.dtype == np.uint8,   "dtype mismatch after preprocessing!"

    print("\n[PASS] Pipeline can load and process a suitable image. ✓")
    print("       For real biometric evaluation, replace synthetic_test.png")
    print("       with a licensed NIR dataset image (CASIA / PolyU / VERA).")


if __name__ == "__main__":
    main()
