#!/usr/bin/env python3
"""
biometric/experiment.py — Controlled evaluation of the HOG-baseline pipeline.

DATA POLICY
-----------
No licensed NIR dataset (CASIA / PolyU / VERA) is available in this repository.
All images used here are SYNTHETIC — programmatically generated grayscale patterns
that model structural variation between "identities" and within-session noise.

WHAT CAN BE MEASURED HONESTLY
------------------------------
1. Genuine-pair similarity distribution (same synthetic identity, quality variations).
2. Impostor-pair similarity distribution (different synthetic identities).
3. Empirical FAR / FRR / EER on synthetic data at multiple thresholds.
4. Processing time per enroll/verify call (wall-clock, end-to-end through the pipeline).
5. Effect of image-quality degradations on similarity score.

WHAT CANNOT BE CLAIMED
-----------------------
- Accuracy on real palm-vein images.
- FAR / FRR values representative of NIR vascular biometrics.
- Any comparison to published benchmarks.

All results are written to stdout in a machine-readable format and
harvested by the calling shell script into docs/BIOMETRIC_EXPERIMENTS.md.
"""

import sys
import time
import json
import base64
import pathlib
import itertools

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Ensure we can import from the biometric package directory
# ---------------------------------------------------------------------------
REPO = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(REPO))

from preprocessing import preprocess
from features     import extract_features, METHOD_NAME, HOG_ORIENTATIONS, HOG_PIXELS_PER_CELL, HOG_CELLS_PER_BLOCK, HOG_BLOCK_NORM
from matcher      import compute_similarity

# ---------------------------------------------------------------------------
# 1. Synthetic identity generator
#    Each "identity" is a unique parameterised pattern so that the HOG
#    descriptor captures genuinely different gradient structures.
# ---------------------------------------------------------------------------

