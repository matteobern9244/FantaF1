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
- `appdatas`: game state and application data
- `drivers`: cached roster
- `weekends`: cached calendar
- `standingscaches`: cached driver and constructor standings
- `admincredentials`: hashed admin credentials and authentication metadata

Frontend and backend are tightly coupled.
API contracts and score-related payload semantics must remain consistent.

---

## 2. Core Domain Constraints

- There are always exactly 3 participant slots.
- Participant names are runtime data persisted in the application state; the live roster may currently be Adriano, Fabio, and Matteo, but names are not hardcoded as a domain invariant.
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
- standings must synchronize from the external source
- if a sync fails, the application must fall back to cached database data for that domain when available

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
- `start_fantaf1.command` is the canonical local launcher: it must remain valid, executable, and aligned with the real mandatory startup flow, including preflight checks and final application boot

---

## 7. UI and Presentation Constraints

- keep the full-width layout
- preserve the current visual style
- do not introduce utility-first CSS frameworks
- keep centralized configuration patterns already used by the project
- every new component that introduces cards, panels, boxes, or secondary sub-panels must reuse the existing interactive visual feedback already present in the application instead of introducing isolated hover/focus variants
- visual interaction consistency for those surfaces must remain aligned across both admin view and public view
- every UI-affecting task must be verified in real browser behavior across admin view, public view, desktop breakpoints, and mobile breakpoints before the task is considered complete
- a missing or failing responsive/browser verification is a blocker, not a documentation note or an optional follow-up
- new fixes, modifications, and implementations must preserve end-to-end browser behavior without regressions across admin/public/mobile/desktop flows
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
- every version, tag, or release must keep `CHANGELOG.md`, `README.md`, `package.json`, `package-lock.json`, and actual released state strictly aligned
- when increasing the application version, it is mandatory to coordinate the bump across all files (`package.json`, `CHANGELOG.md`, `README.md`, etc.), never updating only the changelog

---

## 10. Acceptance Standard

A task is complete only if:
- the requested behavior works end-to-end
- no scoring inconsistency is introduced
- no UI regression is introduced
- no API contract mismatch is introduced
- all relevant tests pass
- browser and responsive checks pass for the affected admin/public flows
- coverage for the official application-code scope remains at 100% for lines, branches, functions, and statements
- production-sensitive logic remains safe
