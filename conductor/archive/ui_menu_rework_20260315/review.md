# Review

## Outcome

The menu rework is complete as a delivered feature and has been hardened after
merge validation.

## What Was Delivered

- Desktop navigation moved to a fixed collapsible sidebar.
- Mobile navigation moved to a full-screen overlay with explicit close action.
- Footer actions consolidated into the menu: admin/public mode switch,
  login/logout, install app.
- New F1-themed menu styling and branding integrated without changing backend
  behavior.

## Problems Found During Hardening

- The desktop collapsed layout did not actually shift the shell correctly
  because the CSS selector relied on an impossible sibling relationship.
- The mobile menu trigger still used a hardcoded accessibility label.
- Menu-specific transitions were broader than necessary and risked avoidable
  micro-jank.
- The mobile overlay did not explicitly lock body scroll while open.
- The archived track documentation no longer reflected the real implementation
  state.

## Fixes Applied

- Added app-shell collapsed-state wiring from the sidebar to the parent shell.
- Localized the mobile menu trigger label through `uiText`.
- Narrowed menu transitions to the properties actually animated.
- Added body scroll lock while the mobile overlay is open.
- Extended runtime tests around real menu interactions.
- Updated this archived Conductor track to match the delivered and verified
  state.
