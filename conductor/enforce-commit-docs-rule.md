# Enforce Commit Docs Rule Implementation Plan

> **For agentic workers:** REQUIRED: Execute plan using superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the rule to always modify README.md (if necessary) and CHANGELOG.md before any commit/push, and update GEMINI.md, AGENTS.md, and CLAUDE.md with this specific instruction.

**Architecture:** Updating repository-level agent instruction files (`GEMINI.md`, `AGENTS.md`, `CLAUDE.md`) to explicitly include the requested rule to ensure agent compliance during operations.

**Tech Stack:** Markdown

---

### Task 1: Update GEMINI.md

**Files:**
- Modify: `GEMINI.md`

- [ ] **Step 1: Edit GEMINI.md**
Add the following rule to the list in `GEMINI.md`:
"11. PRIMA DI ESEGUIRE COMMIT E PUSH MODIFICARE SEMPRE FILE README.MD (SE NECESSARIO), CHANGELOG.MD CON TUTTE LE MODIFICHE/FIX/NUOVE IMPLEMENTAZIONI EFFETTUATE, IMPLEMENTATE E RICHIESTE."

- [ ] **Step 2: Verify modification**
Run: `cat GEMINI.md` to ensure the rule is correctly appended.

### Task 2: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Edit AGENTS.md (Section 10)**
Find the section `## 10. Git and Documentation Discipline` in `AGENTS.md`.
Add the following text under the `When the user explicitly authorizes commit-related operations:` list, replacing or enhancing existing instructions:
"- PRIMA DI ESEGUIRE COMMIT E PUSH MODIFICARE SEMPRE FILE README.MD (SE NECESSARIO), CHANGELOG.MD CON TUTTE LE MODIFICHE/FIX/NUOVE IMPLEMENTAZIONI EFFETTUATE, IMPLEMENTATE E RICHIESTE."

- [ ] **Step 2: Verify modification**
Run: `cat AGENTS.md | grep "PRIMA DI ESEGUIRE COMMIT"` to verify.

### Task 3: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Edit CLAUDE.md**
Add the following rule to the list in `CLAUDE.md`:
"10. PRIMA DI ESEGUIRE COMMIT E PUSH MODIFICARE SEMPRE FILE README.MD (SE NECESSARIO), CHANGELOG.MD CON TUTTE LE MODIFICHE/FIX/NUOVE IMPLEMENTAZIONI EFFETTUATE, IMPLEMENTATE E RICHIESTE."

- [ ] **Step 2: Verify modification**
Run: `cat CLAUDE.md` to ensure the rule is correctly appended.

### Task 4: Commit Changes

- [ ] **Step 1: Review Changes**
Run: `git diff`

- [ ] **Step 2: Update CHANGELOG.md (and README.md if necessary)**
Since we are implementing the new rule, we should practice it. Update `CHANGELOG.md` reflecting the update of agent instructions.

- [ ] **Step 3: Commit**
Run: `git add GEMINI.md AGENTS.md CLAUDE.md CHANGELOG.md`
Run: `git commit -m "docs: enforce mandatory changelog and readme update rule prima di commit e push in agent prompts"`
