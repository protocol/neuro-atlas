#!/usr/bin/env python3
"""
field_velocity_openalex.py — build one field-velocity CSV per focus area from
OpenAlex (CC0). Real data only; no synthesised values.

Per publication year Y it emits:
  year,field_works,all_works,corpus_share_per_100k,first_time_authors,
  idea_vintage_median_years,vintage_ci_lo,vintage_ci_hi,n_refs_sampled,
  n_works_sampled,reliable

Idea vintage = the median AGE of the references cited by new work in year Y,
where age = Y - (referenced work's publication year). We draw a random sample of
works per year (OpenAlex `sample`), resolve their referenced works' years in
batches, pool the ages, take the median, and CLUSTER-bootstrap a 95% CI.

The bootstrap resamples WORKS with replacement (not individual references),
because references are nested inside works: roughly `works_per_year` sampled
works each contribute a list of reference ages, and treating those ages as
independent understates the interval by 2-4x. References are deduped WITHIN a
work, never across works, so paper membership survives to the CI stage.

Recent years (>= reliable_cutoff_year) are undercounted by OpenAlex indexing lag
and are flagged reliable=0.

Queries hit the FILTER cluster (`filter=title_and_abstract.search:...`), not the
anonymous fulltext `search=` cluster, which is currently rate-limited. `|` ORs
the frozen terms. A free API key (--api-key) lifts rate limits but is optional.

Usage:
  python scripts/velocity/field_velocity_openalex.py \
    --search "content addressing|peer-to-peer network|censorship resistance|decentralized storage" \
    --from-year 2005 --email lukas@protocol.ai \
    --out src/data/velocity/digital-human-rights.csv
"""
import argparse
import datetime as dt
import json
import math
from email.utils import parsedate_to_datetime
import os
import random
import ssl
import statistics
import sys
import tempfile
import time
import urllib.parse
import urllib.request

API = "https://api.openalex.org/works"


def ssl_context(insecure=False):
    if insecure:
        return ssl._create_unverified_context()  # noqa: S323 — only for broken CA envs
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:  # noqa: BLE001
        return ssl.create_default_context()


SSL_CTX = ssl.create_default_context()


def build_url(params):
    return API + "?" + urllib.parse.urlencode(params, safe="|:,")


def retry_wait(value, fallback):
    """Bound both delta-seconds and HTTP dates; never expose invalid headers."""
    try:
        try:
            seconds = float(value)
        except (TypeError, ValueError):
            date = parsedate_to_datetime(value)
            if date.tzinfo is None:
                date = date.replace(tzinfo=dt.timezone.utc)
            seconds = max(0.0, date.timestamp() - time.time())
        if not math.isfinite(seconds) or seconds < 0:
            return fallback
        return min(seconds + 1, 120.0)
    except (TypeError, ValueError, OverflowError, AttributeError):
        return fallback


def fetch(params, email, api_key, tries=6):
    params = dict(params)
    if email:
        params["mailto"] = email
    if api_key:
        params["api_key"] = api_key
    url = build_url(params)
    delay = 2.0
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": f"plrd-field-velocity (mailto:{email})"})
            with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            # Inspect only a bounded body for classification; never echo it.
            daily_limit = False
            if e.code == 429:
                try:
                    body = e.read(65536).decode("utf-8", errors="replace").lower()
                    daily_limit = "daily" in body and any(word in body for word in ("limit", "quota", "budget"))
                except Exception:
                    pass  # A broken error body must not leak its exception either.
            e.close()
            if daily_limit:
                raise RuntimeError("OpenAlex daily quota exhausted; retry after quota reset or use an owner-provided key") from None
            if e.code in (429, 503, 500, 502, 504):
                if attempt + 1 >= tries:
                    break
                headers = e.headers or {}
                retry = headers.get("Retry-After") or headers.get("retryAfter")
                wait = retry_wait(retry, delay)
                print(f"  … {e.code}, waiting {wait:.0f}s (attempt {attempt+1})", file=sys.stderr)
                time.sleep(wait)
                delay = min(delay * 2, 60)
                continue
            raise RuntimeError(f"OpenAlex request rejected (HTTP {e.code})") from None
        except Exception:  # noqa: BLE001 — never log upstream exceptions or URLs
            if attempt + 1 < tries:
                print(f"  … request failed, retrying (attempt {attempt+1})", file=sys.stderr)
                time.sleep(delay)
                delay = min(delay * 2, 60)
    raise RuntimeError(f"OpenAlex request failed after {tries} attempts") from None


