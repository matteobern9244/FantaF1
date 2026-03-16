# Specification: UI Menu Rework (Desktop Sidebar & Mobile Overlay)

## Overview
This track focuses on redesigning the application's navigation menu to provide a more modern, F1-inspired experience. The navigation will be moved to a collapsible sidebar on the left for desktop users and a full-screen overlay for mobile users.

## Functional Requirements
- **Desktop Navigation:**
  - Implement a collapsible sidebar on the left side of the viewport.
  - Provide a toggle button to switch between expanded (icons + labels) and collapsed (icons only) states.
  - Ensure the sidebar stays fixed while the main content scrolls.
- **Mobile Navigation:**
  - Implement a full-screen overlay menu triggered by a prominent menu icon (e.g., hamburger).
  - The overlay should contain all navigation links, including user and admin actions.
  - Provide a clear 'close' action within the overlay.
- **Menu Content:**
  - **Public Links:** Home/Dashboard, Standings, Schedule, etc.
  - **User Actions:** Login/Logout, Profile (if applicable).
  - **Admin Tools:** Links to weekend management and results entry (conditionally visible).
- **Design & Branding:**
  - Apply an **F1 Racing Theme**: Dark backgrounds, carbon fiber textures (optional), and Formula 1 red/white accents.
  - Use high-quality icons from `lucide-react`.

## Non-Functional Requirements
- **Responsive Design:** Seamless transition between desktop and mobile layouts based on standard breakpoints.
- **Performance:** Ensure no layout jank during transitions or toggling.
- **Accessibility:** Ensure menu items are keyboard-navigable and screen-reader friendly.

## Acceptance Criteria
1.  **Desktop Layout:** Sidebar is on the left, starts expanded, and can be collapsed by the user.
2.  **Mobile Layout:** Navigation is hidden behind a menu icon and opens as a full-screen overlay.
3.  **Role Sensitivity:** Admin tools are only visible when the user is logged in as an administrator.
4.  **Style:** The UI matches the requested F1 Racing Theme.
5.  **Validation:** `npm run test:ui-responsive` passes for all breakpoints.
6.  **Coverage:** 100% code coverage for any new or modified components.

## Out of Scope
- Redesigning the internal content of individual panels/pages.
- Changing the backend logic for authentication or data retrieval.
