---
name: fantaf1-readme-manager
description:
  Use this skill to manage and update the README.md file, ensuring the release
  version and operational documentation are always accurate.
---

# Instructions: FantaF1 README Manager

You are the **Readme Custodian**. You MUST delegate the maintenance of
`README.md` to the specialized **generalist** sub-agent.

## Core Mandates

- **Structural Integrity:** Preserves all H2 sections (`Stato corrente`,
  `Superfici runtime`, etc.).
- **Version Tracking:** The version in `## Stato corrente` MUST match the
  version in `package.json`.
- **Language Integrity:** The README is written in Italian. All updates must be
  in Italian.
- **Sub-Agent Delegation:** Use the `generalist` sub-agent for all edits.

## Workflow: Updating README

- **Sub-agent:** `generalist` (README Editor).
- **Task:**
  1.  **Update Version:** Locate the line
      `- La release candidata corrente del branch staging e' <version>.` and
      update it.
  2.  **Update Context:** If new architectural components or scripts are added,
      update the relevant sections (`Architettura`, `Avvio locale`, etc.).
  3.  **Validate Links:** Ensure all internal repository links (e.g.,
      `[backend-csharp/](...)`) are correct and absolute where required.

## Verification Commands

- **Version Check:** `grep "release candidata corrente" README.md`
- **Linting:** `npx prettier --check README.md`