def make_identity_image(identity_id: int, size: int = 200, noise_seed: int = 0) -> np.ndarray:
    """
    Generate a synthetic grayscale image for a given identity.

    Each identity has a unique set of line orientations, circle positions,
    and gradient slopes so that inter-identity HOG similarity is naturally low.
    Adding noise_seed != 0 simulates within-session quality variation.
    """
    rng  = np.random.default_rng(identity_id * 1000 + noise_seed)
    img  = np.zeros((size, size), dtype=np.uint8)

    # Unique gradient background per identity
    slope = (identity_id * 37 % 180)
    for row in range(size):
        val = int((row / size) * 150 + (identity_id * 23 % 50))
        img[row, :] = np.clip(val, 0, 255)

    # Unique set of rectangles (simulate line patterns at different positions)
    n_rects = 3 + (identity_id % 4)
    for i in range(n_rects):
        x1 = int(rng.integers(5, size // 2))
        y1 = int(rng.integers(5, size // 2))
        x2 = int(rng.integers(size // 2, size - 5))
        y2 = int(rng.integers(size // 2, size - 5))
        intensity = int(rng.integers(100, 255))
        thickness = int(rng.integers(2, 6))
        cv2.rectangle(img, (x1, y1), (x2, y2), intensity, thickness=thickness)

    # Unique circles
    n_circles = 2 + (identity_id % 3)
    for i in range(n_circles):
        cx = int(rng.integers(20, size - 20))
        cy = int(rng.integers(20, size - 20))
        r  = int(rng.integers(10, 40))
        intensity = int(rng.integers(50, 220))
        cv2.circle(img, (cx, cy), r, intensity, thickness=2)

    # Add per-session noise
    if noise_seed > 0:
        noise = rng.integers(-15, 15, size=(size, size), dtype=np.int16)
        img   = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return img


# ---------------------------------------------------------------------------
# 2. Quality-degradation transforms
# ---------------------------------------------------------------------------

def apply_quality(img: np.ndarray, variant: str) -> np.ndarray:
    """Apply a named quality degradation to a uint8 grayscale image."""
    if variant == "clean":
        return img.copy()
    elif variant == "gaussian_blur":
        return cv2.GaussianBlur(img, (9, 9), 3)
    elif variant == "heavy_noise":
        rng   = np.random.default_rng(42)
        noise = rng.integers(-40, 40, img.shape, dtype=np.int16)
        return np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    elif variant == "low_contrast":
        return np.clip((img.astype(np.float32) * 0.4 + 60), 0, 255).astype(np.uint8)
    elif variant == "jpeg_compression":
        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 15])
        return cv2.imdecode(buf, cv2.IMREAD_GRAYSCALE)
    elif variant == "overexposed":
        return np.clip(img.astype(np.int16) + 90, 0, 255).astype(np.uint8)
    elif variant == "crop_pad":
        # Crop 20% from each side then pad back to original size
        h, w  = img.shape
        m     = int(min(h, w) * 0.20)
        cropped = img[m:h-m, m:w-m]
        return cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LINEAR)
    else:
        return img.copy()


# ---------------------------------------------------------------------------
# 3. Pipeline timing wrapper
# ---------------------------------------------------------------------------

def timed_enroll(img: np.ndarray) -> tuple:
    """Returns (feature_vec_b64, duration_ms)."""
    t0  = time.perf_counter()
    pre = preprocess(img)
    vec = extract_features(pre)
    ms  = (time.perf_counter() - t0) * 1000
    b64 = base64.b64encode(vec.tobytes()).decode("ascii")
    return b64, ms, vec


def timed_verify(probe_img: np.ndarray, ref_b64: str) -> tuple:
    """Returns (similarity, duration_ms)."""
    t0      = time.perf_counter()
    pre     = preprocess(probe_img)
    probe   = extract_features(pre)
    ref_vec = np.frombuffer(base64.b64decode(ref_b64), dtype=np.float32)
    sim     = compute_similarity(probe, ref_vec)
    ms      = (time.perf_counter() - t0) * 1000
    return sim, ms


# ---------------------------------------------------------------------------
# 4. Experiment
# ---------------------------------------------------------------------------

def run():
    N_IDENTITIES   = 10          # number of distinct synthetic "subjects"
    N_SESSIONS     = 5           # genuine samples per identity (noise variants 0-4)
    THRESHOLDS     = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]
    QUALITY_VARS   = ["clean", "gaussian_blur", "heavy_noise",
                      "low_contrast", "jpeg_compression", "overexposed", "crop_pad"]

    results = {
        "meta": {
            "method":           METHOD_NAME,
            "hog_orientations": HOG_ORIENTATIONS,
            "hog_pixels_per_cell": list(HOG_PIXELS_PER_CELL),
            "hog_cells_per_block": list(HOG_CELLS_PER_BLOCK),
            "hog_block_norm":   HOG_BLOCK_NORM,
            "n_identities":     N_IDENTITIES,
            "n_sessions":       N_SESSIONS,
            "image_size_px":    200,
            "preprocessed_px":  128,
            "feature_dim":      None,          # filled in below
            "data_source":      "SYNTHETIC — programmatically generated; NOT NIR palm images",
        },
        "enroll_times_ms":  [],
        "verify_times_ms":  [],
        "genuine_scores":   [],
        "impostor_scores":  [],
        "quality_results":  [],   # per-variant results
        "threshold_metrics": [],
    }

    print("[experiment] Generating identities and enrolling reference templates …", flush=True)

    # -- Enroll one "clean" reference per identity
    enrolled = {}       # identity_id -> (b64_template, vec)
    for uid in range(N_IDENTITIES):
        img   = make_identity_image(uid, noise_seed=0)
        b64, enroll_ms, vec = timed_enroll(img)
        enrolled[uid]       = (b64, vec)
        results["enroll_times_ms"].append(round(enroll_ms, 3))

    results["meta"]["feature_dim"] = len(enrolled[0][1])

    # -- Genuine pairs: for each identity, verify sessions 1..N_SESSIONS-1 against session 0
    print(f"[experiment] Running genuine pairs ({N_IDENTITIES} × {N_SESSIONS-1}) …", flush=True)
    for uid in range(N_IDENTITIES):
        ref_b64 = enrolled[uid][0]
        for sess in range(1, N_SESSIONS):
            probe = make_identity_image(uid, noise_seed=sess)
            sim, verify_ms = timed_verify(probe, ref_b64)
            results["genuine_scores"].append(round(sim, 6))
            results["verify_times_ms"].append(round(verify_ms, 3))

    # -- Impostor pairs: all cross-identity combinations (probe=session 1 of each subject)
    print(f"[experiment] Running impostor pairs …", flush=True)
    impostor_pairs = list(itertools.permutations(range(N_IDENTITIES), 2))
    for (probe_uid, ref_uid) in impostor_pairs:
        probe   = make_identity_image(probe_uid, noise_seed=1)
        ref_b64 = enrolled[ref_uid][0]
        sim, verify_ms = timed_verify(probe, ref_b64)
        results["impostor_scores"].append(round(sim, 6))
        results["verify_times_ms"].append(round(verify_ms, 3))

    # -- FAR / FRR at each threshold
    genuine  = np.array(results["genuine_scores"])
    impostor = np.array(results["impostor_scores"])

    for t in THRESHOLDS:
        # FRR = proportion of genuine pairs BELOW threshold (rejected)
        frr = float(np.mean(genuine  < t))
        # FAR = proportion of impostor pairs AT OR ABOVE threshold (accepted)
        far = float(np.mean(impostor >= t))
        results["threshold_metrics"].append({
            "threshold": t,
            "far":       round(far, 6),
            "frr":       round(frr, 6),
        })

    # EER: threshold where FAR ≈ FRR (linear interpolation)
    fars = np.array([m["far"] for m in results["threshold_metrics"]])
    frrs = np.array([m["frr"] for m in results["threshold_metrics"]])
    diffs = np.abs(fars - frrs)
    eer_idx = int(np.argmin(diffs))
    results["eer_approx"] = {
        "threshold": THRESHOLDS[eer_idx],
        "far":       results["threshold_metrics"][eer_idx]["far"],
        "frr":       results["threshold_metrics"][eer_idx]["frr"],
    }

    # -- Quality variation experiment (identity 0 as subject)
    print(f"[experiment] Running quality variation experiment …", flush=True)
    ref_b64_q   = enrolled[0][0]   # enrolled on clean image
    # Also record impostor scores under each quality variant (use identity 1 as impostor)
    imp_ref_b64 = enrolled[1][0]

    for variant in QUALITY_VARS:
        # Genuine: identity 0 probe with quality variant vs clean reference
        probe_gen = apply_quality(make_identity_image(0, noise_seed=1), variant)
        sim_gen, t_gen = timed_verify(probe_gen, ref_b64_q)

        # Impostor: identity 1 probe with quality variant vs identity 0 reference
        probe_imp = apply_quality(make_identity_image(1, noise_seed=1), variant)
        sim_imp, t_imp = timed_verify(probe_imp, ref_b64_q)

        results["quality_results"].append({
            "variant":        variant,
            "genuine_sim":    round(sim_gen, 6),
            "impostor_sim":   round(sim_imp, 6),
            "verify_ms":      round(t_gen, 3),
        })

    # -- Summary statistics
    results["summary"] = {
        "genuine_count":        len(genuine),
        "impostor_count":       len(impostor),
        "genuine_mean":         round(float(genuine.mean()), 6),
        "genuine_std":          round(float(genuine.std()), 6),
        "genuine_min":          round(float(genuine.min()), 6),
        "genuine_max":          round(float(genuine.max()), 6),
        "impostor_mean":        round(float(impostor.mean()), 6),
        "impostor_std":         round(float(impostor.std()), 6),
        "impostor_min":         round(float(impostor.min()), 6),
        "impostor_max":         round(float(impostor.max()), 6),
        "enroll_mean_ms":       round(float(np.mean(results["enroll_times_ms"])), 3),
        "enroll_max_ms":        round(float(np.max(results["enroll_times_ms"])), 3),
        "verify_mean_ms":       round(float(np.mean(results["verify_times_ms"])), 3),
        "verify_max_ms":        round(float(np.max(results["verify_times_ms"])), 3),
    }

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    run()
