# Review: refactor_spa_to_multi_page_app_pwa_20260321

## Scope

- Audit del range `ced498c..HEAD` e deduplicazione dei commit `wip`
- Stabilizzazione del refactor SPA -> shell multi-route client-side
- Introduzione della route `/gara` e riallineamento della navigazione route-aware
- Rimozione del fullscreen overlay mobile dal runtime attivo
- Chiusura PWA runtime + push subscription/test-delivery reale sul backend C#
- Riallineamento di `PROJECT.md`, `README.md`, `CHANGELOG.md` e artefatti Conductor

## Review Focus

- Nessuna regressione della business logic
- Coerenza tra `App.tsx`, layout e page components
- Compatibilita' dei test di routing, login admin, PWA e navigation shell
- Rispetto del contratto Conductor richiesto dal repository
- Coerenza tra implementazione push reale, documentazione e coverage 100%

## Risks To Evaluate During Review

- Navigazione con hash e route diverse dalla SPA originale
- Duplicazione o incoerenza dei punti di ingresso admin
- Regressioni responsive su sidebar, bottom tab bar e shell route-aware
- Flusso push reale incoerente tra frontend, backend e service worker
- Workspace Conductor o documentazione live non allineati al runtime reale

## Decision

- Completed

## Findings

- Il branch conteneva un refactor interrotto con shell multi-route incompleta,
  overlay mobile ancora presente nel runtime, artefatti Conductor stale e
  implementazione push non ancora certificata end-to-end.
- Il runtime finale usa ora le rotte `/dashboard`, `/pronostici`, `/gara`,
  `/classifiche`, `/analisi` e `/admin`, con `/gara#weekend-live` e
  `/gara#results-section` come superfici gara canoniche.
- Il path mobile attivo non usa più il fullscreen overlay menu: la navigazione
  primaria è la bottom tab bar con utility bar dedicata.
- Il flusso push reale è chiuso con `GET /api/push-notifications/config`,
  `POST /api/push-subscriptions`, `DELETE /api/push-subscriptions` e
  `POST /api/push-notifications/test-delivery`, supportato da service worker,
  pannello dashboard e gateway `WebPush`.
- Le evidenze finali confermano `100%` coverage frontend/repository e `100%`
  line/branch/method coverage su `backend-csharp/src/`.
