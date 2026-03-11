# [Project Name]

Generic `AGENTS.md` template for projects that are migrating from one technology stack to another. Replace placeholders, remove sections that do not apply, and tighten the rules around the actual source and target stacks before using it in a real repository.

## Project Overview

This repository contains a system under active migration from **[Source Technology / Platform]** to **[Target Technology / Platform]**.

Primary goals:

- preserve existing business behavior while migrating implementation details
- reduce risk through incremental delivery and verification
- keep the system releasable during the migration
- retire legacy components only after verified parity

### Migration Context

- **Current stack:** `[example: .NET Framework + WPF + SQL Server]`
- **Target stack:** `[example: .NET 8 + Avalonia + SQLite/PostgreSQL]`
- **Migration style:** `[strangler / parallel-run / big-bang / module-by-module / adapter-first]`
- **Compatibility requirements:** `[backward-compatible APIs, data schema compatibility, file-format compatibility, etc.]`
- **Supported platforms:** `[Windows / macOS / Linux / Web / Mobile / Cloud]`
- **Non-negotiables:** `[performance floor, zero data loss, auditability, offline support, accessibility, etc.]`

## Architecture

Document the active repository layout and explicitly distinguish legacy, bridge, and target areas.

- **`src/[LegacyApp]`**: legacy implementation that remains authoritative until cutover
- **`src/[NewApp]`**: target implementation under active development
- **`src/[Domain]`**: business rules and migration-safe abstractions
- **`src/[Infrastructure]`**: persistence, I/O, gateways, adapters, and integration code
- **`src/[Compatibility]`**: shims, anti-corruption layers, translation adapters, or feature bridges
- **`tests/[UnitTests]`**: focused deterministic tests
- **`tests/[IntegrationTests]`**: integration, migration, and parity verification tests

## Build And Run

### Prerequisites

- `[SDK/runtime version]`
- `[database/tooling requirements]`
- `[optional local services]`

### Common Commands

- **Format:** `[format command]`
- **Build:** `[build command]`
- **Test:** `[test command]`
- **Run legacy app:** `[legacy run command]`
- **Run target app:** `[target run command]`
- **Run migration/parity checks:** `[migration validation command]`

### Helper Scripts

- `[script name]`: `[purpose]`
- `[script name]`: `[purpose]`

## Engineering Principles

- **Behavior Preservation First:** During migration, preserve externally observable behavior unless the task explicitly includes a product change. If behavior must change, document the delta, update tests, and call it out clearly.
- **Incremental Migration:** Prefer small, reversible steps. Avoid broad rewrites that mix structural migration, refactoring, behavior changes, and cleanup in one change set.
- **Strangler Mindset:** New code should be added behind stable seams, adapters, or interfaces so legacy and target implementations can coexist during rollout.
- **Business Logic Isolation:** Move business rules into focused domain services or value objects that are independent from framework and transport concerns.
- **SOLID Principles:** Apply `SRP`, `OCP`, `LSP`, `ISP`, and `DIP` consistently, especially when extracting abstractions from legacy code.
- **Dependency Injection by Default:** Runtime collaborators must be injected. Bootstrap code, composition roots, and dedicated factories may create concrete implementations.
- **No Hidden Collaborator Graphs:** Production services, view models, controllers, handlers, parsers, repositories, and orchestrators must not instantiate runtime collaborators directly except for allowed value-type or framework-primitives cases.
- **Compatibility Layers Must Be Intentional:** Adapters, shims, translators, and facades are acceptable when they reduce migration risk. They must remain focused, documented, and temporary unless there is a stable long-term reason to keep them.
- **Avoid Legacy Leakage:** Do not spread source-stack concepts deeper into the target architecture than necessary. Translate at boundaries and keep target-side abstractions clean.
- **Delete Dead Paths Promptly:** Once a migration step is verified and cutover is complete, remove obsolete flags, adapters, and duplicate code instead of carrying permanent transitional complexity.
- **Static Logic Policy:** Avoid placing production behavior in static classes. Static-only use is limited to constants, pure extensions, and framework-mandated entry points.
- **Cross-Platform Discipline:** Use platform-safe file, path, encoding, locale, and environment handling. Never hardcode platform separators, shell assumptions, or machine-local paths.

## Migration-Specific Rules

