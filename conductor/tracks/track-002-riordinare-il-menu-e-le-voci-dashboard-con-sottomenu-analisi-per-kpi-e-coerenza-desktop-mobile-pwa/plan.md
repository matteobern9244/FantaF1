# Plan

## Summary

Riordinare la navigazione sezione in modo data-driven, introdurre una gerarchia
menu per il gruppo `Analisi`, riflettere l'ordine nella dashboard e certificare
la parita' tra desktop, mobile e PWA senza regressioni.

## Execution Rules

- Follow `AGENTS.md` and `conductor/workflow.md` throughout the track.
- Execute implementation with explicit TDD phases: red, green, refactor.
- Update track progress as phases and numbered steps move forward.
- Record meaningful verification checkpoints in `verify.md`.
- Treat the end of a phase as the standard commit boundary unless the approved
  workflow says otherwise.
- Do not commit or push for this track unless the user later changes the policy.

## Phase 1: Spec

- [x] Step 1. Draft and confirm the spec
- [x] Step 2. Capture the dedicated branch context
      `change-menu-options-dashboard`
- [x] Step 3. Freeze the requested menu order and submenu scope in `spec.md`

## Phase 2: Discovery And Design

- [x] Step 1. Inspect the current section ordering source of truth in
      `sectionNavigation.ts` and dashboard render order in `App.tsx`
- [x] Step 2. Inspect the desktop and mobile menu renderers to determine the
      minimal seam for grouped navigation items
- [x] Step 3. Decide whether the `Analisi` submenu should be modeled as nested
      navigation data or derived rendering-only grouping
- [x] Step 4. Identify all impacted tests and responsive checks for desktop,
      mobile and PWA surfaces
- [x] Step 5. Confirm localization/config impacts in `config/app-config.json`

## Phase 3: TDD Implementation

- [x] Step 1. RED: add/update deterministic tests for desktop sidebar order and
      nested `Analisi` structure
- [x] Step 2. RED: add/update deterministic tests for mobile overlay/PWA order
      and nested `Analisi` structure
- [x] Step 3. RED: add/update dashboard ordering tests so the page content
      follows the same requested order
- [x] Step 4. GREEN: implement the minimum navigation/data changes needed to
      satisfy the new order on desktop and mobile
- [x] Step 5. GREEN: implement the grouped `Analisi` submenu without regressing
      admin/public behavior or footer actions
- [x] Step 6. REFACTOR: simplify the navigation model and remove duplication
      while keeping all updated tests green

## Phase 4: Verification

- [x] Step 1. Run targeted frontend tests for sidebar, mobile overlay, mockup
      roadmap and any new navigation grouping tests
- [x] Step 2. Run `npm run lint`
- [x] Step 3. Run `npm run test`
- [x] Step 4. Run `npm run test:coverage`
- [x] Step 5. Run `npm run build`
- [x] Step 6. Run `npm run test:ui-responsive`
- [x] Step 7. Record final verification results and 100% coverage status in
      `verify.md`

## Public Interfaces

- Navigation labels from `appText.shell.navigation.items`
- Section IDs in `SectionNavigationId`
- Desktop navigation surface in `Sidebar`
- Mobile/PWA navigation surface in `MobileOverlay`

## Test Plan

- [x] Verify desktop sidebar renders the new order
- [x] Verify mobile overlay renders the same order
- [x] Verify the `Analisi` group exposes exactly two child items
- [x] Verify footer actions remain at the end of the menu
- [x] Verify admin/public mode actions still behave correctly
- [x] Verify dashboard section order matches the menu order
- [x] Verify repository/application coverage remains at 100%

## Assumptions

- The grouped submenu can be implemented entirely in the frontend without
  backend changes.
- Existing UI copy in `config/app-config.json` is already sufficient for the
  requested labels, except for a possible new parent label `Analisi`.

## Acceptance Criteria

- The main navigation order matches the requested sequence.
- `Analisi` exists as a parent menu item and contains only
  `Deep-dive KPI dashboard` and `User KPI Dashboard`.
- `Installa applicazione` and `Accesso admin` stay at the bottom footer area.
- Desktop browser, mobile browser and PWA all show coherent navigation.
- The dashboard content order mirrors the same requested order.
- No regression on admin/public flows.

## Regression Checks

- Desktop development navigation remains clickable and the active state is
  preserved.
- Mobile overlay still opens, closes, locks scroll and navigates correctly.
- PWA install CTA remains available in the footer area.
- Admin access/login CTA remains in the footer area and unchanged in behavior.
- Existing analytics, history, standings and guide panels remain reachable.

## Coverage 100% totale

- Preserve `100%` statements, functions, branches and lines for the official
  frontend/repository scope.
- Preserve `100%` official backend C# coverage baseline even if the backend is
  not directly modified.
- Do not close the track if any touched scope falls below `100%`.
