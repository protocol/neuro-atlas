# Independent-review closure

Initial reviewed runtime: `6aa79afdb5b10e59af8ea1701a40a299eaf7e941`; original base: `de2301974ac1e66b35aaaec91198dc5dda8c060c`.

The independent code review found three blocking medium-severity issues; the separate source-fidelity review found two P2 issues, one overlapping. These were corrected rather than treating the initial candidate as complete:

- **R1 / CONVOY:** changed the actual activity from `EFS` to `feasibility`, not just the explanatory note. Its mounted tooltip no longer expands an unsupported formal Early Feasibility Study category. The registry-backed feasibility claim remains.
- **R2 / EVID-002 / CorTec IDE:** the Funding Index now uses `unverified`, matching the timeline for the identical source URL and legacy May 24, 2024 position. Neither captured publication nor approval date established that day. A mounted cross-surface regression checks the actual displayed guard.
- **R3 / Precision regression:** updated the existing test to assert February 2026 **month** precision and find the temporary-use clearance by the exact FDA K242618 PDF and March 30, 2025 date. The acute-use and non-chronic-wireless restrictions remain asserted.
- **EVID-001 / NeuroXess:** restored the more specific `Sequoia Capital China` identity. The original Yicai citation remains, and the record note links the readable [January 20, 2022 Shanda post](https://www.shanda.com/tiger-tao-wins-2021-young-scientist-of-the-year-award-from-chinese-academy-of-sciences), which says: “received a total of 97 million yuan (about US $15 million) in an angel round and Pre-A round funding, led by Shanda Group and Sequoia Capital China.” Generic Sequoia Capital's Neuralink investment is not combined with this entity. The combined financing is still counted once; no constituent allocations were invented.
- **S2 / approximate amount:** retained the existing `~` marker in Echo Neurotech's financing tooltip instead of rendering its approximate source amount as an exact-looking value.
- **Full-suite follow-up:** adapted the existing marker/glossary regression to `Pivotal (planned)` and added its definition, which explicitly does not establish that enrollment or implantation has begun.

Each changed behavior/data binding above was exercised RED → minimal correction → GREEN. The bounded historical-delta fixture was recalculated only after asserting that exactly six permitted collection/index entries changed; the original baseline hashes were not altered. The focused closure run passed 91 tests. The original full run had three failures (two stale expectations and a separate file-level performance test failure); its receipt is not relabeled green. Final replay and full-suite outcomes are recorded separately.

Nonblocking S1 noted that some identical sources use `announcement` on one surface and `reported` on the other. Both describe publication timing rather than a proven underlying event; no new date evidence was inferred to erase that distinction. The concrete unsupported CorTec date is corrected above.

The initial source critic's prose-only PASS for CONVOY was too narrow: it missed the activity-derived tooltip/filter category. The mounted code review exposed that residual claim. Final closure therefore checks both the canonical field and its user-facing rendering.
