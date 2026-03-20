# Specification: Mobile Menu Restyling (Track ID: `restaylyng_menu_mobile_20260316`)

## Overview

This track focuses on improving the mobile menu UI by increasing the height of
menu items and ensuring text is properly centered. The goal is to enhance
readability and touch targets on mobile devices while removing any unintentional
text stretching.

## Functional Requirements

- **Mobile Menu Item Height:** Increase the height of menu items in the mobile
  view to **60px**.
- **Vertical Alignment:** Ensure the text inside the mobile menu items is
  perfectly centered vertically using **Flexbox**.
- **Horizontal Alignment:** Ensure the text is centered horizontally within the
  menu item.
- **Text Appearance:** Remove any CSS "stretching" of the text by resetting
  `transform: scale`, `letter-spacing`, or `font-stretch` properties.
- **Font Family:** Apply the **Formula 1 font family** to the mobile menu text
  to match the F1-themed branding.
- **Mobile Breakpoint:** These changes should be applied only to screens with a
  width of **768px** or less.

## Non-Functional Requirements

- **Responsive Design:** The changes must not affect the desktop view (screens
  wider than 768px).
- **Performance:** Ensure that the CSS changes do not negatively impact the
  rendering performance of the mobile menu.
- **Maintainability:** Use clear and descriptive CSS class names or selectors in
  accordance with the project's styling conventions.

## Acceptance Criteria

- [ ] Mobile menu items have a height of exactly 60px on devices ≤ 768px.
- [ ] Text in mobile menu items is vertically and horizontally centered.
- [ ] Text in mobile menu items is NOT stretched (e.g., no `transform: scaleX`).
- [ ] Text in mobile menu items uses the Formula 1 font family.
- [ ] Desktop menu (screens > 768px) remains unchanged in its layout and
      styling.
- [ ] 100% test coverage for the mobile menu component and related styles.

## Out of Scope

- Changes to the desktop menu layout or functionality.
- Adding new menu items or changing the existing navigation structure.
- Modifying the mobile menu overlay's open/close logic or animations.
