# Backend C# Porting Plan

This document is the canonical implementation plan for migrating the FantaF1 backend from Node.js/Express/Mongoose to C# with ASP.NET Core.

It consolidates:

- the current repository rules in `AGENTS.md`
- the business and safety constraints in `PROJECT.md`
- the execution-oriented migration material under `docs/backend-csharp-porting-subphases/`
- the migration governance model from `guide-porting-c#/AGENTS_migration_template.md`

When this document conflicts with provisional notes in `guide-porting-c#`, this document wins.

## Scope iniziale e primario

This first macro-phase defines and freezes the migration contract before the real implementation begins.

It includes:

- the canonical backend porting plan itself
- the authoritative runtime and compatibility rules
- the target architecture and environment matrix
- the Atlas, Render, and CI/CD strategy to be followed later
- the branch-isolation rule that all porting changes remain on `porting-backend-c#` until the user personally certifies the full migrated application

No runtime cutover, no legacy backend removal, and no future-stack branch workflow creation are part of this macro-phase.

## Scope imminente

This second macro-phase is the actual backend migration and verification phase.

It includes:

- route-by-route C# implementation using TDD and parity checks
- parameterization of shared verification scripts so porting work never falls back to `fantaf1_dev`
- Docker and Render staging validation
- future-stack branch workflow creation when the real C# assets exist
- update of `start_fantaf1.command` so it remains the canonical launcher after cutover
- removal of the legacy Node backend files only after parity, staging validation, browser validation on staging, rollback readiness, and explicit user certification

## Subphase execution index

This document remains the canonical source of truth. The files below are execution-oriented subphases written in Italian, and commands such as `fai Subphase N` map one-to-one to the corresponding numbered document.

### Current execution ledger

The ledger below is the canonical persistent checkpoint for the temporal execution state of the porting program. Whenever a subphase is formally closed, this ledger must be updated in the same task. This canonical ledger overrides temporary notes or ad-hoc reminders written elsewhere.

| Subphase | Status | Last known outcome | Next action |
| --- | --- | --- | --- |
| `Subphase 1` | `completed` | Baseline, safety rails, requirement ownership, branch isolation, and shared TDD/parity rules recorded in the canonical plan. | Keep enforced by every later subphase. |
| `Subphase 2` | `completed` | C# solution, shared abstractions, DI bootstrap, and controller-based host baseline are verified in isolation. The only blocking browser gate for this closure was the Node baseline in `Development`, while the reusable local `production-like` browser gate remains owned by `Subphase 9`. | Wait for explicit user authorization before starting `Subphase 3`. |
| `Subphase 3` | `completed` | Environment/database target resolution and `GET /api/health` parity are verified in C# for `Development`, `Staging`, and `Production`, while Node remains the authoritative runtime. | Wait for explicit user authorization before starting `Subphase 4`. |
| `Subphase 4` | `completed` | `GET /api/session`, `POST /api/admin/session`, and `DELETE /api/admin/session` are parity-green in C# for `Development` and production-like environments, including cookie signing, TTL, default view mode, hash-only admin credential seeding, and Node-compatible `Set-Cookie` headers. | Wait for explicit user authorization before starting `Subphase 5`. |
| `Subphase 5` | `completed` | `GET /api/data`, `GET /api/drivers`, and `GET /api/calendar` are parity-green in C# for payload shape, app-data sanitization, sorting, legacy Mongo collection compatibility, and read-only fallback behavior while Node remains authoritative. | Wait for explicit user authorization before starting `Subphase 6`. |
| `Subphase 6` | `completed` | `POST /api/data` and `POST /api/predictions` are parity-green in C# for roster validation, prediction completeness, race lock, Node-compatible save error payloads with `requestId`, legacy `appdatas` round-trip persistence, and production-like admin guard behavior while Node remains authoritative. | Wait for explicit user authorization before starting `Subphase 6A`. |
| `Subphase 6A` | `completed` | `GET /api/standings` is parity-green in C# for cache-first reads, official-source parsing, cache compatibility with `standingscaches`, reusable standings sync capability, fallback to cache on invalid source or fetch failures, and the canonical `main` delta assimilation matrix. | Wait for explicit user authorization before starting `Subphase 7`. |
| `Subphase 7` | `completed` | `GET /api/results/:meetingKey` is parity-green in C# for flat Node-compatible payloads, `racePhase`, sprint-vs-qualifying bonus sourcing, process-local cache TTL, highlights lookup `found`/`missing` behavior, fallback to persisted highlights on lookup failures, Node-compatible `500 { error, details }`, and legacy `weekends` highlights lookup persistence while Node remains authoritative. | Wait for explicit user authorization before starting `Subphase 8`. |
| `Subphase 8` | `completed` | C# bootstrap host, Mongo-backed admin seed, non-blocking background sync for drivers/calendar/standings, cache fallback, same-origin React static hosting, SPA fallback, and local `Development`/`Staging` host smokes are verified while Node remains the authoritative runtime. | Wait for explicit user authorization before starting `Subphase 9`. |
| `Subphase 9` | `pending` | Not started yet in the canonical ledger. | Wait for explicit user authorization after `Subphase 8` completion. |
| `Subphase 10` | `pending` | Not started yet in the canonical ledger. | Wait for `Subphase 9` completion. |
| `Subphase 11` | `pending` | Not started yet in the canonical ledger. | Wait for `Subphase 10` completion. |

For avoidance of doubt, the closure gate for `Subphase 2` is limited to the C# solution scope plus the Node baseline browser check in `Development`. The reusable local `production-like` browser gate remains owned by `Subphase 9` and must not block `Subphase 2` closure.

