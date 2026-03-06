# PROJECT.md

Project: Fanta Formula 1  
Type: Full-stack web application  
Architecture: SPA frontend + REST backend + MongoDB Atlas

This repository contains real production-facing business logic.
Production data exists and must be treated as important and non-disposable.

---

## 1. System Overview

Frontend:
- single-page application
- strongly typed
- no local persistence for core game state

Backend:
- REST API
- MongoDB persistence
- startup synchronization with external Formula 1 data sources
- retry logic for external calls

Database collections:
- `appdata`: game state and application data
- `drivers`: cached roster
- `weekends`: cached calendar

Frontend and backend are tightly coupled.
API contracts and score-related payload semantics must remain consistent.

---

## 2. Core Domain Constraints

- There are always exactly 3 players: Adriano, Fabio, Matteo.
- Data entry is admin-controlled.
- Predictions lock at official race start time.
- Race results are fetched from official Formula 1 sources.
- Score calculation must follow the configured application rules.
- Live projection logic must remain correct.
- Selected weekend context must be respected consistently across all views.

Any change affecting scoring, projections, standings, or lock timing must include:
- automated tests
- backward compatibility verification
- extra regression checks

---

## 3. Data Integrity Rules

- Manual predictions save requires at least one filled prediction field across the 3 players.
- Generic persistence flows may save an all-empty current predictions state only when produced by controlled application flows such as reset, results confirmation, or historical recalculation.
- Race lock must be enforced server-side, not only in the frontend.
- Results confirmation is allowed only after race completion.
- Existing persisted data must never be silently invalidated.
- Any schema evolution must be migration-safe.

No critical rule may rely only on frontend validation.

---

## 4. Scoring and Projection Safety Rules

The following areas are business-critical and regression-sensitive:
- score calculation logic
- live standings
- players' predictions tab calculations
- race projection inclusion/exclusion
- selected weekend score aggregation
- historical recalculation
- ranking totals and derived values
- external results parsing

Any change touching one of these areas must verify:
- current actual score calculation
- projected score calculation
- combined totals where projection is expected
- consistency between tabs/screens using shared scoring logic
- consistency for the selected weekend only
- no unintended change to unrelated score flows

If two UI tabs display related score information, shared logic divergence must be investigated before fixing symptoms separately.

---

## 5. Synchronization Rules

On backend startup:
- drivers must synchronize from the external source
- calendar/weekends must synchronize from the official source
- if sync fails, the application must fall back to cached database data

Synchronization failures must never prevent application startup.

---

## 6. Environment Rules

The application must work correctly in:
- local development
- production deployment

Rules:
- environment variables must not be hardcoded
- secrets must not be committed
- the targeted database/environment must always be explicitly identified when running locally
- local fixes must not introduce production-only or local-only scoring divergence

---

## 7. UI and Presentation Constraints

- keep the full-width layout
- preserve the current visual style
- do not introduce utility-first CSS frameworks
- keep centralized configuration patterns already used by the project
- preserve alphabetical ordering of drivers as `LastName FirstName`
- the footer must display `Application created by Matteo Bernardini©` and this is the only allowed explicit personal name reference in repository UI content

---

## 8. Performance Constraints

- avoid redundant MongoDB queries
- avoid repeated external API calls
- use caching where the current architecture expects it
- avoid blocking operations in request handlers

Do not trade correctness for micro-optimizations.

---

## 9. Backward Compatibility and Release Consistency

- do not silently break existing persisted data structures
- existing historical data must remain valid
- API contract changes require explicit review
- `CHANGELOG.md` is the canonical release history
- every version, tag, or release must keep `CHANGELOG.md`, version files, and actual released state aligned

---

## 10. Acceptance Standard

A task is complete only if:
- the requested behavior works end-to-end
- no scoring inconsistency is introduced
- no UI regression is introduced
- no API contract mismatch is introduced
- all relevant tests pass
- production-sensitive logic remains safe
