# PROJECT.md

Project: Fanta Formula 1  
Type: Full-stack Web Application  
Architecture: SPA frontend + REST backend + MongoDB

---

## 1. Architecture Overview

Frontend:
- SPA application
- Strongly typed
- No local persistence for core game data

Backend:
- REST API
- MongoDB persistence
- External source synchronization at startup
- Retry logic for external calls

Database:
- MongoDB Atlas
- appdata: game state
- drivers: cached roster
- weekends: cached calendar

Frontend and backend are tightly coupled.
API contracts must remain consistent.

---

## 2. Core Functional Constraints

- Always exactly 3 players.
- Admin-controlled data entry.
- Predictions locked at official race start time.
- Results auto-fetched from official F1 sources.
- Live projection logic must remain correct.
- Score calculation must follow configured rules.

Any change affecting scoring must include:
- Updated tests
- Backward compatibility verification

---

## 3. Data Integrity Rules

- No partial saves allowed.
- All players must have complete predictions.
- Race lock must be enforced server-side.
- Results confirmation only allowed after race completion.

No logic must rely solely on frontend validation.

---

## 4. Synchronization Rules

On backend startup:
- Drivers must sync from external source.
- Calendar must sync from official source.
- If sync fails, fallback to cached DB data.

External sync must never break app startup.

---

## 5. Environment Constraints

Must work in:
- Local development
- Production deployment

Environment variables must not be hardcoded.
No secrets in repository.

---

## 6. UI Constraints

- Full-width layout.
- Centralized configuration.
- No introduction of utility-first CSS frameworks.
- Maintain existing aesthetic consistency.
- Maintain alphabetical ordering of drivers (LastName FirstName).

---

## 7. Performance Constraints

- Avoid redundant DB queries.
- Avoid repeated external API calls.
- Cache when possible.
- No blocking operations in request handlers.

---

## 8. Regression Sensitivity Areas

High-risk areas:
- Score calculation logic
- Race lock timing
- Live projections
- Historical recalculation
- External results parsing

Changes in these areas require additional validation.

---

## 9. Versioning & Backward Compatibility

- Never break existing persisted data structure silently.
- Any schema change must be migration-safe.
- Existing historical data must remain valid.

---

## 10. Acceptance Standard

A task is complete only if:

- Game flow works end-to-end.
- No scoring inconsistency.
- No UI regressions.
- No API contract mismatch.
- All tests pass.