| Subphase | Document | Objective | Canonical anchors | Prerequisites |
| --- | --- | --- | --- | --- |
| `Subphase 1` | [`docs/backend-csharp-porting-subphases/subphase-01-foundation-and-safety-rails.md`](backend-csharp-porting-subphases/subphase-01-foundation-and-safety-rails.md) | Freeze the baseline, safety rails, contract inventory, environment/database matrix, branch isolation, and shared TDD/parity rules. | Sections 1, 2, 4, 5.2, 5.3, 6, backlog items 1 and 6 | canonical plan and `AGENTS.md` aligned |
| `Subphase 2` | [`docs/backend-csharp-porting-subphases/subphase-02-backend-csharp-solution-and-shared-abstractions.md`](backend-csharp-porting-subphases/subphase-02-backend-csharp-solution-and-shared-abstractions.md) | Create the `backend-csharp/` solution, the layer structure, shared interfaces, and minimal DI. | Section 3, backlog item 2 | `Subphase 1` |
| `Subphase 3` | [`docs/backend-csharp-porting-subphases/subphase-03-health-and-environment-database-parity.md`](backend-csharp-porting-subphases/subphase-03-health-and-environment-database-parity.md) | Port environment/database target resolution and `GET /api/health` parity. | Sections 2.2 (`GET /api/health`), 4, 5.1 step 1 | `Subphase 2` |
| `Subphase 4` | [`docs/backend-csharp-porting-subphases/subphase-04-session-and-admin-auth-parity.md`](backend-csharp-porting-subphases/subphase-04-session-and-admin-auth-parity.md) | Port `GET /api/session`, `POST /api/admin/session`, and `DELETE /api/admin/session` with cookie/session parity. | Sections 2.2 session/auth routes, 2.3, 5.1 step 2 | `Subphase 3` |
| `Subphase 5` | [`docs/backend-csharp-porting-subphases/subphase-05-read-routes-data-drivers-calendar.md`](backend-csharp-porting-subphases/subphase-05-read-routes-data-drivers-calendar.md) | Port `GET /api/data`, `GET /api/drivers`, and `GET /api/calendar` with sorting, sanitization, and document-shape parity. | Sections 2.2 read routes, 5.1 step 3 | `Subphase 4` |
| `Subphase 6` | [`docs/backend-csharp-porting-subphases/subphase-06-write-routes-data-and-predictions.md`](backend-csharp-porting-subphases/subphase-06-write-routes-data-and-predictions.md) | Port `POST /api/data` and `POST /api/predictions` with roster, completeness, race lock, save error, and request-id parity. | Sections 2.5 critical invariants, 5.1 step 4, 5.3 persistence parity | `Subphase 5` |
| `Subphase 6A` | [`docs/backend-csharp-porting-subphases/subphase-06a-main-delta-assimilation-and-standings-parity.md`](backend-csharp-porting-subphases/subphase-06a-main-delta-assimilation-and-standings-parity.md) | Assimilate the `main` standings delta and port `GET /api/standings`, standings cache, official-source parsing, and reusable standings sync capability. | Sections 2.1, 2.2 standings route, 2.4 persistence parity, 5.1 step 5 | `Subphase 6` |
| `Subphase 7` | [`docs/backend-csharp-porting-subphases/subphase-07-results-route-race-phase-and-highlights.md`](backend-csharp-porting-subphases/subphase-07-results-route-race-phase-and-highlights.md) | Port `GET /api/results/:meetingKey` with `racePhase`, highlights, parsing, and fallback parity. | Sections 2.2 results route, 2.5 results invariants, 5.1 step 6 | `Subphase 6A` |
| `Subphase 8` | [`docs/backend-csharp-porting-subphases/subphase-08-startup-sync-bootstrap-and-cache-fallback.md`](backend-csharp-porting-subphases/subphase-08-startup-sync-bootstrap-and-cache-fallback.md) | Port bootstrap, Mongo connection, background sync for drivers/calendar/standings, cache fallback, startup non-blocking behavior, and same-origin React static hosting. | Sections 2.1 bootstrap services, 2.5 startup invariants, 5.1 step 7 | `Subphase 7` |
| `Subphase 9` | [`docs/backend-csharp-porting-subphases/subphase-09-launcher-and-shared-verification-scripts.md`](backend-csharp-porting-subphases/subphase-09-launcher-and-shared-verification-scripts.md) | Update `start_fantaf1.command` and parameterize shared verification scripts, including reusable local development and production-like browser gates, the merged navigation baseline, mobile select behavior, `back-to-top`, and standings UI without any `fantaf1_dev` fallback. | Sections 6.3, 6.4, backlog items 8 and 9, launcher rules in `AGENTS.md` | `Subphase 8` |
| `Subphase 10` | [`docs/backend-csharp-porting-subphases/subphase-10-docker-render-staging-and-atlas-operationalization.md`](backend-csharp-porting-subphases/subphase-10-docker-render-staging-and-atlas-operationalization.md) | Operationalize Atlas, Docker, Render staging `FantaF1_staging`, and the staging-only browser gate, including standings endpoint, standings cache, and standings UI verification. | Sections 7, 8, 10.1 staging criteria | `Subphase 9` |
| `Subphase 11` | [`docs/backend-csharp-porting-subphases/subphase-11-future-cicd-cutover-certification-and-legacy-removal.md`](backend-csharp-porting-subphases/subphase-11-future-cicd-cutover-certification-and-legacy-removal.md) | Introduce future branch-specific C# workflows, formal cutover/certification, and final legacy removal. | Sections 9, 10, backlog items 7 and 10 | `Subphase 10` |

### Requirement ownership matrix

The table below is the canonical requirement-to-owner matrix for the porting program. Each requirement is owned by exactly one subphase, while cross-cutting constraints defined by `Subphase 1` remain globally binding for every later slice.

