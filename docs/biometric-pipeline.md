# Palm-Vein Biometric Pipeline Documentation

## 1. Principles of Palm-Vein Biometrics

Palm-vein authentication is a vascular biometric technology that maps the internal vein structure of the human palm.

### Physical & Optical Properties
1. **Deoxygenated Hemoglobin Absorption:**
   Deoxygenated hemoglobin circulating through subcutaneous veins absorbs light in the near-infrared (NIR) spectrum (roughly 760 nm to 850 nm) significantly more strongly than surrounding dermal tissue.
2. **NIR Illumination vs. Visible Light:**
   When exposed to diffuse NIR radiation, the subcutaneous vein network appears as dark lines (shadows) beneath the skin surface.
3. **RGB Webcam Inadequacy:**
   **An ordinary RGB webcam with daylight/visible light cannot reliably capture subcutaneous veins.** Standard consumer webcams feature optical IR-cut filters that deliberately block infrared wavelengths. Surface skin features (pigmentation, specular skin reflections, surface creases) dominate RGB imagery. Therefore, PalmPay explicitly treats visible-spectrum webcams as unsuited for vein pattern recognition.

---

## 2. Image Acquisition Approaches

The project accommodates three pathways based on capstone feasibility:
- **Permissible Benchmark Datasets (Recommended for baseline):**
  - CASIA Multi-Spectral Palmprint Database (NIR band)
  - VERA Palmvein Database (Idiap Research Institute)
  - PolyU Near-Infrared Palmprint Database
- **Physical NIR Setup:**
  - NIR-pass camera (with IR-cut filter removed) + 850nm NIR LED illuminator array.
- **Hybrid Evaluation:**
  - Enrolled test samples from verified datasets, evaluated alongside controlled physical tests.

---

## 3. Preprocessing Pipeline (`preprocessing.py`)

The raw image passes through a 4-stage pipeline:

```text
Raw NIR Palm Image (PNG/JPEG)
       |
       v
[1. Grayscale Conversion]  --> Drops color channels; standardizes to 8-bit depth
       |
       v
[2. Canonical Resizing]    --> cv2.resize to (128, 128) using INTER_AREA downsampling
       |
       v
[3. Contrast Equalization] --> cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
       |
       v
[4. Gaussian Smoothing]    --> cv2.GaussianBlur(kernel=(3, 3), sigma=0)
       |
       v
Preprocessed Palm Array (uint8, 128x128)
```

### Why CLAHE?
Contrast Limited Adaptive Histogram Equalization (CLAHE) is crucial for NIR vein processing. Ordinary global histogram equalization causes over-amplification of noise in homogeneous regions. CLAHE operates on localized tiles (8x8) and clips contrast enhancement to prevent artificial edge artifacts.

---

## 4. Feature Extraction (`features.py`)

### Baseline Descriptor: Histogram of Oriented Gradients (HOG)
- **Orientations:** 8 directional bins ($0^\circ$ to $180^\circ$).
- **Pixels per cell:** $16 \times 16$ pixels.
- **Cells per block:** $2 \times 2$ cells with $50\%$ overlap.
- **Block Normalization:** L2-Hys (L2-norm followed by clipping and re-normalization).
- **Descriptor Length:**
  $$\left(\frac{128}{16} - 1\right) \times \left(\frac{128}{16} - 1\right) \times 2 \times 2 \times 8 = 7 \times 7 \times 32 = 1568 \text{ dimensions}$$
- **Post-normalization:** The resulting vector is L2-normalized so that $\|\vec{v}\| = 1$.

---

## 5. Similarity Scoring (`matcher.py`)

The similarity score between a probe vector $\vec{a}$ and an enrolled vector $\vec{b}$ is computed via cosine similarity:

$$\text{similarity}(\vec{a}, \vec{b}) = \frac{\vec{a} \cdot \vec{b}}{\|\vec{a}\|_2 \|\vec{b}\|_2}$$

Because both vectors are pre-normalized to unit length:
$$\text{similarity}(\vec{a}, \vec{b}) \approx \vec{a} \cdot \vec{b} \quad \in [-1.0, 1.0]$$

- **Score Direction:** Higher scores indicate greater structural similarity.
- **Identical templates:** Score $= 1.0$.
- **Different hands:** Scores typically fall below the empirical decision threshold.

---

## 6. Threshold Calibration & Limitations

1. **Threshold Determination:**
   The default threshold is `BIOMETRIC_THRESHOLD=0.60`.
   This threshold must be empirically evaluated against the selected dataset by plotting:
   - False Match Rate (FMR / FAR)
   - False Non-Match Rate (FNMR / FRR)
   - Equal Error Rate (EER)
2. **Liveness Detection & Anti-Spoofing:**
   The baseline prototype does **not** perform optical liveness detection (e.g. pulse detection, blood flow tracking). Printed NIR photographs or high-contrast prints could deceive this initial baseline.
3. **Academic Scope:**
   The system demonstrates integration feasibility and closed-loop security architecture; it does not claim commercial-grade biometric reliability.
