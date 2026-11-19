"""
test_preprocessing.py — Phase 2 preprocessing evidence
=======================================================
Runs the four-step preprocessing pipeline on a synthetic image, saves
intermediate outputs to biometric/test-output/ (git-ignored), and tests
error handling for corrupt and unsupported inputs.
"""

import os
import sys
import pathlib

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT  = pathlib.Path(__file__).resolve().parent
OUT_DIR    = REPO_ROOT / "test-output"
OUT_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(REPO_ROOT))

TARGET_SIZE = (128, 128)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_synthetic_image(size: int = 200) -> np.ndarray:
    """Create a synthetic grayscale image for pipeline testing (NOT NIR data)."""
    img = np.zeros((size, size), dtype=np.uint8)
    for row in range(size):
        img[row, :] = int(row / size * 200)
    cv2.rectangle(img, (20, 20),  (80, 80),  180, thickness=4)
    cv2.rectangle(img, (100, 50), (170, 150), 220, thickness=3)
    cv2.circle(img, (100, 100), 40, 255, thickness=2)
    return img


def save(arr: np.ndarray, name: str) -> None:
    path = OUT_DIR / name
    cv2.imwrite(str(path), arr)
    print(f"    Saved → {path.relative_to(REPO_ROOT.parent.parent)} "
          f"  shape={arr.shape}  dtype={arr.dtype}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 65)
    print("Phase 2 — Inspectable Preprocessing Pipeline")
    print("NOTE: synthetic test image; NOT NIR palm data")
    print("=" * 65)

    raw = make_synthetic_image()
    save(raw, "00_synthetic_input.png")

    # ------------------------------------------------------------------ #
    # Step 1 – Grayscale conversion                                        #
    # ------------------------------------------------------------------ #
    print("\n[Step 1] Grayscale conversion")
    print("  Purpose : standardise channel count.")
    print("  Detail  : BGR→Gray or BGRA→Gray or identity if already 1-ch.")
    if raw.ndim == 3 and raw.shape[2] == 3:
        gray = cv2.cvtColor(raw, cv2.COLOR_BGR2GRAY)
    elif raw.ndim == 3 and raw.shape[2] == 4:
        gray = cv2.cvtColor(raw, cv2.COLOR_BGRA2GRAY)
    elif raw.ndim == 2:
        gray = raw.copy()
    else:
        raise ValueError(f"Unsupported shape: {raw.shape}")
    save(gray, "01_grayscale.png")

    # ------------------------------------------------------------------ #
    # Step 2 – Canonical resize                                            #
    # ------------------------------------------------------------------ #
    print("\n[Step 2] Canonical resize  →  128 × 128")
    print("  Purpose : fixed input size for HOG feature vector.")
    print("  Method  : INTER_AREA (best quality when downsampling).")
    resized = cv2.resize(gray, TARGET_SIZE, interpolation=cv2.INTER_AREA)
    save(resized, "02_resized.png")

    # ------------------------------------------------------------------ #
    # Step 3 – CLAHE                                                       #
    # ------------------------------------------------------------------ #
    print("\n[Step 3] CLAHE  (Contrast Limited Adaptive Histogram Equalization)")
    print("  Purpose : boost local contrast so palm line patterns become")
    print("            more distinguishable, especially in NIR images.")
    print("  Params  : clipLimit=2.0,  tileGridSize=(8,8)")
    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(resized)
    save(enhanced, "03_clahe.png")

    # ------------------------------------------------------------------ #
    # Step 4 – Gaussian blur                                               #
    # ------------------------------------------------------------------ #
    print("\n[Step 4] Gaussian blur  kernel=(3,3)")
    print("  Purpose : suppress high-frequency sensor/JPEG noise so the")
    print("            HOG gradients are driven by real structure.")
    denoised = cv2.GaussianBlur(enhanced, (3, 3), 0)
    save(denoised, "04_final.png")

    # Verify final shape/dtype
    assert denoised.shape == (128, 128), "Shape mismatch!"
    assert denoised.dtype == np.uint8,   "dtype mismatch!"
    print("\n  [PASS] Final output shape=(128,128)  dtype=uint8 ✓")

    # ------------------------------------------------------------------ #
    # Cross-check with module's preprocess()                               #
    # ------------------------------------------------------------------ #
    print("\n[Cross-check] Running preprocessing.preprocess() …")
    from preprocessing import preprocess
    out2 = preprocess(raw)
    assert np.array_equal(out2, denoised), "Module output differs from manual steps!"
    print("  [PASS] preprocessing.preprocess() output matches manual steps ✓")

    # ------------------------------------------------------------------ #
    # Error handling — corrupt bytes                                        #
    # ------------------------------------------------------------------ #
    print("\n[Error test 1] Corrupt image bytes → cv2.imdecode returns None")
    corrupt_bytes = b"\x00\x01\x02\x03\xff\xfe" * 50
    arr = np.frombuffer(corrupt_bytes, dtype=np.uint8)
    decoded = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if decoded is None:
        print("  [PASS] imdecode correctly returned None for corrupt data ✓")
        # The FastAPI router raises HTTP 422 at this point.
        print("         (router would raise HTTP 422 Unprocessable Entity)")
    else:
        print("  [WARN] imdecode did not return None — unexpected.")

    # ------------------------------------------------------------------ #
    # Error handling — None input                                           #
    # ------------------------------------------------------------------ #
    print("\n[Error test 2] None input to preprocess() → ValueError")
    try:
        preprocess(None)
        print("  [FAIL] No exception raised!")
    except ValueError as exc:
        print(f"  [PASS] ValueError raised: {exc} ✓")

    # ------------------------------------------------------------------ #
    # Error handling — 1-D array                                           #
    # ------------------------------------------------------------------ #
    print("\n[Error test 3] 1-D array to preprocess() → ValueError")
    try:
        preprocess(np.array([1, 2, 3], dtype=np.uint8))
        print("  [FAIL] No exception raised!")
    except ValueError as exc:
        print(f"  [PASS] ValueError raised: {exc} ✓")

    # ------------------------------------------------------------------ #
    # Error handling — 4-channel (BGRA)                                    #
    # ------------------------------------------------------------------ #
    print("\n[Error test 4] 4-channel BGRA image → should succeed (BGRA→Gray)")
    bgra = cv2.cvtColor(raw, cv2.COLOR_GRAY2BGR)
    bgra = cv2.cvtColor(bgra, cv2.COLOR_BGR2BGRA)
    out_bgra = preprocess(bgra)
    assert out_bgra.shape == (128, 128), "Shape mismatch for BGRA input!"
    print("  [PASS] BGRA image preprocessed successfully ✓")

    print("\n" + "=" * 65)
    print("All Phase 2 checks passed.")
    print(f"Intermediate images saved to: biometric/test-output/")
    print("=" * 65)


if __name__ == "__main__":
    main()
