# Repository contribution setup

## Scope

The final change updates GitHub documentation, licensing, issue/PR templates, review ownership, and contributor checks. The website retains its current copy, controls, links, data, and behavior. Website contribution invitations from earlier revisions are held for later.

The owner approved this repository-only update on November 23, 2026. Before merging, compare the entire `src/` tree, `data/`, `public/`, runtime configuration, dependency versions, and lockfile resolutions with the current base. Package metadata changes only the root license expression.

## Checks

- The website-hold assertion first failed against the earlier contribution CTA, then passed after restoring website files to the base revision.
- Run all 25 scoped contributor/methodology/navigation/Feedback/inventory tests on Node.js 24, plus typecheck and build.
- Read back the exact-head native GitHub Actions result before merging.
- Verify original license texts and third-party notices; preserve the existing recording-scaling CC-BY-4.0 notice.
- The wider test suite has existing failures. The required check's coverage is documented in README and CONTRIBUTING, and the complete unsuppressed suite remains available through a manual workflow.

## Licensing

Original software and documentation use `Apache-2.0 OR MIT`, following the inspected IPFS/Helia and Kubo precedents. Third-party source terms and attribution remain in force.

- Helia source: `cba1ed69b4369924790d9eccdb8c9089435f4f20`.
- Kubo source: `833e04a240d8c533509ddaaa3c202b39b0bb3024`.
- Complete official Apache text SHA-256: `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`.
- MIT text SHA-256: `8f71659370c5268d9a1dc962a46232540e8fca63462586d8efaa95aab492a208`.
- Preserved `docs/sources/recording-scaling/LICENSE` SHA-256: `4eeb29dd9b129a6b1247cc11bcf4a527f625cf52edbca8a0d7e132e166231a48`.

## Fork execution and review

Contributor CI uses `pull_request`, hosted Ubuntu, read-only contents permission, SHA-pinned actions, and checkout credentials disabled. It runs without production secrets or deployment steps. Existing Vercel Git Fork Protection remains enabled.

`CODEOWNERS` routes review to `@lksbrssr`. The existing branch rule requires the app-bound contributor check, code-owner review, stale-approval dismissal, and resolved conversations. Repository administrators retain their existing bypass; this change grants no new collaborators or deployment permissions.
