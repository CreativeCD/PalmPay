"""
Re-export feature extraction functionality for backwards compatibility.
"""
from features import (
    HOG_BLOCK_NORM,
    HOG_CELLS_PER_BLOCK,
    HOG_ORIENTATIONS,
    HOG_PIXELS_PER_CELL,
    METHOD_NAME,
    extract_features,
)

__all__ = [
    "HOG_BLOCK_NORM",
    "HOG_CELLS_PER_BLOCK",
    "HOG_ORIENTATIONS",
    "HOG_PIXELS_PER_CELL",
    "METHOD_NAME",
    "extract_features",
]