| Requirement family | Owning subphase | Canonical execution artifact |
| --- | --- | --- |
| Node contract freeze, safety rails, branch isolation, no use of `fantaf1` / `fantaf1_dev`, shared TDD/parity/coverage gates | `Subphase 1` | `docs/backend-csharp-porting-subphases/subphase-01-foundation-and-safety-rails.md` |
| `backend-csharp/` solution, layer layout, shared abstractions, minimal DI, standard C# build/test/coverage commands | `Subphase 2` | `docs/backend-csharp-porting-subphases/subphase-02-backend-csharp-solution-and-shared-abstractions.md` |
| Environment/database target resolution and `GET /api/health` parity | `Subphase 3` | `docs/backend-csharp-porting-subphases/subphase-03-health-and-environment-database-parity.md` |
| Session/auth routes, admin cookie semantics, TTL and dev vs production-like auth behavior | `Subphase 4` | `docs/backend-csharp-porting-subphases/subphase-04-session-and-admin-auth-parity.md` |
| Read routes `GET /api/data`, `GET /api/drivers`, `GET /api/calendar`, including sorting and sanitization parity | `Subphase 5` | `docs/backend-csharp-porting-subphases/subphase-05-read-routes-data-drivers-calendar.md` |
| Write routes `POST /api/data` and `POST /api/predictions`, including roster, race lock, request-id and persistence parity | `Subphase 6` | `docs/backend-csharp-porting-subphases/subphase-06-write-routes-data-and-predictions.md` |
| Standings route `GET /api/standings`, standings cache, official-source parsing, and reusable standings sync capability | `Subphase 6A` | `docs/backend-csharp-porting-subphases/subphase-06a-main-delta-assimilation-and-standings-parity.md` |
| Results route `GET /api/results/:meetingKey`, including `racePhase`, highlights and fallback behavior | `Subphase 7` | `docs/backend-csharp-porting-subphases/subphase-07-results-route-race-phase-and-highlights.md` |
| Startup/bootstrap, Mongo connection, background sync for drivers/calendar/standings, cache fallback, startup non-blocking behavior and same-origin React static hosting | `Subphase 8` | `docs/backend-csharp-porting-subphases/subphase-08-startup-sync-bootstrap-and-cache-fallback.md` |
| Canonical launcher and shared verification scripts, including local development and production-like browser gate reuse, and the ban on implicit `fantaf1_dev` fallback | `Subphase 9` | `docs/backend-csharp-porting-subphases/subphase-09-launcher-and-shared-verification-scripts.md` |
| Atlas operationalization, Docker image, Render staging `FantaF1_staging` and the staging-only external browser gate | `Subphase 10` | `docs/backend-csharp-porting-subphases/subphase-10-docker-render-staging-and-atlas-operationalization.md` |
| Future branch-specific C# workflows, cutover certification, final legacy removal and post-porting governance | `Subphase 11` | `docs/backend-csharp-porting-subphases/subphase-11-future-cicd-cutover-certification-and-legacy-removal.md` |

### Delta assimilation matrix (`2c53c157..main`)

This matrix is mandatory after the real `git merge --no-ff main` on `porting-backend-c#`. Every file advanced on `main` from `2c53c1573a06cc8518b544f461deba4be3c7072f` to `aa9bfd494e222304eaca4d050350221a81e4746e` must appear exactly once below so no fix, feature, test, or runtime contract is silently dropped from the porting branch.

