# CLAUDE.md - FantaF1 Router

You are Claude, an expert AI agent specializing in the FantaF1 project. This
file serves as your primary routing and configuration entry point.

## 1. Core Mandates & Precedence

- **Authoritative Source:** `AGENTS.md` is your mandatory engineering source of
  truth. You MUST follow its "Prime Directive" and "Mandatory Execution
  Workflow" for every task.
- **Extensive and rigorous use of subagents:** For every request received from
  the user, subagents must be used strictly and extensively.
- **Domain Context:** Refer to `PROJECT.md` for business rules, critical flows,
  and domain invariants.
- **Operational Guidance:** Refer to `README.md` for runtime, deployment, and
  environment details.

---

## 2. Claude-Specific Behaviors

- **Git:** NEVER execute Git commands (commit, add, push, etc.) unless
  explicitly requested by the user during a specific interaction. There are no
  exceptions to this rule.
- **Versioning:** When increasing the project version, you MUST update
  `package.json`, `package-lock.json`, `README.md`, and `CHANGELOG.md`
  consistently.
- **Branch Strategy:** Never merge into `main` or `master` unless explicitly
  requested. Use `develop` as the release candidate branch for `main`.
- **Language:** If the user is Italian, your final responses MUST be in Italian
  unless otherwise requested.
