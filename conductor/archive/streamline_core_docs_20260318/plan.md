# Implementation Plan: Streamline documentation (GEMINI.md)

## Phase 1: Audit and Mapping

- [x] Task: Review `AGENTS.md` to identify core mandates that `GEMINI.md` must
      enforce.
- [x] Task: Audit current `GEMINI.md` and map its sections to potential modular
      targets (Skills or sub-docs).
- [x] Task: Conductor - User Manual Verification 'Audit and Mapping' (Protocol
      in workflow.md)

## Phase 2: Modularization and Skill Definition

- [x] Task: Create `fantaf1-tdd-coverage` skill.
  - **Sub-agent:** `generalist` (Coverage Restorer).
  - **Task:** Analyze coverage reports and write missing tests to maintain 80%.
- [x] Task: Create `fantaf1-deploy` skill (The 23-point protocol).
  - **Fase A: Release Planner (`generalist`):** Preflight, Dry-run, Version Bump
    in all files, Release Notes in `CHANGELOG.md`. (Punti 1-6)
  - **Fase B: Quality Gatekeeper (`generalist`):** Full validation (Lint, Test,
    Build), Scoring/Projection safety checks. (Punti 7-9)
  - **Fase C: Integration Manager (`generalist`):** Commit, Push, PR creation
    (`gh cli`), Auto-merge monitoring. (Punti 10-17)
  - **Fase D: Release Publisher (`generalist`):** Tagging, GitHub Release
    creation, Cleanup, Branch restore. (Punti 18-23)
- [x] Task: Create `fantaf1-browser-verification` skill.
  - **Sub-agent:** `generalist` (UI Automation Engineer).
  - **Task:** Execute `check viste`, analyze visual failures, propose CSS/TSX
    fixes.
- [x] Task: Create `markdown-formatter` skill.
  - **Sub-agent:** `generalist` (Doc Custodian).
  - **Task:** Batch linting/formatting of all `.md` files in the workspace.
- [x] Task: Create `fantaf1-core-audit` skill.
  - **Sub-agent:** `codebase_investigator` (Domain Architect).
  - **Task:** Map C# -> React data flow and verify business invariants.
- [x] Task: Conductor - User Manual Verification 'Skill Definition' (Protocol in
      workflow.md)

## Phase 3: GEMINI.md Streamlining & Routing

- [x] Task: Rewrite `GEMINI.md` as a minimal "Router".
  - Load `AGENTS.md` mandates.
  - Activate the 5 new skills via `activate_skill`.
- [x] Task: Move detailed technical rules to `conductor/code_styleguides/` for
      shared access.
- [x] Task: Verify that `AGENTS.md` remains the untouched single source of
      truth.
- [x] Task: Conductor - User Manual Verification 'GEMINI.md Streamlining'
      (Protocol in workflow.md)

## Phase 4: Markdown Formatting Execution

- [x] Task: Execute `markdown-formatter` via `generalist` on all `.md` files.
- [x] Task: Verify all formatting warnings are resolved.
- [x] Task: Conductor - User Manual Verification 'Markdown Formatting Execution'
      (Protocol in workflow.md)

## Phase 5: Final Validation & Audit

- [x] Task: Perform `fantaf1-core-audit` via `codebase_investigator` to ensure
      no mandates were lost.
- [x] Task: Verify 80% coverage is maintained using `fantaf1-tdd-coverage`.
- [x] Task: Conductor - User Manual Verification 'Final Review' (Protocol in
      workflow.md)
