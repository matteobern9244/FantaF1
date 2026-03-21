# Implementation Plan: Subphase 11 - Future CI-CD cutover certification and legacy removal

## Objective

Chiudere il porting del backend C# introducendo i workflow futuri
branch-specific, stabilendo il gating CI/CD, soddisfacendo i criteri di cutover,
ottenendo la certificazione utente e procedendo infine con la rimozione del
backend legacy (Node).

## AGENTS.md Adherence

Le istruzioni contenute in `AGENTS.md` verranno rigorosamente applicate e
seguite durante tutta l'esecuzione di questa fase.

## Programming & Design Principles

- **Strangler Mindset / Legacy Decommission Rule**: Il backend legacy verrà
  rimosso solo _dopo_ che il backend C# sarà diventato il verified runtime
  certificato, le condizioni di cutover saranno soddisfatte e l'utente avrà dato
  esplicita certificazione.
- **Incremental Migration & Minimal Diff**: Nessun ponte permanente o stub
  (`app.js`/`server.js`) verrà lasciato. Il cleanup finale avverrà con diff
  minimale.
- **Determinism and Stability**: Le modifiche ai workflow branch-specific
  dovranno essere isolate (es. usando database dedicati per la CI) e non
  dovranno intaccare i workflow autorevoli di `main` prima della fine del
  porting.
- **Zero Regression**: Preservazione dei contratti e del comportamento
  preesistente su tutti gli ambienti e i device.

## TDD Strategy: RED -> GREEN -> REFACTOR

- **RED**: Aggiungere test/check architetturali o script che falliscono se la
  Subphase 11 non definisce un inventario `remove/migrate/keep`, se i workflow
  futuri non riflettono lo stack reale C# o se il legacy removal avviene
  prematuramente. Includere check documentali. Definire il lavoro necessario per
  preservare 100% statements, functions, branches e lines per lo scope
  ufficiale.
- **GREEN**: Introdurre i workflow branch-specific futuri C# (es. build, Docker,
  test, coverage) e verificare che siano verdi. Solo quando il runtime C#
  same-origin è verificato, i launcher migrati e la certificazione utente
  confermata esplicitamente sul branch `porting-backend-c#`, si può procedere ad
  applicare l'inventario per la rimozione.
- **REFACTOR**: Rimuovere fisicamente `backend/`, `app.js`, `server.js` e i path
  legacy obsoleti. Aggiornare launcher e script (`start_fantaf1.command`,
  `package.json`, ecc.) con diff minimale, senza lasciare bridge permanenti,
  assicurandosi che tutti i test rimangano verdi e la coverage totale al 100%.

## Acceptance Criteria & Regression Checks

- I workflow futuri branch-specific per C# sono configurati e funzionanti.
- La CI del porting usa database isolati.
- Route parity totale, coverage al 100%, browser (locali e staging) verdi
  documentati.
- Il comando launcher canonico (`start_fantaf1.command`) e gli script condivisi
  sono allineati al runtime C#.
- Il repository rimane releasable sul branch di porting.
- Certificazione utente esplicita ottenuta sul branch `porting-backend-c#`.
- Rimozione completata per: `backend/`, `backend/standings.js`, `app.js`,
  `server.js` e riferimenti Node-only nei file di wiring.
- Conservazione completata per: `src/`, `public/`, `package.json`,
  `vite.config.ts` e tooling associato.
- Smoke test di health e rollback readiness eseguiti sui workflow e ambienti
  target.

## Verifiche browser e responsive (Zero Regression)

Saranno eseguiti check espliciti per garantire nessuna regressione su:

- Desktop admin/public in sviluppo (su runtime C# finale).
- Mobile admin/public in sviluppo (su runtime C# finale).
- Produzione-like locale: deve restare verde prima del cutover.
- Staging: desktop e mobile admin/public devono risultare verdi su
  `FantaF1_staging` prima della certificazione utente e dopo il completamento.

## Validation Commands

Saranno eseguiti i seguenti comandi per validare l'implementazione:

- `dotnet build backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `npm run test:csharp-coverage`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`
- `npm run test:save-local`
- `npm run test:ui-responsive` (verifica delle viste web e mobile)

## Coverage 100% totale

- È obbligatorio mantenere e verificare il **100% totale** di coverage su tutti
  i file del repository e dell'applicazione (scope finale Node/React/C#
  rilevante al momento del cutover).
- Qualora la coverage scenda sotto il 100% alla fine dell'implementazione di
  ogni step, si procederà ad aggiungere/aggiornare i test necessari fino a
  ripristinare il 100% di statement, branch, function e line coverage.

## Implementation Steps

1. **Verifica Iniziale e Setup Workflow**: Creare i workflow branch-specific
   `.github/workflows/` (build/test/coverage C#, Docker, check React, health
   staging) garantendo l'isolamento dai workflow di `main`.
2. **Validazione Cutover**: Rieseguire l'intera suite Node/React/C# locale e la
   suite `ui-responsive`. Ottenere report di coverage 100% e validare i browser
   su locale, production-like locale e Staging.
3. **Approvazione**: Conferma e certificazione utente esplicita per il cutover
   sul branch `porting-backend-c#`.
4. **Rimozione Legacy**: Eseguire l'inventario `da rimuovere`: delete
   `backend/`, `app.js`, `server.js`. Eseguire l'inventario `da migrare`:
   aggiornare `start_fantaf1.command`, script `scripts/` e configurazioni
   `package.json`.
5. **Validazione Finale**: Rieseguire tutti i `Validation Commands`,
   `test:ui-responsive` e verificare il "Coverage 100% totale" sull'applicazione
   residua e stack C#.
