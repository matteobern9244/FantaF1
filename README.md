# Fanta Formula 1

Applicazione full-stack privata per gestire un Fanta Formula 1 con frontend
React + TypeScript + Vite, backend ASP.NET Core (.NET 10) e persistenza MongoDB
Atlas.

## Stato corrente

- Il backend autorevole del repository e' C# sotto
  [backend-csharp/](/Users/matteobernardini/code/FantaF1/backend-csharp).
- Il runtime locale, Docker, staging Render e CI/CD sono allineati al backend
  C#.
- Il branch `staging` e' il branch di certificazione corrente.
- La release candidata corrente del branch `staging` e' `1.6.3`.
- `main` resta il target di rilascio protetto e va aggiornato solo dopo cutover
  esplicito.
- La documentazione operativa canonica del repository vive in questo file; la
  cronologia di rilascio vive in
  [CHANGELOG.md](/Users/matteobernardini/code/FantaF1/CHANGELOG.md).

## Stato workspace Conductor

- Il workspace live di Conductor mantiene le track correnti sotto
  [conductor/tracks](/Users/matteobernardini/code/FantaF1/conductor/tracks),
  mentre lo storico verificato resta archiviato sotto
  [conductor/archive](/Users/matteobernardini/code/FantaF1/conductor/archive).
- I documenti di piano legacy rimasti in precedenza nel root di `conductor/`
  sono stati spostati in
  [conductor/archive/\_root-plans](/Users/matteobernardini/code/FantaF1/conductor/archive/_root-plans)
  e non fanno parte della navigazione live della skill.
- Il report operativo sul fix di compatibilita' della skill installata vive in
  [conductor/conductor-skill-operational-feedback.md](/Users/matteobernardini/code/FantaF1/conductor/conductor-skill-operational-feedback.md).

## Superfici runtime

