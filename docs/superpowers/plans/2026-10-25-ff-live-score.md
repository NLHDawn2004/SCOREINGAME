# Free Fire Live Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Browser-local live scoreboard from Free Fire debug logs.
**Architecture:** Buildless ES modules. Incremental UTF-8 file tail reader feeds a deterministic parser; renderer shows per-match teams, evidence and mapping controls. Chrome/Edge File System Access API polls every second.
**Tech Stack:** HTML, CSS, JavaScript, node:test; no production dependencies.
**Spec:** ../../../../thiet-ke-bang-diem.md (approved design in outputs).

## Global Constraints
- TEAM / ELIMS / ALIVE, dark and yellow, local processing only.
- Missing or unverified values visibly unknown; never equate score TeamID and gsTeam without evidence.
- Read-only access, keep partial lines, detect truncation/replacement, split matches.
- OBS uses window capture; browser source does not receive file permission.

## Review Focus
- UTF-8 and final partial lines: reader tests compare chunked and whole ingestion.
- Truncation and rewrite: reset on smaller size or changed prefix.
- Repeated add/death/revive events: parser state idempotent for consecutive duplicate events.
- Different team namespaces: score/name binding only inferred with repeated consistent evidence or explicit manual choice.
- Multiple match starts / repeated initialization: separate only at successful Join Match or a genuine new initialization after activity.

### Task 1: Incremental parser and reader
Files: dist/parser.mjs, dist/tailer.mjs, tests/core.test.mjs.
Interfaces: LogParser.feed(text), snapshot(index), matches; FileTailer.poll(file) => {reset,bytes,changed}; reset resets parser and stream decoder.
- [ ] Write failing node tests: names differ from gsTeam, player deaths/revives, duplicate records, multiple matches, incomplete lines, chunked UTF8, file growth/reset.
- [ ] Run node --test tests/core.test.mjs; expect missing modules before implementation.
- [ ] Implement parser with evidence mapping, no guessed team names or roster completeness.
- [ ] Run full core tests and analyze original log locally (never package log).

### Task 2: Live dashboard
Files: dist/index.html, dist/styles.css, dist/app.mjs.
Consumes parser/tailer snapshots; produces live table, match selector, manual mappings, local logos, focus mode, status and read errors.
- [ ] Implement accessible responsive Vietnamese dashboard with no remote assets or uploads.
- [ ] Add demo explicitly labeled synthetic with start/stop controls; real file replaces demo.
- [ ] Browser QA: demo, file capability fallback, roster, focus, responsive widths.

### Task 3: Verification and delivery
Files: README.md, START.cmd, serve.mjs, deployment manifest; zip deliverable.
- [ ] Syntax checks, full tests, real log validation and fresh independent code review.
- [ ] Publish owner-private Site with exact reviewed source; package local runnable version without credentials or logs.
- [ ] Deliver link and Windows launch instructions, describe any verification limits.
