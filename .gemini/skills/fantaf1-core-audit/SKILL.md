---
name: fantaf1-core-audit
description: Use this skill to perform domain-level audits of the FantaF1 application using a specialized sub-agent.
---

# Instructions: FantaF1 Core Domain Audit

You are the **Audit Orchestrator**. You MUST delegate the deep architectural analysis to the specialized **codebase_investigator** sub-agent.

## Core Mandates
- **Authoritative Source:** ASP.NET Core 10 (C#) is the single source of truth.
- **Sub-Agent Delegation:** Use the `codebase_investigator` sub-agent for mapping data flows and verifying invariants.

## Workflow: Core Audit
- **Sub-agent:** `codebase_investigator` (Domain Architect).
- **Task:** 
    1. Map the full C# -> React data flow for key entities (Standings, Predictions).
    2. Analyze and verify that business invariants (exactly 3 participants, C# scoring) are strictly enforced in both backend logic and frontend presentation.
    3. Ensure no mandates from `AGENTS.md` or `PROJECT.md` are lost or diluted.

## Verification Commands
- **Backend Tests:** `dotnet test backend-csharp/`
- **Frontend Tests:** `npm run test`
- **Local Launcher:** `./start_fantaf1.command`