- Staging Render:
  [fantaf1-staging.onrender.com](https://fantaf1-staging.onrender.com/)
- Produzione live:
  [fantaf1-w69n.onrender.com](https://fantaf1-w69n.onrender.com)

Lo staging deve rimanere allineato alla produzione a livello di funzionalita'.
Differenze di branding, testo o layout sono tollerabili solo se non introducono
divergenze funzionali.

## Governance Branch

- `staging` e' il branch candidato di certificazione e il branch sorgente atteso
  per l'ambiente Render di staging. E' un **branch protetto** con regole
  identiche a `main`: richiede Pull Request, approvazione, superamento dei
  controlli CI richiesti (`lint`, `build`, `responsive-dev`, `smoke-ci-db`),
  risoluzione delle conversazioni ed esecuzione dei controlli anche per gli
  amministratori.
- `main` resta il branch protetto di release e il target finale del flusso di
  deploy.
- Il flusso di certificazione verso staging parte dal branch `develop` ed e'
  automatizzato dal comando `deploya-staging`.
- Il flusso di rilascio in produzione parte dal branch `staging` ed e'
  automatizzato dal comando `deploya`.
- Il rename operativo da `develop` a `staging` richiede anche il riallineamento
  fuori repo della configurazione Render, delle branch protection e di eventuali
  automazioni GitHub/Render che puntavano al vecchio nome branch.

## Panoramica funzionale

- L'applicazione gestisce sempre esattamente `3` partecipanti.
- I nomi dei partecipanti sono data-driven e vengono letti dallo stato
  persistito, non sono un vincolo hardcoded.
- L'admin seleziona il weekend, inserisce i pronostici, registra o recupera i
  risultati reali e conferma i punti nello storico.
- La vista `public` e' consultiva; le mutazioni richiedono una sessione admin
  valida.
- La classifica live combina punti storici e proiezione del weekend selezionato.
- Lo storico supporta modifica, cancellazione e ricalcolo completo dei punteggi.

## Regole di business

### Pronostici

Per ogni weekend l'admin gestisce quattro campi per ciascun partecipante:

- primo classificato
- secondo classificato
- terzo classificato
- pole position oppure vincitore Sprint nei weekend Sprint

### Salvataggio

- `POST /api/predictions` accetta solo payload con almeno un campo pronostico
  compilato.
- `POST /api/data` e' usato dai flussi applicativi completi e puo' salvare anche
  uno stato corrente vuoto quando e' generato da reset, conferma risultati o
  ricalcolo.
- Il backend rifiuta i payload con numero partecipanti diverso da `3`.

### Race lock

Il lock e' server-side:

- usa `raceStartTime` quando disponibile
- usa il fallback `endDate + 14:00:00Z` quando `raceStartTime` manca
- dopo il lock rifiuta le modifiche che alterano i pronostici gia' persistiti

### Risultati e punteggi

- I risultati ufficiali vengono recuperati tramite
  `GET /api/results/:meetingKey`.
- Il backend espone `racePhase` (`open`, `live`, `finished`) separato dal race
  lock.
- Per ogni weekend concluso il backend puo' restituire un `highlightsVideoUrl`
  specifico della gara selezionata, se disponibile nel catalogo Sky Sport F1.
- Gli highlights sono persistiti nel documento `weekends` della gara e restano
  associati in modo stabile al relativo `meetingKey`.
- Un highlights gia' trovato non viene degradato a `missing` da un lookup
  successivo transitorio o da un bootstrap calendario successivo che non riesce
  a risolverlo.
- Il bootstrap calendario usa gating `UTC` uniforme per evitare divergenze tra
  locale, staging e produzione nella decisione su quando una gara e' davvero
  conclusa e candidabile al backfill highlights.
- Se `f1.com` riallinea slug o URL di una gara ufficiale, il backend conserva
  l'associazione degli highlights gia' persistiti quando round e date restano
  coerenti con la stessa gara.
- La conferma risultati e' consentita solo quando il weekend e' `finished` e i
  risultati reali sono completi.
- Punteggi configurati:
  - `5` punti primo corretto
  - `3` punti secondo corretto
  - `2` punti terzo corretto
  - `1` punto pole o Sprint corretto

## Funzionalita' implementate

### Admin

- login admin con cookie HTTP-only firmato
- logout e session bootstrap via `GET /api/session`
- inserimento e modifica pronostici dei tre partecipanti
- reset persistente dei pronostici correnti
- fetch read-only dei risultati ufficiali
- merge dei risultati ufficiali solo sui campi mancanti
- inserimento manuale o completamento dei risultati
- conferma risultati e consolidamento nello storico
- modifica ed eliminazione delle gare storiche
- ricalcolo dei totali dopo edit/delete storico
- cambio weekend con persistenza per `selectedMeetingKey`

### Public

- classifica live
- standings piloti e costruttori
- weekend pulse
- analisi stagione
- archivio storico con filtri
- track map e recap weekend
- URL condivisibile della vista corrente
- CTA installazione PWA

### UI

- shell responsive desktop/mobile (F1 Racing Theme)
- sidebar adattiva desktop (collassabile) e menu mobile overlay a tutto schermo
- hardening della navigation shell: collapse desktop agganciato allo stato reale
  della shell, trigger mobile localizzato e scroll lock del body mentre
  l'overlay e' aperto
- overlay mobile rifinito per leggibilita' e orientamento: label delle voci in
  font `Formula1` a `20px`, card piu' alte, contenuto centrato e wrapping meno
  aggressivo per evitare label schiacciate sui viewport stretti
- riepilogo sticky della sezione corrente nel menu mobile per mantenere piu'
  intuitiva la navigazione quando l'utente scrolla o riapre l'overlay
- branding MenuLogo integrato con accenti hi-contrast
- hero full-width pulita (controlli admin/public spostati nel menu)
- stato admin/public coerente in tutte le superfici
- track map coerente tra hero, recap e pannello risultati
- CTA highlights coerente per ogni weekend selezionato; se il video non e'
  disponibile la label disabilitata e' `HIGHLIGHTS NON PRESENTI`

## Architettura

### Frontend

- React 18 + TypeScript + Vite
- SPA servita anche same-origin dal backend C#
- API relative `/api/...`
- logica condivisa centralizzata in moduli come:
  - [src/utils/gameService.ts](/Users/matteobernardini/code/FantaF1/src/utils/gameService.ts)
  - [src/utils/analyticsService.ts](/Users/matteobernardini/code/FantaF1/src/utils/analyticsService.ts)
  - [src/utils/weekendStateService.ts](/Users/matteobernardini/code/FantaF1/src/utils/weekendStateService.ts)
  - [src/utils/resultsApi.ts](/Users/matteobernardini/code/FantaF1/src/utils/resultsApi.ts)

### Backend

- ASP.NET Core 10
- solution:
  [backend-csharp/FantaF1.Backend.sln](/Users/matteobernardini/code/FantaF1/backend-csharp/FantaF1.Backend.sln)
- layer:
  - `Api`
  - `Application`: contiene le interfacce `IRepository<TEntity, TId>` e i
    contratti di dominio.
  - `Domain`: definisce l'interfaccia `IEntity<TId>` implementata da tutti i
    ReadModels.
  - `Infrastructure`: implementa la persistenza tramite
    `MongoRepository<TEntity, TId>` e gestisce le dipendenze via Dependency
    Injection (DI) senza istanziazioni dirette.
- startup non bloccante su sync esterni
- static serving same-origin del build frontend in `dist`

### Persistenza

MongoDB Atlas con collection:

- stato globale del gioco (`appdatas`)
- `drivers`: cache roster piloti
- `weekends`: cache calendario weekend
- cache standings piloti/costruttori (`standingscaches`)
- credenziali admin hashate e metadata auth (`admincredentials`)

Il backend sanitizza sempre lo stato prima di persisterlo.

## Sorgenti esterne

- roster piloti: StatsF1 con fallback/arricchimento Formula1.com
- calendario: Formula1.com
- standings: Formula1.com
- risultati weekend: Formula1.com
- highlights gara: feed YouTube Sky Sport F1, playlist del canale `@skysportf1`,
  ricerca nel canale YouTube Sky Sport F1 e fallback
  `sport.sky.it/formula-1/video/highlights`

Se un sync fallisce, il backend prova a usare la cache MongoDB gia' disponibile
per quel dominio.

## API principali

- `GET /api/health`
- `GET /api/data`
- `GET /api/session`
- `POST /api/admin/session`
- `DELETE /api/admin/session`
- `POST /api/data`
- `POST /api/predictions`
- `GET /api/drivers`
- `GET /api/calendar`
- `GET /api/results/:meetingKey`
- `GET /api/standings`

### `GET /api/health`

Restituisce:

- `status`
- `year`
- `dbState`
- `environment`
- `databaseTarget`

## Modello dati

### Stato gioco

Lo stato persistito contiene:

- `users`
- `history`
- `gpName`
- `raceResults`
- `selectedMeetingKey`
- `weekendStateByMeetingKey`

### Weekend

Ogni weekend puo' includere:

- `meetingKey`
- `meetingName`
- `grandPrixTitle`
- `roundNumber`
- `dateRangeLabel`
- `detailUrl`
- `heroImageUrl`
- `trackOutlineUrl`
- `isSprintWeekend`
- `startDate`
- `endDate`
- `raceStartTime`
- `sessions`
- `highlightsVideoUrl`
  - URL highlights specifica del weekend, presente solo quando il lookup trova
    un video compatibile
- `highlightsLookupStatus`
- `highlightsLookupCheckedAt`
- `highlightsLookupSource`

La persistenza highlights e' keyed per `meetingKey`: il sync calendario puo'
aggiornare i metadati del weekend, ma non deve cancellare un URL highlights gia'
trovato solo perche' un lookup successivo ritorna `missing` o fallisce in modo
transitorio.

## Database e migrazioni

L'analisi corrente del branch mostra che `fantaf1` e `fantaf1_staging` sono
allineati sulle collection principali, sugli indici e sulla shape dei documenti
campionati per:

- `appdatas`
- `drivers`
- `weekends`
- `standingscaches`
- `admincredentials`

Alla data di questa verifica non emerge una migrazione obbligatoria da applicare
ai database live per il cutover. Eventuali future migrazioni dovranno essere:

- esplicite
- idempotenti
- testate solo su clone locale o database isolato
- mai eseguite direttamente su `fantaf1` o `fantaf1_staging` durante l'audit

## Variabili di ambiente

### Runtime C# obbligatorie

- `MONGODB_URI`
  - URI MongoDB completa
  - il path della URI deve puntare al database dell'ambiente target
- `ADMIN_SESSION_SECRET`
  - secret usato per firmare la sessione admin

### Runtime C# opzionali

- `ASPNETCORE_ENVIRONMENT`
  - `Development`, `Staging`, `Production`
- `PORT`
  - porta HTTP del runtime
- `Frontend__BuildPath`
  - path del build frontend servito same-origin
- `VITE_APP_LOCAL_NAME`
  - override visuale del titolo hero, letto a build-time dal frontend

`VITE_APP_LOCAL_NAME` viene letta dal frontend Vite a build-time. Su
Docker/Render non e' una variabile runtime del backend C#: deve entrare nello
stage di build frontend e ogni modifica richiede un rebuild/redeploy per
diventare visibile.

### Variabili di servizio locali

- `MONGODB_DB_NAME_OVERRIDE`
  - usata dai runner locali e dalla CI per forzare un database isolato
  - non va usata per puntare a `fantaf1` o `fantaf1_staging`

### Seed admin locale production-like

Il target locale `csharp-staging-local` usa seed runtime non versionati come
plaintext:

- `AdminCredentialSeed__PasswordSalt`
- `AdminCredentialSeed__PasswordHashHex`

Queste variabili vengono generate dai runner locali; non vanno impostate
manualmente su Render.

## Matrice ambiente esplicita

### Locale `csharp-dev`

- `MONGODB_URI`: obbligatoria, base URI Atlas o locale
- `ADMIN_SESSION_SECRET`: obbligatoria
- `ASPNETCORE_ENVIRONMENT`: forzata a `Development` dal launcher
- `MONGODB_DB_NAME_OVERRIDE`: forzata a `fantaf1_local_dev` dal tooling locale
- `PORT`: non necessaria nel launcher locale canonico; l'host locale usa `3002`
- `Frontend__BuildPath`: non necessaria in split mode
- `VITE_APP_LOCAL_NAME`: opzionale

### Locale `csharp-staging-local`

- `MONGODB_URI`: obbligatoria, base URI Atlas o locale
- `ADMIN_SESSION_SECRET`: obbligatoria
- `ASPNETCORE_ENVIRONMENT`: forzata a `Staging`
- `MONGODB_DB_NAME_OVERRIDE`: forzata a `fantaf1_local_staging`
- `PORT`: non necessaria; l'host locale usa `3003`
- `Frontend__BuildPath`: gestita dal runtime same-origin locale
- `VITE_APP_LOCAL_NAME`: opzionale

Questo target e' il runbook corretto per simulare `staging` in locale senza
toccare Render staging. La verifica staging-like same-origin usa:

- `SAVE_SMOKE_TARGET=csharp-staging-local node scripts/save-local-check.mjs`
- `UI_RESPONSIVE_TARGET=csharp-staging-local npm run test:ui-responsive`

Contratto operativo del browser check responsive:

- usa il runner Playwright in-process del repository e non dipende piu' da
  `playwright-cli`
- se backend e frontend locali sono gia' sani, li riusa senza riavviarli
- se uno dei due servizi non e' raggiungibile, bootstrapta solo la parte
  mancante tramite `scripts/ui-responsive/stack.mjs`
- esegue tutti gli scenari obbligatori sui breakpoint `mobile`,
  `iphone-16-pro-max`, `tablet`, `laptop`, `desktop` e `desktop-xl`
- non salta piu' `weekend-switch` o `sprint-tooltip`: ogni scenario viene
  eseguito oppure il comando fallisce esplicitamente
- scrive diagnostica in `output/playwright/ui-responsive/` quando una
  navigazione o una validazione fallisce

### Render staging

Impostare esplicitamente:

- `MONGODB_URI=<uri che punta a fantaf1_staging>`
- `ADMIN_SESSION_SECRET=<secret lungo e casuale>`
- `ASPNETCORE_ENVIRONMENT=Staging`
- `Frontend__BuildPath=./dist`
- `PORT=3001`
- `VITE_APP_LOCAL_NAME=<opzionale; solo se serve un titolo hero differenziato>`

Non impostare:

- `MONGODB_DB_NAME_OVERRIDE`
- `AdminCredentialSeed__PasswordSalt`
- `AdminCredentialSeed__PasswordHashHex`

Note operative:

- `VITE_APP_LOCAL_NAME` agisce solo sul titolo visuale frontend buildato
- se viene modificata su Render staging, richiede un rebuild/redeploy del
  servizio per diventare visibile
- non modifica `GET /api/health` o il runtime environment del backend

### Render produzione

Impostare esplicitamente:

- `MONGODB_URI=<uri che punta a fantaf1>`
- `ADMIN_SESSION_SECRET=<secret lungo e casuale>`
- `ASPNETCORE_ENVIRONMENT=Production`
- `Frontend__BuildPath=./dist`
- `PORT=3001`
- `VITE_APP_LOCAL_NAME=<opzionale; normalmente da lasciare vuota>`

Non impostare:

- `MONGODB_DB_NAME_OVERRIDE`
- `AdminCredentialSeed__PasswordSalt`
- `AdminCredentialSeed__PasswordHashHex`

Note operative:

- `VITE_APP_LOCAL_NAME` e' una build env del frontend e non una runtime env del
  backend
- se viene cambiata su produzione, il servizio va rebuildato/redeployato
- salvo esigenza esplicita, lasciarla vuota per usare il fallback da
  `config/app-config.json`

### GitHub Actions

Secret richiesti:

- `MONGODB_URI_CI`
- `ADMIN_SESSION_SECRET_CI`

Secret opzionali:

- `RENDER_STAGING_HEALTHCHECK_URL`
- `RENDER_HEALTHCHECK_URL`

La pipeline normalizza la URI CI e usa `MONGODB_DB_NAME_OVERRIDE=fantaf1_ci` per
impedire mutazioni dei database condivisi.

Il job `responsive-dev` del workflow PR esegue inoltre `npx playwright install
--with-deps chromium` dopo `npm ci`, cosi' il runner Linux GitHub abbia sempre
un browser Playwright coerente con `npm run test:ui-responsive` senza
dipendere da cache o immagini residue.

Il gate responsive in CI usa lo stesso runner Playwright in-process usato in
locale e non dipende piu' da wrapper `playwright-cli`, socket residue o cleanup
manuali di sessione.

## Avvio locale

### Prerequisiti

- `npm install`
- .NET 10 SDK
- Node.js
- MongoDB raggiungibile tramite `MONGODB_URI`
- Google Chrome in `/Applications/Google Chrome.app` per il launcher monitorato

### Launcher canonico

- [start_fantaf1.command](/Users/matteobernardini/code/FantaF1/start_fantaf1.command)
  (macOS/Linux)
- [start_fantaf1.bat](/Users/matteobernardini/code/FantaF1/start_fantaf1.bat)
  (Windows)
- [clean_google_chrome.command](/Users/matteobernardini/code/FantaF1/clean_google_chrome.command)
  (macOS/Linux)
- [clean_google_chrome.bat](/Users/matteobernardini/code/FantaF1/clean_google_chrome.bat)
  (Windows)

Quando un task richiede di `avviare l'app`, questo e' il solo entrypoint
canonico. Il launcher esegue una serie di controlli pre-volo obbligatori:

- verifica connettivita' MongoDB (Atlas o locale)
- build backend C#
- build di produzione frontend

La validazione UI responsive resta intenzionalmente separata dal preflight del
launcher: va eseguita solo con `npm run test:ui-responsive` quando il task lo
richiede o quando l'utente scrive `check viste`.

Questa separazione e' intenzionale: il launcher monitorato deve restare
allineato al boot reale dell'applicazione senza incorporare il browser gate
responsive, che continua a essere un controllo esplicito e isolato.

### Note operative UI recenti

- la shell frontend usa ora routing client-side esplicito per `/dashboard`,
  `/pronostici`, `/classifiche`, `/analisi` e `/admin`, mantenendo condivisibili
  via URL i parametri `meeting`, `view`, `historyUser` e `historySearch`
- gli ingressi legacy su `/` con query string vengono normalizzati a
  `/dashboard` senza perdere lo stato richiesto nell'URL
- in mobile la shell mostra una bottom tab bar fissa per dashboard,
  pronostici, area classifiche/storico e analisi; la voce standings usa
  `Classifiche reali` in public e `Storico gare` in admin, mentre l'overlay
  resta disponibile per la navigazione completa, il toggle admin/public e la
  CTA installazione
- il gruppo `Analisi` nel menu e nella dashboard contiene ora
  `Stagione attuale`, `Deep-dive KPI dashboard` e `User KPI Dashboard`
- `Stagione attuale` sostituisce la precedente label `Analisi stagione`
- la sidebar desktop usa una larghezza leggermente maggiore per evitare clipping
  dei bordi attivi
- desktop sidebar e mobile overlay mantengono ora uno stacco visivo tra il
  gruppo `Analisi` e la successiva voce `Storico gare`
- i bordi delle voci attive restano interamente visibili sia in desktop sia in
  mobile/PWA
- gli script di verifica responsive/browser sono stati riallineati alla shell
  multi-route, con validazioni route-aware sulle sezioni realmente visibili
- il runner responsive usa ora Playwright in-process, valida in modo
  deterministico le rotte e le superfici realmente visibili e tratta
  `weekend-switch` e `sprint-tooltip` come scenari obbligatori: se i
  prerequisiti non convergono il check fallisce con diagnostica, non viene
  saltato

### Tool locale di pulizia Chrome

Per ripristinare rapidamente Google Chrome dopo sessioni Playwright o DevTools
residue sono disponibili due entrypoint equivalenti:

- [clean_google_chrome.command](/Users/matteobernardini/code/FantaF1/clean_google_chrome.command)
- [clean_google_chrome.bat](/Users/matteobernardini/code/FantaF1/clean_google_chrome.bat)

Entrambi gli script:

- verificano che Google Chrome sia installato
- chiudono i processi di automazione residui che matchano
  `playwright_chromiumdev_profile-` e `chrome-devtools-mcp`
- rilanciano Google Chrome
- verificano che Chrome sia effettivamente ripartito

### Comandi principali

- `npm run start:local`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:save-local`
- `npm run test:ui-responsive`
- `npm run test:csharp-coverage`
- `npm run format:csharp`
- `npm run format:csharp:check`

Dettagli pratici di `npm run test:ui-responsive`:

- verifica la shell in modalita' admin/public sui breakpoint mobile, tablet e
  desktop
- puo' riusare uno stack locale gia' attivo oppure bootstrapparne uno
  temporaneo quando necessario
- fallisce esplicitamente se una route, una vista o uno scenario obbligatorio
  non converge
- produce screenshot, page state, log console e failure summary in
  `output/playwright/ui-responsive/`

### Guardrail sui database locali

I runner locali mutanti non devono mai toccare `fantaf1` o `fantaf1_staging`.

Target supportati:

- `csharp-dev` -> `fantaf1_local_dev`
- `csharp-staging-local` -> `fantaf1_local_staging`

Se `MONGODB_URI` contiene un database condiviso, i runner locali:

- lo riscrivono sul database isolato previsto quando il target e' consentito
- falliscono esplicitamente se qualcuno tenta di usarli verso `fantaf1` o
  `fantaf1_staging`

## Docker

Il deploy Docker usa il
[Dockerfile](/Users/matteobernardini/code/FantaF1/Dockerfile) nella root del
repository.

Caratteristiche:

- build multi-stage frontend + backend
- publish .NET 10
- static serving same-origin del frontend buildato
- runtime finale `aspnet`
- binding su `3001`

Validazioni richieste per il Dockerfile:

- `docker build -t fantaf1-local-check .`
- avvio locale del container con env coerenti
- `GET /api/health`
- verifica del serving same-origin

## Deploy Render

Configurazione servizio:

- Docker context: root repository
- Dockerfile path: `./Dockerfile`
- build toolchain frontend installata via `npm install`

Lo staging corrente usa `fantaf1_staging`; la produzione usa `fantaf1`.

### Runbook di switch produzione post-merge

Obiettivo del cutover:

- usare in produzione lo stesso modello di deploy Docker gia' attivo su staging
- servire frontend buildato e backend C# dallo stesso servizio same-origin
- puntare il runtime di produzione al database `fantaf1`
- esporre `GET /api/health` con `environment=production` e
  `databaseTarget=fantaf1`

Procedura operativa:

1. eseguire il merge del branch certificato su `main`
2. aprire il servizio Render di produzione attuale
3. verificare se il servizio usa ancora il runtime Node legacy
4. riallineare il servizio produzione al modello staging:
   - Environment type: `Docker`
   - Docker context: root repository
   - Dockerfile path: `./Dockerfile`
   - branch: `main`
5. rimuovere configurazioni legacy non piu' valide:
   - Node build command
   - Node start command
   - root dir legacy pensata per il backend Node
6. impostare solo le env di produzione ufficiali:
   - `MONGODB_URI=<uri che punta a fantaf1>`
   - `ADMIN_SESSION_SECRET=<secret lungo e casuale>`
   - `ASPNETCORE_ENVIRONMENT=Production`
   - `Frontend__BuildPath=./dist`
   - `PORT=3001`
   - `VITE_APP_LOCAL_NAME=<opzionale; normalmente vuota>`
7. verificare che non siano presenti env vietate:
   - `MONGODB_DB_NAME_OVERRIDE`
   - `AdminCredentialSeed__PasswordSalt`
   - `AdminCredentialSeed__PasswordHashHex`
   - vecchie env Node/Express non piu' usate
8. salvare la configurazione e deployare `main`
9. attendere il completamento del build Docker e del boot runtime
10. verificare immediatamente:

- `GET /api/health`
- `GET /`
- `GET /api/session`
- `GET /api/data`
- `GET /api/drivers`
- `GET /api/calendar`
- `GET /api/standings`

11. verificare login admin e save flow
12. confrontare staging e produzione per confermare allineamento funzionale

Condizioni di stop:

- se il servizio produzione non usa davvero Docker + `./Dockerfile`, il cutover
  non e' pronto
- se `GET /api/health` non restituisce `environment=production`, il cutover e'
  fallito
- se `GET /api/health` non restituisce `databaseTarget=fantaf1`, il cutover e'
  fallito
- non usare `MONGODB_DB_NAME_OVERRIDE` per forzare la produzione: il runtime
  rifiuta target non coerenti

## CI/CD

Workflow principali:

- [pr-ci.yml](/Users/matteobernardini/code/FantaF1/.github/workflows/pr-ci.yml)
- [pr-auto-merge.yml](/Users/matteobernardini/code/FantaF1/.github/workflows/pr-auto-merge.yml)
- [post-merge-health.yml](/Users/matteobernardini/code/FantaF1/.github/workflows/post-merge-health.yml)

Job eseguiti dal workflow PR su PR verso `main` e `staging`:

- `lint`
- `build`
- `format-csharp`
- `build-csharp`
- `test-csharp`
- `responsive-dev`
- `smoke-ci-db`

Dettagli operativi del job `responsive-dev`:

- esegue `npm ci`
- installa esplicitamente Chromium Playwright con
  `npx playwright install --with-deps chromium`
- avvia backend C# e frontend Vite locali
- aspetta `GET /api/health` e `GET /`
- lancia `xvfb-run -a npm run test:ui-responsive`
- in caso di failure stampa `backend.log` e `frontend.log`
- arresta sempre lo stack locale nel blocco `always()`

Status checks attualmente richiesti dalla branch protection remota su `main` e
`staging`:

- `lint`
- `build`
- `responsive-dev`
- `smoke-ci-db`

Healthcheck post-merge:

- `post-merge-health.yml` gira su push a `staging` e `main`
- usa `RENDER_STAGING_HEALTHCHECK_URL` quando il merge atterra su `staging`
- usa `RENDER_HEALTHCHECK_URL` quando il merge atterra su `main`
- `RENDER_HEALTHCHECK_URL` resta il secret storico di produzione e non va
  rinominato
- se il secret dell'ambiente relativo non e' configurato, il job salta in modo
  esplicito senza mascherare l'assenza del controllo
- `RENDER_STAGING_HEALTHCHECK_URL` deve contenere l'endpoint health completo
  dello staging, ad esempio `https://fantaf1-staging.onrender.com/api/health`

Trigger operativi documentati:

- `deploya-staging`: valido solo dal branch corrente `develop`, crea/aggiorna la
  PR `develop -> staging`, richiede una descrizione idonea e coerente con il
  lavoro svolto, `matteobern9244` come assignee e label aderenti alle modifiche
  reali, e dipende dai gate `pr-ci`, `pr-auto-merge` e dal healthcheck
  post-merge dello staging
- `deploya`: valido solo dal branch corrente `staging`, crea/aggiorna la PR
  `staging -> main`, richiede una descrizione idonea e coerente con il lavoro
  svolto, `matteobern9244` come assignee e label aderenti alle modifiche reali,
  dipende dagli stessi gate verso produzione e, dopo il merge con check verdi,
  legge lo SHA finale di `main`, abbassa temporaneamente la protection di
  `staging`, forza `staging` e `develop` allo SHA finale di `main` e poi
  ripristina la protection di `staging`
- entrambi i trigger restano invalidi se il workspace non e' pulito, se il
  branch non e' quello atteso o se i secret/controlli richiesti non sono
  disponibili

## Coverage e qualita'

Soglia minima ufficiale sullo scope frontend/repository:

- `100%` statements
- `100%` functions
- `100%` branches
- `100%` lines

Soglia minima ufficiale su `backend-csharp/src/`:

- `100%` lines
- `100%` branches
- `100%` methods
- `75` file inclusi

Le soglie repository restano a `100%` su statements, branches, functions e
lines.

Verifica piu' recente rieseguita localmente:

- `npm run test`
- `npm run test:coverage`
- `npm run test:csharp-coverage`
- `npm run lint`
- `npm run build`
- `npm run test:ui-responsive`

Ultimo esito verificato:

- `59` file test verdi
- `397` test verdi

## Struttura repository

- `src/`: frontend React
- `backend-csharp/`: backend ASP.NET Core
- `config/`: configurazione applicativa
- `scripts/`: launcher, smoke, automation e utility runtime
- `tests/`: test frontend e tooling
- `public/`: asset statici frontend
- `.github/workflows/`: CI/CD e automazioni GitHub

## Documenti canonici

- [README.md](/Users/matteobernardini/code/FantaF1/README.md): stato operativo
  reale, runtime, env, deploy, CI/CD
- [CHANGELOG.md](/Users/matteobernardini/code/FantaF1/CHANGELOG.md): cronologia
  release e audit
- [PROJECT.md](/Users/matteobernardini/code/FantaF1/PROJECT.md): vincoli di
  business e invarianti di dominio
- [AGENTS.md](/Users/matteobernardini/code/FantaF1/AGENTS.md): disciplina
  ingegneristica obbligatoria
