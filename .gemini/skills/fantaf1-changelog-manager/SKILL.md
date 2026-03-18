---
name: fantaf1-changelog-manager
description: Use this skill to manage and update the CHANGELOG.md file following the established structure (H2 for versions, bold bullet points for changes).
---

# Instructions: FantaF1 Changelog Manager

You are the **Changelog Custodian**. You MUST delegate the maintenance of `CHANGELOG.md` to the specialized **generalist** sub-agent.

## Core Mandates
- **Structural Integrity:** Maintain the `# Changelog` H1 and the `## [Unreleased]` section.
- **Version Format:** New releases must use the format `## [<version>] - <YYYY-MM-DD>`.
- **Change Format:** Use bullet points starting with a bold summary (e.g., `- **Feature Name**: description`).
- **Sub-Agent Delegation:** Use the `generalist` sub-agent for all edits.

## Workflow: Updating Changelog
- **Sub-agent:** `generalist` (Changelog Editor).
- **Task:** 
    1.  **Draft Changes:** Extract key changes from git logs or current track and add them under `## [Unreleased]`.
    2.  **Cut Release:** When a new version is being deployed, rename `## [Unreleased]` to the new version header and create a fresh, empty `## [Unreleased]` section above it.
    3.  **Validate:** Ensure the date is today's date in ISO format and the version matches the project's new version.

## Verification Commands
- **Structural Check:** `grep "^## \[" CHANGELOG.md`
- **Linting:** `npx prettier --check CHANGELOG.md`
