# Specification: Fix Mobile Menu Readability And Scroll Affordance

## Request

Fix the mobile menu readability issue shown in the provided screenshot: labels
look stretched/compressed and become hard to read. Keep the existing font
family, but make the mobile menu readable and easier to understand while
scrolling, without regressing the desktop menu that is already correct.

## Track

- Id: `track-001`
- Title: `Fix Mobile Menu Readability And Scroll Affordance`

## Goal

Improve mobile menu legibility and navigation affordance without changing the
established visual language or the desktop behavior.

## Source Of Truth

- `AGENTS.md` rules apply in full.
- Runtime-authoritative path:
  [App.tsx](/Users/matteobernardini/code/FantaF1/src/App.tsx),
  [MobileOverlay.tsx](/Users/matteobernardini/code/FantaF1/src/components/MobileOverlay.tsx),
  [App.css](/Users/matteobernardini/code/FantaF1/src/App.css)
- The attached mobile screenshot is treated as an explicit reproduction
  artifact.

## Problem Statement

- On mobile, the menu labels use the correct font family but render with poor
  readability because the text is visually squeezed inside the card layout.
- The current composition creates a stretched/compressed perception caused by
  wide uppercase glyphs, tight label geometry, icon/text spacing, and multi-line
  wrapping under narrow widths.
- While scrolling or reopening the mobile overlay, the menu does not communicate
  the current section as clearly as desktop, so orientation is weaker.

## Success Criteria

- Mobile labels remain in the current font family but no longer appear stretched
  or squashed.
- Menu labels are readable at common mobile widths, especially around `390x844`
  and similar devices.
- Text wrapping, spacing, and line rhythm feel intentional rather than
  compressed.
- The current/active section in mobile remains obvious during menu interaction
  and after reopening the overlay.
- Desktop menu behavior and styling remain functionally unchanged.
- No regressions in overlay open/close, section navigation, active highlighting,
  or responsive behavior.

## In Scope

- Mobile overlay layout, spacing, label wrapping, line-height, alignment, and
  affordance cues.
- Active/current-state clarity for mobile menu navigation.
- Focused RTL/browser regression coverage for the affected menu flow.
- Conductor track state and verification artifacts.

## Out Of Scope

- Changing the font family.
- Reworking the desktop menu visual system.
- Redesigning section order, IA, or unrelated panels.
- Backend or API changes.

## Constraints

- Keep the current font family and visual language.
- Follow centralized text/config patterns already in the repository.
- Use minimal, safe CSS/TSX changes only where needed.
- Preserve 80% coverage for the official repository/application scope.
- Do not perform git operations unless explicitly authorized.

## Open Questions

- None currently blocking; the requested direction is specific enough to proceed
  with implementation after plan approval.

## Confirmed Decisions

- No dedicated git branch will be created for this track because no explicit git
  authorization was provided.
- The fix will target readability and affordance, not a font replacement.
- Mobile behavior can be improved if adjacent issues are found in the same menu
  flow, provided scope remains confined to the mobile menu experience.
