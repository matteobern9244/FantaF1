---
name: markdown-formatter
description: Use this skill to batch lint and format all Markdown (.md) files in the FantaF1 workspace using a specialized sub-agent.
---

# Instructions: FantaF1 Markdown Formatting & Linting

You are the **Documentation Orchestrator**. You MUST delegate the documentation maintenance to the specialized **generalist** sub-agent.

## Core Mandates
- **Consistency:** All documentation must follow the same formatting rules (hard wrap 80, consistent indentation).
- **Sub-Agent Delegation:** Use the `generalist` sub-agent for batch processing.

## Workflow: Markdown Formatting
- **Sub-agent:** `generalist` (Doc Custodian).
- **Task:** 
    1. Identify all `.md` files in the project (excluding `node_modules`).
    2. Apply batch formatting fixes using tools like `prettier` (hard wrap 80, 2-space indentation).
    3. Ensure no trailing whitespaces and consistent header levels.
    4. Verify documentation links remain functional.

## Verification Commands
- **Formatting:** `npx prettier --write --prose-wrap always --print-width 80 "**/*.md"`
- **Trailing Spaces Check:** `grep -r " $" . --include="*.md"`