| File | Delta type | Merge status | C# porting impact | Subphase owner | Validation evidence |
| --- | --- | --- | --- | --- | --- |
| `.gitignore` | `config` | `merged` | Baseline ignore rules now include `conductor/` and C# artifacts, which must remain noise-free during porting. | `Subphase 1` | `git merge --no-ff main`, `git status --short --branch` |
| `AGENTS.md` | `docs` | `merged` | Updated execution guardrails and verified merged coverage baseline bind every later porting slice. | `Subphase 1` | `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`, `npm run test:coverage` |
| `README.md` | `docs` | `merged` | Release/runtime baseline must stay aligned with the authoritative Node/React behavior while C# remains in parity mode. | `Subphase 1` | `npm run build`, `npm run test:coverage` |
| `CHANGELOG.md` | `docs` | `merged` | Records the `main` release baseline that the porting branch must preserve before any C# cutover claims. | `Subphase 1` | `git merge --no-ff main`, `npm run test` |
| `package.json` | `config` | `merged` | Script and release metadata baseline used by the merged Node/React runtime and shared validations. | `Subphase 1` | `npm run lint`, `npm run build`, `npm run test` |
| `package-lock.json` | `config` | `merged` | Locks the dependency graph that the merged baseline and browser checks rely on. | `Subphase 1` | `npm run test`, `npm run test:coverage` |
| `app.js` | `fix+feature` | `merged` | New authoritative route contract includes `/api/standings`; the C# API surface must match it without regressing existing read/write routes. | `Subphase 6A` | `tests/api-integration.test.js`, `backend-csharp/tests/FantaF1.Tests.Integration/ReadRouteEndpointTests.cs` |
| `server.js` | `fix+feature` | `merged` | Startup flow now includes standings synchronization warnings and must later be wired into the integrated C# host. | `Subphase 8` | `tests/server.test.js`, `backend-csharp/tests/FantaF1.Tests.Integration/BootstrapHostTests.cs` |
| `backend/config.js` | `fix+feature` | `merged` | Introduces authoritative standings source URLs and browser headers that the C# standings source client must preserve. | `Subphase 6A` | `tests/standings.test.js`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsServiceTests.cs` |
| `backend/models.js` | `fix+feature` | `merged` | Adds the standings cache schema and collection contract that the C# Mongo repository must remain compatible with. | `Subphase 6A` | `tests/storage-standings.test.js`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsInfrastructureTests.cs` |
| `backend/server-bootstrap-service.js` | `fix+feature` | `merged` | Startup sync now covers standings warnings and non-blocking behavior that the later integrated C# runtime must reproduce. | `Subphase 8` | `tests/server-bootstrap-service.test.js`, future `Subphase 8` host tests |
| `backend/standings.js` | `feature` | `merged` | New backend baseline to port with parity in C#. | `Subphase 6A` | `tests/standings.test.js`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsServiceTests.cs` |
| `backend/storage.js` | `fix+feature` | `merged` | Defines standings cache read/write fallback semantics and cache shape compatibility for the C# repository. | `Subphase 6A` | `tests/storage-standings.test.js`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsInfrastructureTests.cs` |
| `backend/text.js` | `fix+feature` | `merged` | Adds standings route and startup warning messages that must remain wire-compatible in C# failures and logs. | `Subphase 6A` | `tests/api-integration.test.js`, `backend-csharp/tests/FantaF1.Tests.Integration/ReadRouteEndpointTests.cs` |
| `config/app-config.json` | `config` | `merged` | New standings paths, team aliases/colors/assets, and UI text feed both the Node baseline and the C# parity implementation. | `Subphase 6A` | `tests/standings.test.js`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsServiceTests.cs` |
| `scripts/ui-responsive/dom-expressions.mjs` | `fix` | `merged` | Shared browser selector baseline changed with the merged navigation and standings UI. | `Subphase 9` | `npm run test:ui-responsive` |
| `scripts/ui-responsive/run-responsive-check.mjs` | `fix` | `merged` | Shared responsive orchestration must continue to validate the merged UI against both Node and future C# runtimes. | `Subphase 9` | `npm run test:ui-responsive` |
| `scripts/ui-responsive/scenarios.mjs` | `fix` | `merged` | Scenario coverage now reflects the new navigation, standings panel, and responsive expectations. | `Subphase 9` | `npm run test:ui-responsive` |
| `scripts/ui-responsive/state-validation.mjs` | `fix` | `merged` | Shared browser validation baseline to be parameterized for the migrated stack. | `Subphase 9` | `npm run test:ui-responsive` |
| `src/App.css` | `fix+feature` | `merged` | Layout, navigation, public standings, and mobile behavior became authoritative UI baseline constraints for future browser gates. | `Subphase 9` | `npm run build`, `npm run test:ui-responsive` |
| `src/App.tsx` | `fix+feature` | `merged` | Consumes `/api/standings` and the new navigation baseline that later browser gates must preserve. | `Subphase 9` | `tests/ui-integration.test.tsx`, `npm run test:ui-responsive` |
| `src/components/HistoryArchivePanel.tsx` | `fix` | `merged` | History/podium/avatar rendering fixes become UI parity requirements for the merged baseline. | `Subphase 9` | `tests/ui-panels.test.tsx`, `tests/ui-integration.test.tsx` |
| `src/components/PublicGuidePanel.tsx` | `fix` | `merged` | Public navigation and guide layout now depend on the merged UI structure. | `Subphase 9` | `tests/ui-panels.test.tsx`, `npm run test:ui-responsive` |
| `src/components/PublicStandingsPanel.tsx` | `feature` | `merged` | New public standings UI consumes the authoritative standings contract and must remain non-regressive through C# porting. | `Subphase 9` | `tests/ui-public-standings-panel.test.tsx`, `npm run test:ui-responsive` |
| `src/components/SeasonAnalysisPanel.tsx` | `fix` | `merged` | Analytics and standings-related panel behavior changed in the merged frontend baseline. | `Subphase 9` | `tests/ui-panels.test.tsx`, `tests/analytics.test.ts` |
| `src/constants.ts` | `fix+feature` | `merged` | Shared frontend constants now include standings/navigation assumptions that browser gates must keep stable. | `Subphase 9` | `tests/ui-integration.test.tsx`, `npm run test` |
| `src/types.ts` | `fix+feature` | `merged` | Frontend payload contracts expanded with standings types that the C# route must keep wire-compatible. | `Subphase 6A` | `tests/standings-client.test.ts`, `backend-csharp/tests/FantaF1.Tests.Integration/ReadRouteEndpointTests.cs` |
| `src/uiText.ts` | `fix+feature` | `merged` | UI text additions for standings and navigation become part of the merged public/admin experience. | `Subphase 9` | `tests/ui-public-standings-panel.test.tsx`, `npm run test` |
| `src/utils/analyticsService.ts` | `fix` | `merged` | Analytics helpers now reflect merged UI/data behavior and must stay aligned with standings-enabled screens. | `Subphase 9` | `tests/analytics.test.ts` |
| `src/utils/driverAvatar.ts` | `feature` | `merged` | Driver avatar selection now participates in merged public/history rendering and must remain visually stable. | `Subphase 9` | `tests/driver-avatar.test.ts`, `tests/ui-panels.test.tsx` |
| `src/utils/sectionNavigation.ts` | `fix` | `merged` | Section navigation behavior changed with the hero-integrated navigation and responsive baseline. | `Subphase 9` | `tests/ui-live-projection.test.tsx`, `npm run test:ui-responsive` |
| `src/utils/standingsApi.ts` | `feature` | `merged` | Frontend standings API client defines the live contract that the new C# standings route must satisfy. | `Subphase 6A` | `tests/standings-client.test.ts`, `backend-csharp/tests/FantaF1.Tests.Integration/ReadRouteEndpointTests.cs` |
| `tests/analytics.test.ts` | `test` | `merged` | Guards analytics regressions introduced by the merged standings/navigation UI baseline. | `Subphase 9` | `npm run test` |
| `tests/api-integration.test.js` | `test` | `merged` | Legacy Node reference for `/api/standings` route semantics and fallback behavior. | `Subphase 6A` | `npm run test` |
| `tests/app-production-routes.test.js` | `test` | `merged` | Production-like routing baseline now includes standings and the merged public navigation assumptions. | `Subphase 9` | `npm run test` |
| `tests/app-race-lock-coverage.test.js` | `test` | `merged` | Confirms that merged UI/backend fixes did not regress high-risk race lock flows already ported. | `Subphase 6` | `npm run test:coverage` |
| `tests/auth-routes.test.js` | `test` | `merged` | Auth route regression baseline remains authoritative after the merge hotspot resolution. | `Subphase 4` | `npm run test` |
| `tests/driver-avatar.test.ts` | `test` | `merged` | Verifies the merged avatar helper used by history and public standings panels. | `Subphase 9` | `npm run test` |
| `tests/fixtures/formula1-standings-constructors.html` | `test` | `merged` | Canonical constructor standings fixture for Node-vs-C# parsing parity. | `Subphase 6A` | `tests/standings.test.js`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsServiceTests.cs` |
| `tests/fixtures/formula1-standings-drivers.html` | `test` | `merged` | Canonical driver standings fixture for Node-vs-C# parsing parity. | `Subphase 6A` | `tests/standings.test.js`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsServiceTests.cs` |
| `tests/server-bootstrap-service.test.js` | `test` | `merged` | Startup warnings and non-blocking standings sync behavior become explicit parity gates for the later integrated runtime. | `Subphase 8` | `npm run test` |
| `tests/server.test.js` | `test` | `merged` | Bootstrap/runtime server baseline now includes standings sync warnings and startup behavior. | `Subphase 8` | `npm run test` |
| `tests/standings-client.test.ts` | `test` | `merged` | Frontend client contract reference for the new standings endpoint. | `Subphase 6A` | `npm run test`, `backend-csharp/tests/FantaF1.Tests.Integration/ReadRouteEndpointTests.cs` |
| `tests/standings-sync-wrapper.test.js` | `test` | `merged` | Defines wrapper-level expectations for standings sync orchestration in the authoritative Node runtime. | `Subphase 6A` | `npm run test` |
| `tests/standings.test.js` | `test` | `merged` | Legacy parity reference for C# standings parser and sync behavior. | `Subphase 6A` | `npm run test`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsServiceTests.cs` |
| `tests/storage-standings.test.js` | `test` | `merged` | Defines the cache read/write fallback contract that the C# Mongo standings repository must preserve. | `Subphase 6A` | `npm run test`, `backend-csharp/tests/FantaF1.Tests.Unit/StandingsInfrastructureTests.cs` |
| `tests/ui-integration.test.tsx` | `test` | `merged` | End-to-end UI contract now includes standings consumption and merged navigation behavior. | `Subphase 9` | `npm run test` |
| `tests/ui-live-projection.test.tsx` | `test` | `merged` | Live projection rendering must remain stable after the merge hotspot resolution and UI baseline changes. | `Subphase 9` | `npm run test` |
| `tests/ui-mockup-roadmap.test.tsx` | `test` | `merged` | Public/admin mockup expectations changed with the merged UI structure and standings section. | `Subphase 9` | `npm run test` |
| `tests/ui-panels.test.tsx` | `test` | `merged` | Shared panel behavior baseline covers history, guide, analysis, and standings-adjacent regressions. | `Subphase 9` | `npm run test` |
| `tests/ui-predictions-save.test.tsx` | `test` | `merged` | Save flow UI must remain non-regressive while the merged standings UI lands beside existing admin behavior. | `Subphase 9` | `npm run test:save-local`, `npm run test` |
| `tests/ui-public-standings-panel.test.tsx` | `test` | `merged` | New public standings panel must remain green on the merged baseline and later C# runtime. | `Subphase 9` | `npm run test` |
| `tests/ui-responsive-validation.test.js` | `test` | `merged` | Shared responsive validation now asserts the merged navigation, mobile select, and standings UI behavior. | `Subphase 9` | `npm run test:ui-responsive` |
| `tests/ui-weekend-state.test.tsx` | `test` | `merged` | Weekend state rendering must remain stable alongside standings and navigation fixes. | `Subphase 9` | `npm run test` |