def count(filt, email, api_key):
    d = fetch({"filter": filt, "per-page": 1}, email, api_key)
    return d["meta"]["count"]


def resolve_ref_years(ref_ids, email, api_key, batch=50):
    years = {}
    for i in range(0, len(ref_ids), batch):
        chunk = ref_ids[i : i + batch]
        d = fetch(
            {"filter": "openalex_id:" + "|".join(chunk), "select": "id,publication_year", "per-page": batch},
            email,
            api_key,
        )
        for w in d.get("results", []):
            wid = w["id"].split("/")[-1]
            if w.get("publication_year"):
                years[wid] = w["publication_year"]
        time.sleep(0.2)
    return years


def cluster_bootstrap_ci(ages_by_work, iters=500):
    """Cluster bootstrap: resample WORKS with replacement, pool the ages of the
    resampled works, take the median, repeat. This respects that reference ages
    are nested inside works, so the interval reflects between-work variance and
    not a false independence assumption. Fixed seed for reproducibility."""
    works = [w for w in ages_by_work if w]
    if len(works) < 8:
        return (None, None)
    rng = random.Random(42)
    meds = []
    n = len(works)
    for _ in range(iters):
        pooled = []
        for _ in range(n):
            pooled.extend(works[rng.randrange(n)])
        if pooled:
            meds.append(statistics.median(pooled))
    if not meds:
        return (None, None)
    meds.sort()
    lo = meds[int(0.025 * len(meds))]
    hi = meds[int(0.975 * len(meds))]
    return (round(lo, 2), round(hi, 2))


