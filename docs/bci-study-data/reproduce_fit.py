#!/usr/bin/env python3
"""Recompute the descriptive BCI fit from the full-precision provenance CSV.

Python standard library only. Optionally pass a modified CSV to test alternative
selections. Rates are recalculated from the declared source inputs and models.
"""
import csv
import hashlib
import json
import math
from pathlib import Path
import sys

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("chart-provenance.csv")
with path.open(newline="", encoding="utf-8") as stream:
    rows = list(csv.DictReader(stream))
if any(row.get("fit_included") not in ("true", "false") for row in rows):
    raise ValueError("fit_included must be exactly true or false for every observation")
def observation(row):
    plotted = float(row["plotted_bps"])
    included = row["fit_included"] == "true"
    rate = plotted
    basis = row.get("conversion_basis", "")
    # Legacy alphabet CSVs and explicit plotted-only sensitivity inputs remain usable.
    if included and (basis or row.get("normalization_alphabet_size")):
        if basis == "english-entropy":
            try:
                bits_per_character = float(row.get("normalization_bits_per_character", ""))
            except ValueError:
                raise ValueError("English-entropy conversion requires positive finite bits/character") from None
            if not math.isfinite(bits_per_character) or bits_per_character <= 0:
                raise ValueError("English-entropy conversion requires positive finite bits/character")
        elif basis in ("", "equiprobable-alphabet"):
            bits_per_character = math.log2(float(row["normalization_alphabet_size"]))
        else:
            raise ValueError(f"Unsupported conversion basis: {basis}")
        native = float(row["paper_or_company_native_rate"])
        unit = row["native_unit"]
        if unit in ("characters/minute", "correct characters/minute"):
            rate = native * bits_per_character / 60
        elif unit == "words/minute":
            rate = native * float(row["normalization_characters_per_word"]) * bits_per_character / 60
        elif unit == "seconds/letter":
            rate = bits_per_character / native
        else:
            raise ValueError(f"Unsupported text input unit: {unit}")
    return {"id": row["id"], "year": float(row["reference_year"]), "bps": rate,
            "csvPlottedBps": plotted, "fitIncluded": included}


observations = [observation(row) for row in rows]
if len(observations) < 2 or any(
    not math.isfinite(p["year"]) or not math.isfinite(p["bps"]) or p["bps"] <= 0
    for p in observations
):
    raise ValueError("At least two finite observations with positive rates are required")
if len({p["id"] for p in observations}) != len(observations):
    raise ValueError("Observation IDs must be unique; repeated years are allowed")
ordered = sorted((p for p in observations if p["fitIncluded"]), key=lambda p: (p["year"], p["bps"]))
n = len(ordered)
if n < 2:
    raise ValueError("At least two observations must be explicitly included in the fit")
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
    "method": "Equal-weight unconstrained OLS of log10(bits/s equivalent) against year for fit_included=true rows; repeated years retained, context rows excluded",
    "inputSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    "observations": observations,
    "fitObservations": ordered,
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
