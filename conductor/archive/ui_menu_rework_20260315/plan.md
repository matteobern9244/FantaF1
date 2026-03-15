# Implementation Plan: UI Menu Rework (Desktop Sidebar & Mobile Overlay)

## Phase 1: Research & Setup
- [ ] Task: Review current navigation structure in `src/App.tsx` and associated components.
- [ ] Task: Audit existing styles in `src/index.css` and `src/App.css` for integration with the new F1 Racing Theme.
- [ ] Task: Research and define the F1 Racing Theme color palette and typography (Formula1 fonts, red/black/white accents).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Research & Setup' (Protocol in workflow.md)

## Phase 2: Design & Prototyping (Mockups)
- [ ] Task: Create a React component for the **Desktop Sidebar** (collapsible, left-aligned).
- [ ] Task: Create a React component for the **Mobile Full-screen Overlay**.
- [ ] Task: Apply the F1 Racing Theme styles to both components.
- [ ] Task: Add a temporary toggle/switch to allow the user to preview both "Proposed Mockups" on a single page or through a quick switch.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Design & Prototyping' (Protocol in workflow.md)

## Phase 3: TDD Implementation (Desktop Sidebar)
- [ ] Task: Write Vitest tests for the `Sidebar` component (test visibility, collapsibility, and link functionality).
- [ ] Task: Implement the `Sidebar` component to pass all tests.
- [ ] Task: Refactor and ensure 100% coverage.
- [ ] Task: Integrate `Sidebar` into the main application layout on desktop viewports.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: TDD Implementation (Desktop)' (Protocol in workflow.md)

## Phase 4: TDD Implementation (Mobile Overlay)
- [ ] Task: Write Vitest tests for the `MobileOverlay` component (test open/close states and link functionality).
- [ ] Task: Implement the `MobileOverlay` component to pass all tests.
- [ ] Task: Refactor and ensure 100% coverage.
- [ ] Task: Integrate `MobileOverlay` into the main application layout for mobile viewports.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: TDD Implementation (Mobile)' (Protocol in workflow.md)

## Phase 5: Final Validation & Cleanup
- [ ] Task: Run `npm run test:ui-responsive` to verify both layouts across all breakpoints.
- [ ] Task: Verify admin-only links visibility in both menu types.
- [ ] Task: Perform a final visual polish (animations, transitions).
- [ ] Task: Run full test suite: `npm run lint && npm run test && npm run build`.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Validation & Cleanup' (Protocol in workflow.md)