## 1. Authority and non-negotiables

### 1.1 Authoritative runtime today

Until an explicit cutover is approved after staging validation, the authoritative runtime path is the existing Node.js backend in:

- `backend/`
- `app.js`
- `server.js`

The React frontend remains authoritative and must stay behaviorally unchanged during the backend port.

### 1.2 Fixed decisions

- Production database remains `fantaf1`.
- Existing development database `fantaf1_dev` remains a protected legacy baseline and must not be modified by porting work.
- The mutable working database for the C# port is `fantaf1_porting`.
- The first external validation environment is Render staging.
- The authoritative future staging service name is `FantaF1_staging`.
- The authoritative future staging database is `fantaf1_staging`.
- Production and staging must remain isolated at the level of service, secrets, health checks, and database credentials.
- The preferred deployment topology is one same-origin web service serving both the React build and the ASP.NET Core API.
- The C# port must preserve public API contracts, persistence compatibility, session semantics, and save/error payloads.
- No commit or push is allowed on branch `porting-backend-c#` unless explicitly authorized by the user.
- All porting changes must remain isolated on branch `porting-backend-c#` until the user personally certifies the migrated application end to end.

### 1.3 Non-negotiables

- No functional regression.
- No technical regression on supported user flows.
- No production data mutation during porting.
- No mutation of `fantaf1_dev` during porting.
- Zero silent API changes.
- Zero silent collection renames.
- 100% coverage for the official Node/React application scope must be preserved throughout the migration.
- New C# application code must also ship with 100% verified coverage for the tracked application scope introduced in the C# solution.

## 2. Current backend inventory and contract baseline

### 2.1 Current implementation areas

The current backend behavior is implemented in:

- `app.js`: Express composition, public/admin routes, SPA static serving
- `server.js`: bootstrap, MongoDB connection, startup, background sync start
- `backend/app-route-service.js`: save orchestration
- `backend/app-data-service.js`: sanitization, participant policy, weekend selection handling
- `backend/storage.js`: Mongoose-backed persistence access
- `backend/models.js`: runtime schema and collection mapping
- `backend/auth.js`: admin session cookie creation and validation
- `backend/database.js`: environment and database target resolution
- `backend/validation.js`: participant validation, prediction validation, race lock
- `backend/server-bootstrap-service.js`: database/bootstrap and background sync orchestration
- `backend/drivers.js`: driver sync and sorting
- `backend/calendar.js`: calendar sync, results orchestration, highlights persistence
- `backend/standings.js`: standings parsing, cache sync, and official-source fallback
- `backend/race-results-service.js`: results resolution, `racePhase`, cache behavior
- `backend/highlights.js`: highlight resolution strategies
- `backend/http.js`: health payload and save error payload construction

### 2.2 Public routes that must remain wire-compatible

| Route | Auth behavior today | Contract notes |
| --- | --- | --- |
| `GET /api/health` | public | Returns `status`, `year`, `dbState`, `environment`, `databaseTarget` |
| `GET /api/data` | public | Returns sanitized persisted app state |
| `GET /api/session` | public | Returns `isAdmin` and `defaultViewMode` |
| `POST /api/admin/session` | public | Validates password and sets admin session cookie |
| `DELETE /api/admin/session` | public | Clears admin session cookie |
| `POST /api/data` | admin-only in production, open in development | Generic save flow, allows all-empty payloads only for controlled non-manual flows |
| `POST /api/predictions` | admin-only in production, open in development | Manual save flow, rejects all-empty predictions |
| `GET /api/drivers` | public | Returns alphabetically sorted roster |
| `GET /api/calendar` | public | Returns round-sorted calendar |
| `GET /api/standings` | public | Returns cached standings, or triggers official-source sync when the cache is empty |
| `GET /api/results/:meetingKey` | public | Returns race result fields, `racePhase`, optional `highlightsVideoUrl` |

### 2.3 Session and environment behavior that must remain stable

