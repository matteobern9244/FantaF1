# Specification: Streamline documentation (GEMINI.md & AGENTS.md)

## Overview
This track aims to optimize the core instruction files (`GEMINI.md` and `AGENTS.md`) by aligning their content and moving detailed responsibilities into more appropriate locations (Skills or sub-documentation). The ultimate goal is to keep `GEMINI.md` as lean as possible, serving primarily as a high-level router or entry point.

## Functional Requirements
- **Phase 1: Alignment**: Compare `AGENTS.md` with `GEMINI.md` and update `GEMINI.md` with any missing critical instructions from `AGENTS.md` to ensure no core mandate is lost.
- **Phase 2: Responsibility Analysis**: Analyze the responsibilities currently defined in `GEMINI.md` to identify candidates for migration.
- **Phase 3: Migration & Modularization**: 
    - Move detailed technical guidelines (Style Guides, Workflows, Security/Privacy, Environment) to specialized locations:
        - **Skills**: Create or update local `.skill` files for complex operational behaviors.
        - **Sub-docs**: Use dedicated Markdown files (e.g., in `conductor/code_styleguides/` or similar) for technical specifications.
        - **External Links**: Reference external documentation where appropriate.
- **Merge Capability**: Acknowledge that `GEMINI.md` and `AGENTS.md` can evolve independently. Propose a "merge skill" approach to handle updates between them instead of a simple script.

## Non-Functional Requirements
- **Minimalism**: `GEMINI.md` should be kept as small as possible.
- **Maintainability**: modular documentation is easier to update and reason about.

## Acceptance Criteria
- [ ] `GEMINI.md` is significantly reduced in size.
- [ ] No information is lost during the migration (all responsibilities are accounted for in Skills or sub-docs).
- [ ] `GEMINI.md` and `AGENTS.md` are aligned.
- [ ] A proposal for a documentation merge workflow/skill is presented.

## Out of Scope
- Major rewriting of existing guidelines (only relocation and alignment).
- Automation of the *entire* migration process (analysis is manual).
