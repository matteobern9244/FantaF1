# Implementation Plan: Fix Menu Third Item Focus

## Objective
Stabilize the active/focus state of the third menu item and harden adjacent menu behavior while reducing mobile menu font size for better readability.

## Applied Principles
- **AGENTS.md Applied**: all repository engineering rules are active.
- **Strict TDD**: RED -> GREEN -> REFACTOR for the residual menu bug.
- **Behavior Preservation First**: preserve the existing menu structure and section order.
- **Minimal Safe Change**: limit edits to active-state coordination, accessibility semantics, and mobile typography.
- **Coverage 100% totale**: keep repository/application coverage at 100%.

## RED -> GREEN -> REFACTOR
- [x] **RED**: reproduced the third-item active-state failure and mobile typography issue with focused tests and browser confirmation.
- [x] **GREEN**: implemented the smallest safe navigation-state, scroll-offset, and typography fix.
- [x] **REFACTOR**: removed the unreliable `scrollIntoView` dependency for menu navigation and aligned accessibility semantics with the active state.

## Phases
### Phase 1: Reproduce
1. [x] Reproduce the third-item highlight bug in real browser flow.
2. [x] Add or update automated tests for active state persistence on the third item.
3. [x] Confirm mobile menu typography is oversized and define the target reduction.

### Phase 2: Fix
1. [x] Fix active/highlight semantics for the third item and adjacent menu items.
2. [x] Fix related menu regressions discovered during reproduction, including mobile active-state drift after reopening the overlay.
3. [x] Reduce mobile menu font size while preserving readability.

### Phase 3: Verify
1. [x] Run lint, tests, build, coverage, and responsive verification.
2. [x] Update Conductor artifacts with real review and verification notes.

## Outcome
- Menu navigation now scrolls to a deterministic anchor offset instead of relying on `scrollIntoView`.
- Desktop and mobile both keep the third item visibly active after click.
- Mobile menu typography is reduced to a more readable size without harming legibility.
- Coverage documentation baselines were synchronized with the verified `test:csharp-coverage` output.
