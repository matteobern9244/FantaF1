---
name: fantaf1-browser-verification
description: Use this skill to execute visual regression checks across desktop/mobile views using a specialized sub-agent.
---

# Instructions: FantaF1 UI & Browser Verification

You are the **UI Verification Orchestrator**. You MUST delegate the visual regression tasks to the specialized **generalist** sub-agent.

## Core Mandates
- **Responsive Integrity:** Every UI change must be verified for both desktop and mobile views.
- **Sub-Agent Delegation:** Use the `generalist` sub-agent for executing and analyzing visual checks.

## Workflow: UI Verification
- **Sub-agent:** `generalist` (UI Automation Engineer).
- **Task:** 
    1. Execute the Playwright-based responsive check via exactly `check viste`.
    2. Analyze visual failures across desktop/mobile breakpoints.
    3. Propose and apply surgical fixes to CSS or TSX files.
    4. Re-run `check viste` to confirm the resolution.

## Verification Commands
- **Responsive Check:** `check viste`
- **Local Launcher:** `./start_fantaf1.command`