def year_row(year, search, all_works, works_per_year, max_refs, email, api_key):
    field_filt = f"title_and_abstract.search:{search},publication_year:{year}"
    field_works = count(field_filt, email, api_key)
    corpus_share = round(field_works / all_works * 1e5, 3) if all_works else 0.0

    # Random sample of works this year, with their references + authors.
    d = fetch(
        {
            "filter": field_filt,
            "sample": min(works_per_year, max(field_works, 1)),
            "seed": 42,
            "per-page": min(works_per_year, 200),
            "select": "id,publication_year,referenced_works",
            "mailto": email,
        },
        email,
        api_key,
    )
    works = d.get("results", [])

    # Keep each work's references grouped, deduped WITHIN the work. Collect the
    # union of ids once for efficient batch resolution, but never dedupe across
    # works — paper membership is what the cluster bootstrap resamples on.
    refs_by_work = []
    all_ids = []
    for w in works:
        refs = [r.split("/")[-1] for r in (w.get("referenced_works") or [])][:max_refs]
        refs = list(dict.fromkeys(refs))  # dedupe within this work only
        if refs:
            refs_by_work.append(refs)
            all_ids += refs
    all_ids = list(dict.fromkeys(all_ids))  # union, for resolution batching only

    ref_years = resolve_ref_years(all_ids, email, api_key) if all_ids else {}

    ages_by_work = []
    for refs in refs_by_work:
        ages_w = [year - ref_years[r] for r in refs if ref_years.get(r) and 1900 <= ref_years[r] <= year]
        if ages_w:
            ages_by_work.append(ages_w)

    ages = [a for w in ages_by_work for a in w]  # flat pool, for the point median
    median = round(statistics.median(ages), 2) if ages else None
    lo, hi = cluster_bootstrap_ci(ages_by_work) if ages_by_work else (None, None)

    return {
        "year": year,
        "field_works": field_works,
        "all_works": all_works,
        "corpus_share_per_100k": corpus_share,
        "idea_vintage_median_years": median,
        "vintage_ci_lo": lo,
        "vintage_ci_hi": hi,
        "n_refs_sampled": len(ages),
        "n_works_sampled": len(ages_by_work),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--search", required=True, help="frozen query, | = OR")
    ap.add_argument("--from-year", type=int, required=True)
    ap.add_argument("--to-year", type=int, default=dt.date.today().year)
    # Credentials fall back to the environment (matching METACULUS_API_TOKEN's
    # pattern) so the key never lands in shell history or a CI log. CLI flags win.
    ap.add_argument("--email", default="")
    ap.add_argument("--api-key", default="")
    ap.add_argument("--works-per-year", type=int, default=120)
    ap.add_argument("--max-refs-per-work", type=int, default=60)
    ap.add_argument("--reliable-cutoff-year", type=int, default=dt.date.today().year - 2)
    ap.add_argument("--insecure", action="store_true", help="skip TLS verification (broken CA bundles only)")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    # Environment fallback: OPENALEX_EMAIL joins the polite pool; OPENALEX_API_KEY
    # (optional) lifts rate limits. Never echoed, logged, or written to a CSV.
    a.email = a.email or os.environ.get("OPENALEX_EMAIL", "")
    a.api_key = a.api_key or os.environ.get("OPENALEX_API_KEY", "")

    global SSL_CTX
    SSL_CTX = ssl_context(a.insecure)

    all_works_by_year = {}
    rows = []
    for year in range(a.from_year, a.to_year + 1):
        if year not in all_works_by_year:
            all_works_by_year[year] = count(f"publication_year:{year}", a.email, a.api_key)
        print(f"[{year}] querying…", file=sys.stderr)
        row = year_row(year, a.search, all_works_by_year[year], a.works_per_year, a.max_refs_per_work, a.email, a.api_key)
        # first_time_authors is left blank: a robust population-level count needs
        # per-author first-in-field history (not a constant-size sample), so we do
        # not emit a biased proxy. idea vintage is the wired signal here.
        row["first_time_authors"] = ""
        row["reliable"] = 0 if year >= a.reliable_cutoff_year else 1
        rows.append(row)
        print(
            f"    field_works={row['field_works']} median={row['idea_vintage_median_years']} "
            f"n_refs={row['n_refs_sampled']}",
            file=sys.stderr,
        )

    generated = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    header = (
        "year,field_works,all_works,corpus_share_per_100k,first_time_authors,"
        "idea_vintage_median_years,vintage_ci_lo,vintage_ci_hi,n_refs_sampled,"
        "n_works_sampled,reliable"
    )
    lines = [
        f"# generated: {generated}",
        "# source: OpenAlex (https://openalex.org, CC0)",
        f"# query: {a.search}",
        f"# from_year: {a.from_year}",
        f"# reliable_cutoff_year: {a.reliable_cutoff_year}",
        f"# sample: works_per_year={a.works_per_year}; max_refs_per_work={a.max_refs_per_work}; "
        "cluster=title_and_abstract.search; ci=cluster_bootstrap(resample=works,iters=500,seed=42); "
        "note=first_time_authors intentionally blank (needs per-author history)",
        header,
    ]

    def cell(v):
        return "" if v is None else str(v)

    for r in rows:
        lines.append(
            ",".join(
                cell(r[k])
                for k in [
                    "year",
                    "field_works",
                    "all_works",
                    "corpus_share_per_100k",
                    "first_time_authors",
                    "idea_vintage_median_years",
                    "vintage_ci_lo",
                    "vintage_ci_hi",
                    "n_refs_sampled",
                    "n_works_sampled",
                    "reliable",
                ]
            )
        )
    # Finish every request before touching disk; replace only a complete CSV.
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=os.path.dirname(os.path.abspath(a.out)),
            prefix=".openalex-", suffix=".tmp", delete=False,
        ) as f:
            temporary = f.name
            f.write("\n".join(lines) + "\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(temporary, a.out)
        temporary = None
    finally:
        if temporary is not None:
            os.unlink(temporary)
    print(f"wrote {a.out} ({len(rows)} rows)", file=sys.stderr)


if __name__ == "__main__":
    main()
