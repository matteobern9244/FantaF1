# Implementation Plan: UI Menu Rework (Desktop Sidebar & Mobile Overlay)

## Delivered Work

- [x] Reviewed the navigation wiring in `src/App.tsx`, section navigation
      definitions, and responsive diagnostics.
- [x] Implemented the desktop sidebar as the real navigation shell, including
      collapse/expand behavior.
- [x] Implemented the mobile full-screen overlay menu with close action and
      footer actions.
- [x] Applied the F1-inspired menu styling and integrated the new `MenuLogo`
      branding.
- [x] Added component-level TDD coverage for `Sidebar` and `MobileOverlay`.
- [x] Integrated the menu actions into the real app shell for section
      navigation, admin/public switching, logout, and install CTA.

## Hardening Added After Initial Delivery

- [x] Fixed the desktop collapsed-layout bug by wiring the shell spacing to real
      app state instead of the invalid sibling selector.
- [x] Replaced the hardcoded mobile trigger label with the centralized UI text
      key.
- [x] Removed placeholder effects and reduced menu-specific transition scope to
      avoid unnecessary UI jank.
- [x] Added body scroll lock while the mobile overlay is open to prevent
      background jump/flicker.
- [x] Updated the responsive diagnostics to read the new menu/view-mode controls
      reliably.
- [x] Added runtime tests for sidebar collapse, localized mobile trigger,
      overlay close path, and body scroll lock.

## Superseded Planning Item

- [x] The temporary mockup preview toggle was not implemented as a
      product/runtime feature.
- [x] This step is considered superseded by the final integrated menu
      implementation in the live app shell, which replaced the prototyping
      phase.

## Final Validation

- [x] `npm run test:ui-responsive` passes across the responsive matrix after
      menu hardening.
- [x] Admin-only and public-only navigation entries remain role-sensitive in the
      live app.
- [x] Full test, build, lint, and coverage validations are part of the final
      verification set for the task.
- [x] The Conductor track is now documented as complete and archived with the
      final hardened runtime state.
