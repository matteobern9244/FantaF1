# Track Specification: Fix Menu Focus And Active Navigation

## Overview

Desktop and mobile menu navigation currently has focus and active-state
inconsistencies. Deep menu items can lose the correct highlight after click, and
the history item can fail to navigate when no archived races exist.

## Functional Requirements

- Keep active menu highlighting stable when clicking deep sections like results
  and history.
- Ensure every menu item always has a stable DOM target in the current view.
- Keep mobile overlay navigation behavior aligned with desktop active-section
  behavior.
- Preserve the existing admin/public view-mode behavior.

## Non-Functional Requirements

- **AGENTS.md Compliance**: strict TDD, minimal safe change, deterministic
  validation.
- **Coverage 100% totale**: frontend/repository and backend C# official coverage
  must remain at 100%.
- **UI Stability**: no desktop/mobile regressions in development or
  production-like validation.

## Acceptance Criteria

- [ ] `Risultati del weekend` remains the active item after click.
- [ ] `Storico gare` navigates correctly even when history is empty.
- [ ] Focus-visible and active styles are consistent on desktop and mobile.
- [ ] Full validation stack passes with 100% coverage maintained.
