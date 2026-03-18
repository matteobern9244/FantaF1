# Implementation Plan: Mobile Menu Restyling (Track ID: `restaylyng_menu_mobile_20260316`)

## Objective
The objective of this track is to improve the mobile menu UI by increasing the height of menu items to 60px, ensuring text is perfectly centered (vertically and horizontally) using Flexbox, and removing any text stretching by resetting CSS properties like `transform: scale` and `letter-spacing`. The changes will also ensure the Formula 1 font family is applied and will only take effect on mobile devices (screens ≤ 768px).

## Key Files & Context
- `src/components/MobileOverlay.tsx`: The React component for the mobile menu.
- `src/App.css`: The main stylesheet where mobile navigation styles are defined.
- `tests/ui-mobile-overlay.test.tsx`: Existing tests for the mobile menu.
- `AGENTS.md`: Mandatory engineering instructions.
- `conductor/workflow.md`: Standard development workflow.

## Implementation Steps

### Phase 1: Preparation and Baseline Verification
1. [ ] **Verify Current State:** Run existing tests to ensure a clean baseline.
   - Command: `npm run test tests/ui-mobile-overlay.test.tsx`
2. [ ] **Baseline Screenshot (Manual):** Optionally, run the app and take a screenshot of the current mobile menu for comparison.
   - Command: `./start_fantaf1.command` (Manual check in browser at mobile width)

### Phase 2: Test-Driven Development (TDD)
1. [ ] **RED: Create Styling Regression Test:** Add a new test case to `tests/ui-mobile-overlay.test.tsx` that asserts the expected classes and basic structure are present. Note: Full CSS computed value testing is limited in jsdom, but we can verify class presence and basic layout properties if needed.
2. [ ] **GREEN: Implement CSS Changes:**
   - [ ] Modify `.mobile-nav-item` in `src/App.css` within the relevant `@media` query (or ensure it's scoped properly).
     - Set `min-height: 60px;`.
     - Ensure `display: flex; align-items: center; justify-content: center;`.
   - [ ] Update `.mobile-nav-label` in `src/App.css`.
     - Change `font-family: 'Formula1Wide', sans-serif;` to `font-family: 'Formula1', sans-serif;`.
     - Reset `transform`, `letter-spacing`, and `font-stretch` to ensure no stretching.
     - Ensure `text-align: center;`.
3. [ ] **REFACTOR: Clean Up CSS:** Ensure the CSS is organized and follows project conventions. Verify that the mobile changes are correctly scoped to the mobile breakpoint (≤ 768px).

### Phase 3: Validation and Verification
1. [ ] **Verify Tests:** Run the updated test suite.
   - Command: `npm run test tests/ui-mobile-overlay.test.tsx`
2. [ ] **Check Responsive UI:** Run the responsive UI check to ensure no regressions on other views.
   - Command: `npm run test:ui-responsive` (or `check viste`)
3. [ ] **Manual Verification:** Start the app and manually verify the mobile menu on a mobile device or browser emulator.
   - Command: `./start_fantaf1.command`
4. [ ] **Full Validation Suite:** Run all project validations.
   - Commands: `npm run lint`, `npm run test`, `npm run build`
5. [ ] **Coverage 100% totale:** Verify that code coverage remains at 100% for the entire application.
   - Command: `npm run test -- --coverage`

### Phase 4: Finalization
1. [ ] **Update Documentation:** Update `CHANGELOG.md` with the mobile menu improvements.
2. [ ] **Commit Changes:** Stage and commit the changes (after user approval).
   - Message: `feat(ui): restyle mobile menu items for better readability and centering`

---

## Verification & Testing
- **TDD:** Strict adherence to RED -> GREEN -> REFACTOR.
- **Unit Tests:** `tests/ui-mobile-overlay.test.tsx` updated and passing.
- **Responsive UI:** `npm run test:ui-responsive` passing.
- **Manual Check:** Visual confirmation of 60px height, centered text, and no stretching on mobile view.
- **100% Coverage:** Verified via `npm run test -- --coverage`.

## Conductor - User Manual Verification 'Mobile Menu Restyling' (Protocol in workflow.md)
- [ ] Task: Conductor - User Manual Verification 'Mobile Menu Restyling' (Protocol in workflow.md)
