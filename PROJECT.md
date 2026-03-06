# PROJECT.md

Project: Fanta Formula 1  
Type: Full-stack Web Application  
Architecture: SPA frontend + REST backend + MongoDB

This file defines the **repository-specific truth** for FantaF1.
All agent behavior must preserve these constraints.

---

## 1. Repository Context

FantaF1 already has **real production data** in the database.
Every fix, modification, refactor, or new implementation must therefore be treated as a **production-safe activity**.

Unacceptable outcomes:
- data corruption
- unintended behavior changes
- regression in existing features
- broken API contracts
- silent incompatibility with existing persisted data

---

## 2. Architecture Overview

Frontend:
- SPA application
- strongly typed
- no local persistence for core game data

Backend:
- REST API
- MongoDB persistence
- external source synchronization at startup
- retry logic for external calls

Database:
- MongoDB Atlas
- `appdata`: game state
- `drivers`: cached roster
- `weekends`: cached calendar

Frontend and backend are tightly coupled.
API contracts must remain consistent unless the user explicitly requests a breaking change.

---

## 3. Core Functional Constraints

The game currently operates with exactly 3 players:
- Adriano
- Fabio
- Matteo

Core rules:
- data entry is admin-controlled
- predictions are locked at official race start time
- results are auto-fetched from official F1 sources
- live projection logic must remain correct
- score calculation must follow configured rules

Any change affecting scoring, ranking, projections, or race lock behavior requires:
- updated tests
- regression validation
- backward compatibility verification

---

## 4. Data Integrity Rules

- No partial saves are allowed.
- All players must have complete predictions.
- Race lock must be enforced server-side.
- Results confirmation is only allowed after race completion.
- No critical rule may rely only on frontend validation.

Persisted and historical data must remain valid after changes.

---

## 5. Synchronization Rules

On backend startup:
- drivers must sync from the external source
- calendar must sync from the official source
- if sync fails, the application must fall back to cached database data

External synchronization failure must never prevent safe application startup.

---

## 6. Environment and Deployment Constraints

The repository must work in:
- local development
- production deployment

Rules:
- environment variables must never be hardcoded
- secrets must never be committed
- local and production database targets must remain clearly distinguishable
- when the application is started locally, the targeted database/environment must always be explicitly stated and verified

Deployment compatibility must remain intact, including Render.com and MongoDB connectivity where relevant to the task.

---

## 7. UI and UX Constraints

- Maintain the existing full-width layout approach.
- Keep configuration centralized.
- Do not introduce utility-first CSS frameworks.
- Preserve the current visual consistency unless a UI redesign is explicitly requested.
- Keep drivers alphabetically ordered as `LastName FirstName`.
- The footer must display `Application created by Matteo Bernardini©`.
  This is the only allowed explicit personal name reference in the repository UI.

---

## 8. Performance Constraints

- Avoid redundant database queries.
- Avoid repeated external API calls when cached data is appropriate.
- Prefer caching where it reduces needless external or DB load.
- Do not introduce blocking operations into request handlers.

---

## 9. High Regression-Risk Areas

Changes in these areas are high sensitivity and require extra validation:
- score calculation logic
- race lock timing
- live projections
- historical recalculation
- external results parsing
- synchronization fallback logic
- persisted data structure

For these areas, validate both direct behavior and adjacent side effects.

---

## 10. Versioning and Backward Compatibility

- Never silently break existing persisted data structures.
- Any schema change must be migration-safe.
- Existing historical data must remain readable and valid.
- `CHANGELOG.md` is the canonical release history for this repository.
- Every new application version, git tag, or release must update `CHANGELOG.md` in the same task.
- `package.json`, `CHANGELOG.md`, tags, and release state must stay aligned.

---

## 11. Acceptance Standard

A task is complete only if, where applicable:
- the requested behavior works end-to-end
- no scoring inconsistency is introduced
- no UI regression is introduced
- no API contract mismatch is introduced
- tests pass
- build passes
- production data safety is preserved
- backward compatibility is preserved unless explicitly waived by the user
