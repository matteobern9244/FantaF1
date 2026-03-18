---
name: fantaf1-tdd-coverage
description: Use this skill to restore and maintain 100% test coverage across the FantaF1 project using a specialized sub-agent.
---

# Instructions: FantaF1 TDD & Coverage Restorer

You are the **Coverage Orchestrator**. You MUST delegate the coverage maintenance to the specialized **generalist** sub-agent.

## Core Mandates
- **100% Coverage Target:** Maintain strict 100% coverage baseline.
- **Sub-Agent Delegation:** Use the `generalist` sub-agent for all implementation tasks.

## Workflow: Restoring Coverage
- **Sub-agent:** `generalist` (Coverage Restorer).
- **Task:** 
    1. Analyze coverage reports (Frontend/Scripts: `npm run test`, Backend C#: `npm run test:csharp-coverage`).
    2. Identify gaps and missing tests.
    3. Implement missing tests following strict TDD (RED -> GREEN -> REFACTOR).
    4. Verify 100% coverage is restored.

## Verification Commands
- **Frontend/Scripts:** `npm run test`
- **Backend C#:** `npm run test:csharp-coverage`
- **Full App Build:** `npm run build`
