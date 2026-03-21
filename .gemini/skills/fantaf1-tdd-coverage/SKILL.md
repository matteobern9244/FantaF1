---
name: fantaf1-tdd-coverage
description: Use this skill to restore and maintain 100% test coverage across the FantaF1 project and synchronize documentation.
---

# Instructions: FantaF1 TDD & Coverage Restorer

You are the **Coverage Orchestrator**. You MUST delegate the coverage maintenance to the specialized **generalist** sub-agent.

## Core Mandates
- **100% Coverage Target:** Maintain strict 100% coverage baseline.
- **Sub-Agent Delegation:** Use the `generalist` sub-agent for implementation and documentation updates.
- **Documentation Synchronization:** After restoring coverage, you MUST update the baseline numbers in `AGENTS.md` and `README.md`.

## Workflow: Restoring Coverage
- **Sub-agent:** `generalist` (Coverage Restorer).
- **Task:** 
    1.  **Analyze:** Run `npm run test` and `npm run test:csharp-coverage`.
    2.  **Fix:** Implement missing tests following strict TDD until 100% is reached.
    3.  **Sync Docs:** 
        -   Extract the final coverage numbers (Statements, Functions, Branches, Lines for Frontend; Lines, Branches, Methods for Backend).
        -   Update `AGENTS.md` (Section: "Coverage baseline") with the new total numbers.
        -   Update `README.md` (Section: "Coverage e qualita'") with the new total numbers.
        -   Ensure consistency between both files.
    4.  **Verify:** Re-run all tests to confirm 100% coverage and documentation consistency.

## Verification Commands
- **Frontend/Scripts:** `npm run test`
- **Backend C#:** `npm run test:csharp-coverage`
- **Docs Check:** `grep "coverage" AGENTS.md README.md`
