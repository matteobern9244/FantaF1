# General Code Style Principles

This document outlines general coding principles that apply across all languages
and frameworks used in this project.

## Conservative Working Behavior

- **Fact-Based:** Prefer verified facts over assumptions. Inspect existing logic
  before editing.
- **Minimal Scope:** Keep changes minimal, targeted, and reversible.
- **No Side Effects:** Do not refactor unrelated code or "clean up" outside the
  task scope.
- **Strict Compliance:** Do not invent commands, files, requirements, hidden
  logic, or architecture.
- **Integrity:** If repository instruction files (AGENTS.md, PROJECT.md) exist,
  read them before acting.

## Readability

- Code should be easy to read and understand by humans.
- Avoid overly clever or obscure constructs.

## Consistency

- Follow existing patterns in the codebase.
- Maintain consistent formatting, naming, and structure.

## Simplicity

- Prefer simple solutions over complex ones.
- Break down complex problems into smaller, manageable parts.

## Maintainability

- Write code that is easy to modify and extend.
- Minimize dependencies and coupling.

## Documentation

- Document _why_ something is done, not just _what_.
- Keep documentation up-to-date with code changes.