- Cookie name: `fantaf1_admin_session`
- Cookie flags: `HttpOnly`, `SameSite=Lax`, `Secure` only in production-like environments
- Session TTL: 7 days
- Session payload includes signed role metadata
- In development, write requests are effectively admin-open
- In production-like environments, write requests require a valid admin session
- `GET /api/session` returns `defaultViewMode=admin` in development
- `GET /api/session` returns `defaultViewMode=public` in production-like environments

For the port, `Staging` must behave like `Production` for auth and cookie policy.

### 2.4 Persistence compatibility baseline

The C# backend must preserve the current runtime collection names:

- `appdatas`
- `drivers`
- `weekends`
- `standingscaches`
- `admincredentials`

Important compatibility note:

- `PROJECT.md` documents `appdata`, while the runtime collection name produced by Mongoose is `appdatas`.
- This mismatch must remain documented and explicit.
- It must not be silently corrected during the C# port.

### 2.5 Business-critical invariants from `PROJECT.md`

- Exactly 3 players exist: Adriano, Fabio, Matteo
- Lock timing is enforced server-side
- Manual prediction save requires at least one populated prediction field
- Results confirmation is allowed only after race completion
- Startup synchronization failures must not block application startup
- Cached data fallback must remain available when external synchronization fails
- Sorting, projections, standings, selected-weekend behavior, and historical recalculation must not change behavior

## 3. Target C# architecture

### 3.1 Repository layout

The target backend will live in `backend-csharp/` once the first slice is implemented for real:

```text
backend-csharp/
  FantaF1.Backend.sln
  Dockerfile
  src/
    FantaF1.Api/
    FantaF1.Application/
    FantaF1.Domain/
    FantaF1.Infrastructure/
  tests/
    FantaF1.Tests.Unit/
    FantaF1.Tests.Integration/
    FantaF1.Tests.Contract/
```

The legacy Node backend remains intact until cutover is approved.

### 3.2 Application model

- Target framework: `net10.0`
- ASP.NET Core hosting model: `WebApplicationBuilder`
- HTTP style: controller-based Web API
- Dependency injection: built-in ASP.NET Core DI
- MongoDB access: official `MongoDB.Driver`
- Background sync: `IHostedService` or `BackgroundService`
- Static asset serving: React build served by ASP.NET Core from the same origin

Minimal APIs must not be mixed into the same migrated feature set unless a later task justifies the exception explicitly.

### 3.3 Layer responsibilities

`FantaF1.Domain`

- business models
- pure validation rules
- save invariants
- race lock rules
- `racePhase` domain behavior where it is pure and deterministic

`FantaF1.Application`

- endpoint orchestration
- save orchestration
- session orchestration
- results orchestration
- background sync coordination
- environment/database target classification

`FantaF1.Infrastructure`

- Mongo repositories
- external HTTP clients and parsers
- cookie signing and verification
- clock abstraction
- logging adapters

`FantaF1.Api`

- controllers
- DTOs
- middleware
- composition root
- static file and SPA fallback hosting

### 3.4 Required internal interfaces

The first implementation slices must introduce explicit abstractions for:

- `IAppDataRepository`
- `IDriverRepository`
- `IWeekendRepository`
- `IAdminCredentialRepository`
- `ISaveRequestService`
- `IAdminSessionService`
- `IResultsService`
- `IBackgroundSyncService`
- `IStandingsRepository`
- `IStandingsReadService`
- `IStandingsSyncService`
- `IStandingsSourceClient`
- `IClock`
- `ISignedCookieService`

These abstractions exist to preserve DI, testability, and parity-oriented architecture. They do not authorize speculative indirection outside real seams.

## 4. Environment and database matrix

| Context | Runtime authority | Environment mode | Database target | Mutations allowed | Notes |
| --- | --- | --- | --- | --- | --- |
| Legacy local Node baseline | Node | `development` | `fantaf1_dev` | No for porting work | Read-only baseline for contract reference when needed |
| Local C# porting | C# | `Development` | `fantaf1_porting` | Yes | Main mutable local environment for the new backend |
| Local production-like C# smoke | C# | `Staging` | `fantaf1_porting` | Yes | Used to validate prod-like auth/cookie behavior without touching staging |
| CI | Node and C# | isolated CI env | dedicated CI DB | Yes | Must never point to `fantaf1`, `fantaf1_dev`, `fantaf1_porting`, or `fantaf1_staging` |
| Render staging | C# | `Staging` | `fantaf1_staging` | Yes | First external validation target |
| Production | Node until cutover, then C# | `production` or `Production` | `fantaf1` | Only after explicit approval | Must remain untouched during porting |

### 4.1 Environment variable mapping

Node baseline uses:

- `MONGODB_URI`
- `ADMIN_SESSION_SECRET`
- `PORT`
- `NODE_ENV`
- `MONGODB_DB_NAME_OVERRIDE`
- `VITE_APP_LOCAL_NAME`

C# target uses:

- `ASPNETCORE_ENVIRONMENT`
- `MONGODB_URI`
- `ADMIN_SESSION_SECRET`
- `PORT`
- `MONGODB_DB_NAME_OVERRIDE`
- `VITE_APP_LOCAL_NAME` only if a staging-specific UI label is explicitly required

### 4.2 Environment behavior rules

- `Development` maps to admin-open behavior and must target `fantaf1_porting`
- `Staging` maps to production-like auth behavior and must target `fantaf1_staging` externally
- `Staging` may target `fantaf1_porting` only for local production-like smoke before staging deploy
- `Production` maps to production-like auth behavior and must target `fantaf1`

## 5. Migration strategy

### 5.1 Slice order

Migration must proceed in this exact order unless a later verified dependency requires a narrow reorder:

1. database target resolution and `GET /api/health`
2. session/auth endpoints and cookie semantics
3. read routes
   - `GET /api/data`
   - `GET /api/drivers`
   - `GET /api/calendar`
4. write routes
   - `POST /api/data`
   - `POST /api/predictions`
5. `GET /api/standings`
6. `GET /api/results/:meetingKey`
7. startup bootstrap, background sync, and cache fallback
8. React static hosting from ASP.NET Core

### 5.2 Mandatory TDD flow for every slice

Every migrated slice must follow:

1. `RED`
   - freeze current Node behavior with tests or parity fixtures
   - define coverage work needed to keep repository-wide coverage at 100%
