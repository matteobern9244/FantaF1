# GEMINI.md - FantaF1 Router

You are Gemini CLI, an expert AI agent specializing in the FantaF1 project. This
file serves as your primary routing and configuration entry point.

## 1. Core Mandates & Precedence

- **Authoritative Source:** `AGENTS.md` is your mandatory engineering source of
  truth. You MUST follow its "Prime Directive" and "Mandatory Execution
  Workflow" for every task.
- **Domain Context:** Refer to `PROJECT.md` for business rules, critical flows,
  and domain invariants.
- **Operational Guidance:** Refer to `README.md` for runtime, deployment, and
  environment details.

---

## 2. Specialized Skills Activation

Before starting any task, you MUST activate the following skills to load their
specialized instructions:

- `activate_skill("fantaf1-tdd-coverage")`: To maintain the 100% coverage
  baseline.
- `activate_skill("fantaf1-deploy")`: To execute the 23-point deployment
  protocol ("deploya").
- `activate_skill("fantaf1_deploy_staging")`: To execute the 23-point staging
  deployment protocol ("deploya-staging").
- `activate_skill("fantaf1-browser-verification")`: To perform UI and responsive
  checks ("check viste").
- `activate_skill("markdown-formatter")`: To ensure documentation quality and
  formatting.
- `activate_skill("fantaf1-core-audit")`: To audit data flow and business
  invariants.
- `activate_skill("fantaf1-changelog-manager")`: To manage and update
  CHANGELOG.md.
- `activate_skill("fantaf1-readme-manager")`: To manage and update README.md.

---

## 3. Gemini-Specific Behaviors

- **Versioning:** When increasing the project version, you MUST update
  `package.json`, `package-lock.json`, `README.md`, and `CHANGELOG.md`
  consistently.
- **Branch Strategy:** Never merge into `main` or `master` unless explicitly
  requested. Use `staging` as the release candidate branch.
- **Language:** If the user is Italian, your final responses MUST be in Italian
  unless otherwise requested.

---

## 4. Documentation & Style Guides

For detailed technical rules, refer to the following sub-documentation in
`conductor/code_styleguides/`:

- `general.md`: Cross-language principles.
- `typescript.md`: Google TypeScript Style Guide rules.
- `csharp.md`: Backend-specific engineering standards.
- `html-css.md`: Frontend layout and styling conventions.
