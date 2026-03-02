# AGENTS.md

These instructions are for coding agents working in this repository.

## Goals

- Prioritize correctness, maintainability, and functional robustness.
- **Mandatory Testing**: Every implementation MUST include:
  1. Creation of new unit tests for the added logic.
  2. Execution of the full unit test suite.
  3. Immediate fixing of any regressions or failures before completing the task.
- **Total Anti-Regression Gate**: Before declaring ANY task finished, a full system check MUST be performed to ensure compatibility with:
  - Local environment (Mac/Windows).
  - Production environment (Render.com).
  - Database connectivity (MongoDB Atlas).
- Keep changes minimal and scoped to the user request.
- Preserve existing architecture and conventions.

## Repository Scope

- This repository is a full-stack JavaScript/TypeScript application:
  - Frontend: React with TypeScript, bundled with Vite (`src/`).
  - Backend: Node.js with Express and MongoDB Atlas (`server.js`, `backend/`).
  - Config & Data: `config/`, `F1Result/`.
- Treat both frontend and backend as tightly coupled; changes to backend models or APIs must be reflected in the frontend types and logic.

## Working Style

- Explain planned changes briefly before editing.
- Prefer concrete fixes over speculative refactors.
- Do not change unrelated files.
- When implementing large plans, work in small verifiable slices and validate each slice before moving on.
- Keep user-facing summaries concise and include touched file paths.

## Editing Rules

- Prefer custom search tools (`glob`, `grep_search`) for file discovery and text search.
- Use ASCII unless the target file already uses Unicode or Unicode is required.
- Add comments only when logic is not obvious.
- Never use destructive git commands unless explicitly requested.
- Do not revert user changes that are unrelated to the current task.

## Codebase Rules

- Keep UI text and application configuration centralized in `config/app-config.json` and loaded via `src/constants.ts` or `backend/config.js`.
- Always respect the established vanilla CSS approach. Avoid adding utility-first frameworks (like Tailwind) unless explicitly requested.
- Maintain the visual aesthetic: use established CSS variables (colors, fonts, panels) defined in `src/App.css`.
- Ensure the backend safely handles data syncs with the official Formula 1 sources and properly persists them to MongoDB.

## Testing & Validation (Mandatory Final Check)

Before completing any request, the following sequence MUST be successful:

1. **Linting**: `npm run lint` must pass with zero errors.
2. **Unit Tests**: `npm test` must pass all tests.
3. **Build Integrity**: `npm run build` must complete without TypeScript or Vite errors.
4. **Environment Check**: Verify that `server.js`, `vite.config.ts`, and `src/constants.ts` maintain the required configuration for local proxying and Render/MongoDB production hosting.
5. **Local Launch**: Verify the app starts correctly via `./start_fantaf1.command`.

## Pre-Commit Workflow

For every change that is going to be committed and pushed, always execute this sequence:

1. Update `README.md` if repository state, workflow, setup, or operational documentation changed.
2. Run the **Mandatory Final Check** (Lint, Test, Build).
3. Only then proceed with `git commit`.
4. Only after the commit succeeds proceed with `git push`.

## Communication

- Be concise and direct.
- Include touched file paths in summaries.
- If blocked, state the blocker and the next best option.
- When a plan is partially complete, state clearly what is done and what remains.