2. `GREEN`
   - implement the minimum C# slice required for parity
   - make unit, integration, and contract tests pass
3. `REFACTOR`
   - improve internals only after parity and coverage are both green

### 5.3 Parity requirements

Every migrated route must be compared between Node and C# for:

- HTTP status code
- response body shape
- response field names
- optional field presence or absence
- save error payload structure
- request-id presence on save errors
- session cookie presence and flags
- environment and database metadata

Persistence-sensitive routes must also be compared for:

- stored document shape
- sanitized round-trip output
- unchanged unrelated fields
- correct race lock behavior before and after the official start time

## 6. Testing, coverage, and regression policy

### 6.1 Mandatory test layers

Node baseline must continue to pass:

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:coverage`

Every C# slice must add:

- unit tests for pure rules and validators
- integration tests using `WebApplicationFactory`
- repository/infrastructure integration tests
- Node-vs-C# parity tests
- browser smoke against the React frontend served by the C# backend

### 6.2 Coverage 100% total

Current verified Node/React baseline:

- statements: 100%
- branches: 100%
- functions: 100%
- lines: 100%

Migration rules:

- Node/React coverage must remain 100% for the official repository/application scope
- C# application code must ship with 100% verified line, branch, and method coverage
- Coverlet remains the collection engine for the C# solution, while the repository-level source of truth is `npm run test:csharp-coverage`
- `npm run test:csharp-coverage` aggregates unit, integration, and contract coverage only for `backend-csharp/src/`, excludes generated artifacts such as `obj/` and `*.g.cs`, and writes the auditable summary to `backend-csharp/TestResults/OfficialCoverage/Summary.txt` and `backend-csharp/TestResults/OfficialCoverage/summary.json`
- Current verified official backend-csharp summary is `2283 / 2283` lines, `1276 / 1276` branches, and `413 / 413` methods across `64` included files
- No migrated slice is complete if either stack falls below 100%

### 6.3 Browser regression requirements

Every UI-affecting or backend-contract-affecting slice must validate:

- admin flow on desktop
- public flow on desktop
- admin flow on mobile
- public flow on mobile
- local development mode
- local production-like mode
- Render staging after deploy

The existing responsive/browser checks must be reused and extended instead of duplicated.

The external browser gate for this plan is staging only.

There is no mandatory post-deploy production browser verification step inside this migration plan before the user's explicit certification.

### 6.4 Required script reuse

The following scripts are the planned reusable verification seam:

- `scripts/save-local-check.mjs`
- `scripts/ui-responsive-check.mjs`

Before any porting execution uses them:

- reparameterize them so C# porting work never relies on defaults that resolve to `fantaf1_dev`
- require explicit base URL, backend target, and expected database target when the porting backend is under test
- forbid use of legacy defaults for any mutating porting check

They must be parameterized so that they can target:

- Node baseline
- local C# backend
- local production-like C# backend
- staging C# backend where appropriate

The shared verification logic must remain single-sourced.

## 7. MongoDB Atlas runbook

### 7.1 Absolute safety rules

Do not perform porting mutations against:

- `fantaf1`
- `fantaf1_dev`

Do not reuse production or legacy development credentials for the port.

### 7.2 Required Atlas databases

Create or provision:

- `fantaf1_porting`
- `fantaf1_staging`

### 7.3 `fantaf1_porting` provisioning steps

Perform these steps only when implementation work starts:

1. Open MongoDB Atlas and select the target cluster.
2. Open Data Explorer.
3. Create database `fantaf1_porting`.
4. Create collection `appdatas`.
5. Create collection `drivers`.
6. Create collection `weekends`.
7. Create collection `standingscaches`.
8. Create collection `admincredentials`.
9. Create a dedicated application user with least-privilege permissions for `fantaf1_porting`.
10. If IP allowlisting is enabled, authorize the required local or CI source IPs.
11. Store the URI separately from legacy development and production credentials.

### 7.4 `fantaf1_staging` provisioning steps

Perform these steps before the first Render staging deploy:

1. Create database `fantaf1_staging`.
2. Create the same collection set used for compatibility mode:
   - `appdatas`
   - `drivers`
   - `weekends`
   - `standingscaches`
   - `admincredentials`
3. Create a staging-only least-privilege database user.
4. Configure any required network access or IP allowlisting for Render.
5. Store the staging URI separately from production and local porting credentials.

## 8. Render and Docker deployment plan

### 8.1 Deployment model

The target deployment model is one Docker-based Render web service serving:

- the ASP.NET Core backend
- the React production assets from the same origin

This plan follows Render's official Docker, web service, health check, monorepo, and rollback documentation:

- [Render language support](https://render.com/docs/language-support)
- [Render Docker](https://render.com/docs/docker)
- [Render web services](https://render.com/docs/web-services)
- [Render health checks](https://render.com/docs/health-checks)
- [Render monorepo support](https://render.com/docs/monorepo-support)
- [Render rollbacks](https://render.com/docs/rollbacks)
- [Render projects](https://render.com/docs/projects)

### 8.2 Docker prerequisites

Current local state:

- .NET SDK is available locally
- Docker is not currently installed locally

Before container validation starts, install Docker locally and verify that the future image can be built end to end.

### 8.3 Dockerfile policy

Do not add `backend-csharp/Dockerfile` until the first externally runnable C# slice exists.

When it is added, it must:

- use a Node build stage for `npm ci` and `npm run build`
- use a .NET build stage for restore, test, publish
- copy the React build into the ASP.NET Core web root
- produce a stateless final image
- bind to `0.0.0.0:$PORT`
- expose `/api/health` for Render health checks

### 8.4 Staging service creation instructions

When the first end-to-end C# slice is runnable:

1. Create or select the correct Render Project.
2. Create a Docker web service named `FantaF1_staging`.
3. Point the service to branch `porting-backend-c#`.
4. Use the repository root as build context.
5. Use `backend-csharp/Dockerfile` as Dockerfile path.
6. Configure health check path `/api/health`.
7. Set environment variables:
   - `ASPNETCORE_ENVIRONMENT=Staging`
   - `MONGODB_URI=<staging-only-uri-for-fantaf1_staging>`
   - `ADMIN_SESSION_SECRET=<staging-only-secret>`
   - `PORT=<managed by Render>`
