# Cumulative standings implementation plan

Goal: live cumulative TEAM/PTS/ELIMS using approved outputs/thiet-ke-bxh-cong-don.md.
Architecture: pure standings.mjs derives totals from parser snapshots; app selects cumulative by default, individual matches remain available. No raw events added twice. Team names and cross-match UID overlap resolve identity; ambiguous duplicate names remain separate.

- [ ] Tests: repeated updates replace prior match score; changing TeamID; duplicate names; UID recovery of unbound group; unknown kills remain unknown; stable ranking.
- [ ] Implement pure aggregation, integrate default cumulative mode and remove ALIVE from primary table.
- [ ] Replay real log, full suite, browser preview where available, whole-change review, publish owner-private and refresh ZIP.

Constraints: local file access; polling 200ms; no invented scoring formula or unknown ELIMS; aggregate only current source. Existing checkout is dedicated Site repository; keep it for source helper rather than create another worktree.