- **Source Of Truth:** Every task must state whether the legacy path or the target path is currently authoritative for the affected behavior.
- **Parity Before Optimization:** Reach functional parity first. Optimize performance, architecture, or style only after behavior is covered by tests unless the task is explicitly performance-driven.
- **Dual-Run Verification:** When both implementations exist, compare outputs with golden files, snapshot tests, contract tests, or deterministic parity assertions.
- **Data Safety:** Schema migrations, file conversions, and data reshaping must be reversible when feasible or protected by backup/export strategy and validation.
- **Contract Preservation:** Public APIs, file formats, CLI interfaces, and integration contracts must remain stable unless the task explicitly includes a versioned breaking change.
- **Feature Flags For Cutover:** Use explicit feature toggles or routing seams for staged rollout when both old and new implementations may be exercised.
- **Legacy Decommission Rule:** Do not remove legacy code until replacement behavior, migration scripts, observability, and rollback expectations are verified.
- **Observability During Migration:** Add or preserve logs, metrics, traces, or diagnostic events where needed to compare old and new behavior during rollout.
- **No Silent Fallbacks:** If the target path cannot handle a case, fail explicitly or route intentionally through a documented compatibility path. Do not hide failed migrations behind silent fallback logic.

## Testing Strategy

- **TDD By Default:** Start with a failing test when adding or fixing behavior unless the task is strictly exploratory or mechanical.
- **Deterministic Tests Only:** Tests must not depend on current system time, current year, machine locale, network availability, or mutable external state unless explicitly isolated as integration tests.
- **Parity Tests:** For migrated behavior, add tests that assert the target implementation matches the legacy implementation for representative and edge-case inputs.
- **Contract Tests:** For adapters and interfaces, define tests that every implementation must satisfy.
- **Mock Narrowly:** Mock only dependencies outside the scope under test. Prefer focused fakes or Moq-based mocks over broad integration by accident.
- **Migration Regression Coverage:** Every migration change should either preserve or increase confidence in the migrated area through new or improved tests.
- **Time And Clock Access:** All time access must go through an injectable abstraction in production code.
- **Test Data Management:** Keep fixtures minimal, explicit, and readable. Prefer versioned snapshots or canonical sample inputs when verifying parity.

## Verification

After any significant change, complete all applicable steps:

0. **Format:** `[format command]`
1. **Build:** `[build command]`
2. **Test:** `[test command]`
3. **Run target app or service:** `[target run command]`
4. **Run migration/parity validation:** `[parity command]`
5. **Verify formatting is clean:** `[format verify command]`

Verification is complete only when all required steps pass without warnings or errors that affect the touched area.

## Pre-Commit Checklist

Before `git commit` or `git push`, verify:

- [ ] formatting was executed and resulting changes were staged
- [ ] build succeeds in the required configuration
- [ ] all relevant tests pass locally
- [ ] parity or migration validation passed for affected behavior
- [ ] no temporary scripts, generated files, or local diagnostics are staged accidentally
- [ ] any new runtime collaborator construction is justified or moved behind DI/factory wiring
- [ ] any legacy removal is backed by verified replacement behavior and rollback confidence
- [ ] commit message briefly describes the migration step and the tests added or updated

## Development Conventions

- **Separation Of Concerns:** UI, application orchestration, domain rules, infrastructure, and migration glue must remain clearly separated.
- **Abstraction Naming:** Name adapters and translators for the boundary they protect, not as generic `Helper` or `Utils` buckets.
- **Configuration Discipline:** Put migration flags, endpoints, file paths, and environment-specific settings in configuration, not hardcoded strings.
- **Localization:** New user-facing text must go through the project localization system.
- **Error Handling:** Migration code must produce actionable errors with enough context to diagnose mapping failures, unsupported legacy constructs, or invalid converted data.
- **Documentation:** Keep architecture notes, migration progress, known gaps, and cutover conditions updated in repository docs.

## Code Review Priorities

Review migration changes with this order of concern:

1. behavioral regressions against the legacy path
2. data loss or irreversible transformation risk
3. broken contracts at external boundaries
4. hidden coupling to legacy framework concepts
5. missing parity, contract, or rollback validation
6. unnecessary long-term transitional complexity

## Migration Tracking

Keep this section current during the project:

- **Current migration phase:** `[discovery / extraction / coexistence / cutover / decommissioning]`
- **Authoritative runtime path:** `[legacy / mixed / target]`
- **Major completed migrations:** `[list]`
- **Active bridges/adapters to retire:** `[list]`
- **Known parity gaps:** `[list]`
- **Rollback strategy:** `[summary]`

## Key Files

- `[solution/workspace root file]`
- `[main configuration file]`
- `[migration plan document]`
- `[architecture decision records folder]`
- `[parity tests location]`
- `AGENTS.md`

## Notes For AI Coding Agents

- Read the affected legacy and target implementations before proposing structural changes.
- Do not collapse migration, refactor, and feature work into one edit unless explicitly requested.
- Prefer edits that improve the seam between old and new systems.
- If a task risks breaking parity, state the risk explicitly and verify with targeted tests before finishing.
- If the repository contains current migration docs, treat them as part of the specification.
