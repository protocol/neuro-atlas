#!/usr/bin/env python3
"""Recompute the descriptive BCI fit from the full-precision provenance CSV.

Python standard library only. Optionally pass a modified CSV to test alternative
selections. This reproduces the PL R&D reconstruction, not the original figure.
"""
import csv
import hashlib
import json
import math
from pathlib import Path
import sys

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("chart-provenance.csv")
with path.open(newline="", encoding="utf-8") as stream:
    observations = [
        {"id": row["id"], "year": float(row["reference_year"]), "bps": float(row["plotted_bps"])}
        for row in csv.DictReader(stream)
    ]
if len(observations) < 2 or any(
    not math.isfinite(p["year"]) or not math.isfinite(p["bps"]) or p["bps"] <= 0
    for p in observations
):
    raise ValueError("At least two finite observations with positive rates are required")
if len({p["id"] for p in observations}) != len(observations):
    raise ValueError("Observation IDs must be unique; repeated years are allowed")
ordered = sorted(observations, key=lambda p: (p["year"], p["bps"]))
n = len(ordered)
x_origin = ordered[0]["year"]
x = [p["year"] - x_origin for p in ordered]
z = [math.log10(p["bps"]) for p in ordered]
mean_x, mean_z = sum(x) / n, sum(z) / n
sxx = sum((value - mean_x) ** 2 for value in x)
if not sxx > 0:
    raise ValueError("A nonzero year span is required")
slope = sum((a - mean_x) * (b - mean_z) for a, b in zip(x, z)) / sxx
intercept = mean_z - slope * mean_x
residual = sum((b - intercept - slope * a) ** 2 for a, b in zip(x, z))
total = sum((b - mean_z) ** 2 for b in z)
print(json.dumps({
    "method": "Equal-weight unconstrained OLS of log10(bits/s) against reference year; repeated years retained",
    "inputSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    "observations": observations,
    "fit": {
        "n": n,
        "xOrigin": x_origin,
        "interceptLog10": intercept,
        "slopeLog10PerX": slope,
        "rSquaredLog10": max(0, min(1, 1 - residual / total)) if total > 0 else None,
        "residualSumSquaresLog10": residual,
        "totalSumSquaresLog10": total,
    },
}, indent=2, allow_nan=False))