8. Confirm no production credentials are present.
9. Confirm no production domain or webhook targets the staging service.
10. Deploy only after local parity, local browser checks, and local coverage are green.

### 8.5 Staging validation checklist

The first staging deploy is not accepted until all of these are green:

- `GET /api/health`
- `GET /api/session`
- `POST /api/admin/session`
- `DELETE /api/admin/session`
- `GET /api/data`
- `GET /api/drivers`
- `GET /api/calendar`
- `POST /api/data`
- `POST /api/predictions`
- `GET /api/results/:meetingKey`
- background sync startup and cache fallback
- admin desktop browser flow
- public desktop browser flow
- admin mobile browser flow
- public mobile browser flow

### 8.6 Rollback rule

If staging fails after a deploy:

1. rollback to the last healthy Render deployment
2. verify environment variables after rollback
3. remember that Render rollback disables auto-deploy until it is explicitly re-enabled

Production rollout is blocked until staging is fully green and explicitly approved.

## 9. CI/CD alignment plan

### 9.1 Current baseline

The repository currently uses Node/Vite-oriented GitHub Actions workflows under `.github/workflows/`:

- `pr-ci.yml`
- `pr-auto-merge.yml`
- `post-merge-health.yml`

These remain authoritative until the C# implementation exists.

### 9.2 Branch-specific workflow strategy

The current CI/CD workflows for `main` must remain untouched.

The porting branch must eventually use separate workflow files dedicated to branch `porting-backend-c#`, but those files must be created only when the real post-porting stack exists in the repository.

Those future workflow files must be created in a dedicated implementation step and must stay separate from the current `main` workflows.

These workflows must not alter or replace the existing `main` workflows.

### 9.3 Future-stack checks inside the porting workflow set

The future branch-specific workflow set must assume the post-porting repository shape and must be derived from the current workflow logic without unnecessary structural changes:

- .NET restore/build/test
- C# coverage verification with 100% thresholds
- Docker image build validation
- frontend lint/build/coverage checks for the React app that remains in the final stack
- responsive/browser validation jobs for the migrated stack, aligned with the current repository browser checks
- staging health verification for the Render service pointing to branch `porting-backend-c#`

Creation rules for that future workflow set:

- do not create the files now
- create them only when `backend-csharp/` and the related Docker assets are real and runnable
- model them on the current `pr-ci.yml`, `pr-auto-merge.yml`, and `post-merge-health.yml`
- keep the same overall logic unless a change is required by the future stack
- point them only to branch `porting-backend-c#`

After the port is complete and the legacy backend is removed, those workflows become the authoritative CI/CD path for that branch.

### 9.4 CI database isolation rules

CI must use dedicated databases only.

CI must never point to:

- `fantaf1`
- `fantaf1_dev`
- `fantaf1_porting`
- `fantaf1_staging`

The future C# stack CI must use a dedicated CI target such as `fantaf1_porting_ci`.

### 9.5 Health check workflow rule

`post-merge-health.yml` remains tied to `main` and the production health endpoint until cutover is complete.

Branch `porting-backend-c#` uses a separate future-stack health workflow and a separate staging health secret, without changing the production workflow.

## 10. Cutover and rollback conditions

### 10.1 Cutover entry criteria

Production cutover may begin only when:

- all migrated routes are parity-green
- Node and C# test suites are green
- Node and C# coverage are both 100%
- browser checks are green locally in development mode
- browser checks are green locally in production-like mode
- browser checks are green on `FantaF1_staging`
- `start_fantaf1.command` has been updated to launch the migrated stack and remains the canonical monitored local launcher
- rollback instructions are documented and verified
- explicit user certification on branch `porting-backend-c#` exists

Only after those criteria are green does the C# stack become the verified runtime for legacy removal.

### 10.2 Rollback strategy

Rollback must remain simple:

- keep the Node backend untouched until replacement behavior is fully verified
- use Render rollback for staging or production service rollback
- keep environment-specific secrets separate to avoid cross-environment contamination
- never mix production and staging database credentials

## 11. Immediate execution backlog

The next implementation steps, in order, are:

The execution-oriented breakdown for this backlog is the numbered subphase set under `docs/backend-csharp-porting-subphases/`. This document remains the canonical source of truth, while the subphase files provide deterministic one-to-one execution guides.

1. Keep this document and `AGENTS.md` aligned.
2. Do not create `backend-csharp/` until the first slice is ready to be implemented with tests.
3. Start the actual port with database target resolution and `GET /api/health`.
4. Introduce C# tests and parity checks before broad route implementation.
5. Introduce Docker and Render assets only after the first runnable slice exists.
6. Do not execute commit or push operations on branch `porting-backend-c#` unless the user explicitly authorizes them.
7. Create the future branch-specific C# workflow files only when the post-porting stack is real in the repository.
8. Reparameterize `scripts/save-local-check.mjs` and `scripts/ui-responsive-check.mjs` before any porting execution so they cannot fall back to `fantaf1_dev`.
9. Update `start_fantaf1.command` so it launches the migrated stack and remains the canonical monitored launcher before legacy backend removal.
10. Remove the legacy Node backend files, including `backend/`, `backend/standings.js`, `app.js`, `server.js`, and obsolete backend-specific runtime paths, only after the C# stack becomes the verified runtime through full parity, local and staging browser validation, launcher migration, workflow migration, rollback readiness, and explicit user certification; use an explicit remove/migrate/keep inventory and a minimal diff with no permanent bridges.

## 12. Reference material

Repository sources:

- `AGENTS.md`
- `PROJECT.md`
- `docs/backend-csharp-porting-subphases/`
- `guide-porting-c#/AGENTS_migration_template.md`

Official platform references:

- [Render language support](https://render.com/docs/language-support)
- [Render Docker](https://render.com/docs/docker)
- [Render web services](https://render.com/docs/web-services)
- [Render health checks](https://render.com/docs/health-checks)
- [Render monorepo support](https://render.com/docs/monorepo-support)
- [Render rollbacks](https://render.com/docs/rollbacks)
- [Render projects](https://render.com/docs/projects)
- [MongoDB Atlas database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
- [MongoDB Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
- [MongoDB Atlas collections and Data Explorer](https://www.mongodb.com/docs/atlas/atlas-ui/collections/)
