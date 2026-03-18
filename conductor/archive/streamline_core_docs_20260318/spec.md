# Specification: Streamline documentation (GEMINI.md)

## Overview

This track aims to optimize the `GEMINI.md` instruction file by modularizing its
responsibilities into Skills or sub-documentation, while maintaining `AGENTS.md`
as the untouched single source of truth for cross-agent compatibility (Gemini &
Codex).

## Functional Requirements

- **Phase 1: Analysis**: Identify critical mandates in `AGENTS.md` that must be
  present in Gemini's context and ensure `GEMINI.md` respects them without
  duplicating the full text.
- **Phase 2: Responsibility Migration**:
  - Identify technical and operational sections in `GEMINI.md` (Style Guides,
    specific Workflows, Security).
  - Move these sections to specialized locations:
    - **Local Skills**: Create/update `.skill` files for Gemini-specific complex
      behaviors.
    - **Sub-docs**: Use `conductor/code_styleguides/` for detailed technical
      rules that both agents can eventually read, but that Gemini will consume
      via specific skill triggers.
- **Phase 3: Minimalism**: Reduce `GEMINI.md` to a high-level "router" that
  mainly activates skills and provides the most essential local context.
- **Cross-Agent Safety**: **DO NOT MODIFY AGENTS.md**. It must remain the
  fallback for Codex.
- **Markdown Formatting Skill**: Develop a specialized skill to handle Markdown
  formatting and linting. This skill must ensure all `.md` files (including the
  streamlined ones) adhere to standard formatting rules to avoid common warnings
  (e.g., trailing spaces, header levels, list formatting).

## Acceptance Criteria

- [ ] `GEMINI.md` is significantly reduced in size.
- [ ] `AGENTS.md` remains unchanged and fully functional for Codex.
- [ ] Gemini continues to adhere to all project mandates by loading the new
      modular components.

## Out of Scope

- Major rewriting of existing guidelines (only relocation and alignment).
- Automation of the _entire_ migration process (analysis is manual).
