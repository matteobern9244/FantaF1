# AGENTS.md

These instructions are for coding agents working in this repository.

## Goals

- Prioritize correctness, maintainability, and functional robustness.
- Keep changes minimal and scoped to the user request.
- Preserve existing architecture (React/Vite frontend + Express/MongoDB backend) and conventions.
- Prefer completing one validated step at a time instead of mixing multiple unfinished changes.

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

## Testing & Validation

- Run the smallest relevant tests first.
- Do not lower coverage standards; when practical, add tests in the same change that introduces new logic.
- For running the test suite (Vitest), use:
  - `npm test`
- For checking build integrity (TypeScript compilation and Vite bundling), use:
  - `npm run build`
- For launcher and end-to-end local validation on macOS, use the dedicated script (which handles both frontend and backend):
  - `./start_fantaf1.command`
- Report any tests not run and why.

## Pre-Commit Workflow

For every change that is going to be committed and pushed, always execute this sequence:

1. Update `README.md` if repository state, workflow, setup, or operational documentation changed.
2. Run linting to ensure code quality:
   - `npm run lint`
3. Ensure the project builds without errors (`npm run build`) and all tests pass (`npm test`).
4. Only then proceed with `git commit`.
5. Only after the commit succeeds proceed with `git push`.

## Communication

- Be concise and direct.
- Include touched file paths in summaries.
- If blocked, state the blocker and the next best option.
- When a plan is partially complete, state clearly what is done and what remains.
