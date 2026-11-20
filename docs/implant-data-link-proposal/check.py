"""Checks for the implant data-link proposal data. Standard library only.

Run: python3 docs/implant-data-link-proposal/check.py
"""
import json
import pathlib
import sys

path = pathlib.Path(__file__).with_name("implant-data-link.data.json")
data = json.loads(path.read_text(encoding="utf-8"))
errors = []
ids = set()

for r in data["records"]:
    rid = r["id"]
    if rid in ids:
        errors.append(f"{rid}: duplicate id")
    ids.add(rid)

    factors = (r["channels"], r["sample_rate_hz"], r["adc_bits"])
    derived = r["raw_rate_bit_s_derived"]
    if None in factors:
        # An unknown factor must leave the derived rate unknown, never a guess.
        if derived is not None:
            errors.append(f"{rid}: derived rate given although a factor is unknown")
    else:
        want = factors[0] * factors[1] * factors[2]
        if derived != want:
            errors.append(f"{rid}: derived rate {derived} != {want}")

    if not r["sources"]:
        errors.append(f"{rid}: no source")
    for s in r["sources"]:
        if not s.get("url") or not s.get("accessed") or not s.get("excerpts"):
            errors.append(f"{rid}: source needs url, accessed date and an excerpt")

    if r["link_rate_bit_s"] is None and not r.get("link_rate_qualifier"):
        errors.append(f"{rid}: missing link rate needs a qualifier")
    if r["raw_rate_bit_s_reported"] and not r["raw_rate_reported"]:
        errors.append(f"{rid}: numeric reported rate needs the source wording")
    if r["power_mw"] is not None and not r.get("power_scope"):
        errors.append(f"{rid}: power needs a scope")

if errors:
    print("\n".join(errors))
    sys.exit(1)

recs = data["records"]
derived = [r for r in recs if r["raw_rate_bit_s_derived"]]
generated = [r for r in recs
             if r["raw_rate_bit_s_derived"] or r["raw_rate_bit_s_reported"]]
linked = [r for r in recs if r["link_rate_bit_s"]]
pairs = [r for r in generated if r["link_rate_bit_s"]]
print(f"{len(recs)} records ok")
print(f"{len(derived)} with a derived generated rate")
print(f"{len(generated)} with a generated rate (derived or reported)")
print(f"{len(linked)} with a stated link rate")
print(f"{len(pairs)} with both: " + ", ".join(r["id"] for r in pairs))
