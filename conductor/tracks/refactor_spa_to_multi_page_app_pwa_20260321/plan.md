# Piano di Implementazione: Refactoring "FantaF1 Pro APP" (v5.0)

_Conformità assoluta a `AGENTS.md`, `PROJECT.md` e uso rigoroso dei subagent
durante audit, implementazione e certificazione._

## Stato finale

- [x] Audit commit-by-commit del range `ced498c..HEAD`
- [x] Routing multi-route reale stabilizzato
- [x] Introduzione e certificazione della route `/gara`
- [x] Rimozione del fullscreen overlay mobile dal path runtime attivo
- [x] Bottom tab bar mobile e utility bar consolidate
- [x] Service worker/manifest/PWA runtime riallineati
- [x] Subscription push frontend/backend implementata
- [x] Test delivery push reale implementato
- [x] Responsive runner `npm run test:ui-responsive` reso deterministico e
      senza skip
- [x] Riallineamento `PROJECT.md`, `README.md`, `CHANGELOG.md` e artefatti
      Conductor
- [x] Coverage `100%` frontend/repository
- [x] Coverage `100%` su `backend-csharp/src/`

## RED -> GREEN -> REFACTOR applicato

### Fase 0. Audit e gap matrix

- [x] Audit invarianti di business e mapping domini
- [x] Audit launcher locale e CI/CD
- [x] Audit Conductor workspace e documentazione live
- [x] Audit commit range `ced498c..HEAD` con deduplicazione dei commit `wip`

### Fase 1. Routing e shell

- [x] **RED:** test routing/layout/page shells
- [x] **GREEN:** routing client-side reale e `RacePage`
- [x] **REFACTOR:** route-aware shell, hash normalization e coerenza admin/public

### Fase 2. Navigazione mobile finale

- [x] **RED:** test bottom tab bar e shell mobile
- [x] **GREEN:** navigazione primaria tramite tab bar mobile
- [x] **GREEN:** eliminazione overlay fullscreen dal runtime attivo
- [x] **REFACTOR:** utility bar mobile per install/toggle/logout

### Fase 3. PWA e push

- [x] **RED:** test PWA runtime, subscription e controller/service/repository push
- [x] **GREEN:** service worker, manifest, bootstrap runtime
- [x] **GREEN:** backend push subscription + test delivery reale
- [x] **GREEN:** pannello dashboard per opt-in, opt-out e invio test
- [x] **REFACTOR:** allineamento contratti API e documentazione operativa

### Fase 4. Certificazione

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:coverage`
- [x] `npm run test:csharp-coverage`
- [x] `npm run test:ui-responsive`
- [x] riallineamento finale degli artefatti Conductor
