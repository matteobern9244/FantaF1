# Implementation Plan: Streamline documentation (GEMINI.md & AGENTS.md)

## Phase 1: Audit and Alignment
- [ ] Task: Read and compare `AGENTS.md` and `GEMINI.md`.
- [ ] Task: Identify critical instructions present in `AGENTS.md` but missing in `GEMINI.md`.
- [ ] Task: Update `GEMINI.md` to incorporate missing mandates from `AGENTS.md`.
- [ ] Task: Conductor - User Manual Verification 'Audit and Alignment' (Protocol in workflow.md)

## Phase 2: Responsibility Analysis
- [ ] Task: Map existing sections in `GEMINI.md` to specific responsibility categories (Style, Workflow, Security, etc.).
- [ ] Task: Identify which sections are "heavy" and better suited for a Skill or a sub-document.
- [ ] Task: Draft a proposal for the new documentation structure.
- [ ] Task: Conductor - User Manual Verification 'Responsibility Analysis' (Protocol in workflow.md)

## Phase 3: Migration and Modularization
- [ ] Task: Create or update local `.skill` files for operational workflows identified in Phase 2.
- [ ] Task: Move coding style guides to `conductor/code_styleguides/` or appropriate sub-directories.
- [ ] Task: Update `GEMINI.md` to link to the new Skills and sub-documents, removing the migrated content.
- [ ] Task: Ensure `AGENTS.md` remains aligned or refers to the same modular sources.
- [ ] Task: Conductor - User Manual Verification 'Migration and Modularization' (Protocol in workflow.md)

## Phase 4: Merge Strategy Proposal
- [ ] Task: Define the requirements for a "Documentation Merge Skill" to keep `GEMINI.md` and `AGENTS.md` in sync.
- [ ] Task: Create a draft or prototype of this skill (e.g., in `~/.gemini/skills/`).
- [ ] Task: Conductor - User Manual Verification 'Merge Strategy Proposal' (Protocol in workflow.md)

## Phase 5: Final Review
- [ ] Task: Perform a final `conductor-compliance-audit` to ensure no mandates were lost.
- [ ] Task: Verify that the lean `GEMINI.md` still provides enough context for the agent to operate correctly.
- [ ] Task: Conductor - User Manual Verification 'Final Review' (Protocol in workflow.md)
