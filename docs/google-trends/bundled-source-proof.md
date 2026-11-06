# November 6, 2026 bundled last-good sources

These are genuine accepted acquisitions installed in the initial human-reviewed implementation. This change makes no source requests, feed publication, scheduler change, merge or deployment. It does not change the page/catalog or restore the retired Neuralink brand chart. Publication/researcher bundles remain unchanged.

## Google Trends

- Full normalization window: **2023-11-06–2026-11-06**, worldwide, Web Search, all categories, weekly UTC.
- Accepted source strings are preserved byte-for-byte in `bundled-20261106/source/`. Feed SHA-256 (version 1, pretty-printed JSON plus final newline): `37daa50d680c8fa6706a69dd51eee3eb603f4f650f3fdb1b047864a17fccc862`.
- Neurotech capture: `2026-11-06T09:07:36.676206+00:00`; raw SHA-256 `27c594e169bf99a18cb9f3251e2109463d9aaeb167a146f2fd915062d0f303f6`; request SHA-256 `7b1a9df20486baa9de5e1dba24f150a66a2321961b3335642d268fee5e888048`.
- Separately normalized Neuralink source-contract capture: `2026-11-06T09:07:37.110227+00:00`; raw SHA-256 `7423ef3120bad2a1db0d24c6f1c16f1c8808ffe503c5b8295e5db67ec5c633d1`; request SHA-256 `4a91d769938fd6c2e6006e55d0ee9748b960d8b9ab364e2457f14fb5b045f5c9`. This group remains archived, not newly mounted.
- Each group retains 157 rows: 155 complete and two boundary-partial weeks (`2023-11-05`, `2026-11-01`). Three neurotech missing values remain gaps. No source values are rescaled, appended, interpolated or zero-filled. Neurotechnology and brain-computer interface retain their common request scale.
- Generated JSON/CSVs are under `public/data/google-trends/bundled-20261106/`. Their immutable special token is the admitted feed's Git blob ID, `7574619a0ea64efbf482d31d57916857f97b966d`; it does **not** assert a published upstream commit. API downloads reconstruct the admitted bytes offline.
- Original October 15 sources, public downloads and token `c5a18cfb03746c0e048e425fac82259488d089a4` remain intact and independently downloadable.

```sh
npm run trends:verify
npm run trends:verify -- --source docs/google-trends/source --out public/data/google-trends
```

## Citation latency

- Anonymous bundle: `src/data/field-velocity/citation-latency.bundled-20261106.json`, copied byte-for-byte from the already validated/replayed producer stage. Bundle SHA-256: `0e43c72e2176e21d5418ff88948f3e61396e36a381dc70b8ccb2cbb2a0866611`.
- CSV SHA-256: `472241a3c94ea79932b50461adad8a64aaef7c85052c39a2717d8d886c3627c4`.
- Original acquisition interval: `2026-11-06T09:39:51+00:00`–`2026-11-06T09:48:35+00:00`; generated at the latter timestamp. No freshness relabeling.
- Private replay manifest hash: `ce5524a4aa1747e886d7d752f6b6658747a0ede5020b1618f9a1e46a14fae3e7`; 964 successful receipts. Full manifest, raw receipts and work-ID requests are **not** bundled.
- Frozen query and statistical/source pins are unchanged. The actual CSV has **27 years (2000–2026), 24 reliable (2000–2023)**. The `year < acquisition-year - 2` rule leaves 2024–2026 under-indexed. This is not 25 reliable years.
- Existing validation and projection produce the median-reference-age series, source intervals and **9.0 years (2023)** headline, preserving patent metadata and all unrelated records. Corpus-share/count context in CSV is not substituted for citation latency; the existing reference/publication-year scope is unchanged.
- The immutable special bundled token is the exact bundle's Git blob ID, `2efd3a7cec78af7b29a75e6c2611348a426e4df9`, not a published upstream commit. Server fallback, initial client render and failed/stale client loads use this source. Exact CSV/JSON API downloads validate the admitted bundle.
- Original August 4 shared snapshot, provenance, source CSV and immutable download identity remain unchanged. Only `idea_vintage` is projected; translation evidence and every other chart retain their archived source records.

## Local acceptance

Both fresh-data regression tests were observed failing against the previous fallbacks before installation, then passing against these exact bytes. The focused Trends/citation suite passes **179 tests**; `npm run typecheck` passes. Tests cover source hashes, strict validation, preserved archive downloads, exact CSV/JSON exports, partial/gap semantics, UI tables/marks, document pinning and retained failure behavior. The broader page/Neuralink-retirement tests remain blocked by the unchanged Artio-v1 reference snapshot versus the in-progress publication-v2 validator; the same three page-render failures reproduce on untouched base `c5254fc`. No publication files are changed here. Native/hosted acceptance and the initial PR's independent critique belong to the parent integration; no production build is claimed from this temporary read-only dependency-symlink test environment.
