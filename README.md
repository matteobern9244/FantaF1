# Fanta Formula 1

Applicazione full-stack privata per gestire un Fanta Formula 1 con frontend React + TypeScript + Vite, backend ASP.NET Core (.NET 10) e persistenza MongoDB Atlas.

## Stato corrente

- Il backend autorevole del repository e' C# sotto [backend-csharp/](/Users/matteobernardini/code/FantaF1/backend-csharp).
- Il runtime locale, Docker, staging Render e CI/CD sono allineati al backend C#.
- Il branch `staging` e' il branch di certificazione corrente.
- La release candidata corrente del branch `staging` e' `1.5.2`.
- `main` resta il target di rilascio protetto e va aggiornato solo dopo cutover esplicito.
- La documentazione operativa canonica del repository vive in questo file; la cronologia di rilascio vive in [CHANGELOG.md](/Users/matteobernardini/code/FantaF1/CHANGELOG.md).

## Stato workspace Conductor

- Il workspace live di Conductor non contiene piu' track attivi sotto [conductor/tracks](/Users/matteobernardini/code/FantaF1/conductor/tracks); tutti i track storici sono stati archiviati sotto [conductor/archive](/Users/matteobernardini/code/FantaF1/conductor/archive).
- I documenti di piano legacy rimasti in precedenza nel root di `conductor/` sono stati spostati in [conductor/archive/_root-plans](/Users/matteobernardini/code/FantaF1/conductor/archive/_root-plans) e non fanno parte della navigazione live della skill.
- Il report operativo sul fix di compatibilita' della skill installata vive in [conductor/conductor-skill-operational-feedback.md](/Users/matteobernardini/code/FantaF1/conductor/conductor-skill-operational-feedback.md).

## Superfici runtime

- Staging Render: [fantaf1-staging.onrender.com](https://fantaf1-staging.onrender.com/)
- Produzione live: [fantaf1-47vy.onrender.com](https://fantaf1-47vy.onrender.com)

Lo staging deve rimanere allineato alla produzione a livello di funzionalita'. Differenze di branding, testo o layout sono tollerabili solo se non introducono divergenze funzionali.

## Governance Branch

- `staging` e' il branch candidato di certificazione e il branch sorgente atteso per l'ambiente Render di staging.
- `main` resta il branch protetto di release e il target finale del flusso di deploy.
- Il rename operativo da `develop` a `staging` richiede anche il riallineamento fuori repo della configurazione Render, delle branch protection e di eventuali automazioni GitHub/Render che puntavano al vecchio nome branch.

## Panoramica funzionale

- L'applicazione gestisce sempre esattamente `3` partecipanti.
- I nomi dei partecipanti sono data-driven e vengono letti dallo stato persistito, non sono un vincolo hardcoded.
- L'admin seleziona il weekend, inserisce i pronostici, registra o recupera i risultati reali e conferma i punti nello storico.
- La vista `public` e' consultiva; le mutazioni richiedono una sessione admin valida.
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

- `POST /api/predictions` accetta solo payload con almeno un campo pronostico compilato.
- `POST /api/data` e' usato dai flussi applicativi completi e puo' salvare anche uno stato corrente vuoto quando e' generato da reset, conferma risultati o ricalcolo.
- Il backend rifiuta i payload con numero partecipanti diverso da `3`.

### Race lock

Il lock e' server-side:

- usa `raceStartTime` quando disponibile
- usa il fallback `endDate + 14:00:00Z` quando `raceStartTime` manca
- dopo il lock rifiuta le modifiche che alterano i pronostici gia' persistiti

### Risultati e punteggi

- I risultati ufficiali vengono recuperati tramite `GET /api/results/:meetingKey`.
- Il backend espone `racePhase` (`open`, `live`, `finished`) separato dal race lock.
- La conferma risultati e' consentita solo quando il weekend e' `finished` e i risultati reali sono completi.
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

- shell responsive desktop/mobile
- navigazione sticky desktop e drawer mobile `Sezioni`
- hero full-width
- stato admin/public coerente in tutte le superfici
- track map coerente tra hero, recap e pannello risultati

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
- solution: [backend-csharp/FantaF1.Backend.sln](/Users/matteobernardini/code/FantaF1/backend-csharp/FantaF1.Backend.sln)
- layer:
  - `Api`
  - `Application`
  - `Domain`
  - `Infrastructure`
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

Se un sync fallisce, il backend prova a usare la cache MongoDB gia' disponibile per quel dominio.

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

## Database e migrazioni

L'analisi corrente del branch mostra che `fantaf1` e `fantaf1_staging` sono allineati sulle collection principali, sugli indici e sulla shape dei documenti campionati per:

- `appdatas`
- `drivers`
- `weekends`
- `standingscaches`
- `admincredentials`

Alla data di questa verifica non emerge una migrazione obbligatoria da applicare ai database live per il cutover. Eventuali future migrazioni dovranno essere:

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

`VITE_APP_LOCAL_NAME` viene letta dal frontend Vite a build-time. Su Docker/Render non e' una variabile runtime del backend C#: deve entrare nello stage di build frontend e ogni modifica richiede un rebuild/redeploy per diventare visibile.

### Variabili di servizio locali

- `MONGODB_DB_NAME_OVERRIDE`
  - usata dai runner locali e dalla CI per forzare un database isolato
  - non va usata per puntare a `fantaf1` o `fantaf1_staging`

### Seed admin locale production-like

Il target locale `csharp-staging-local` usa seed runtime non versionati come plaintext:

- `AdminCredentialSeed__PasswordSalt`
- `AdminCredentialSeed__PasswordHashHex`

Queste variabili vengono generate dai runner locali; non vanno impostate manualmente su Render.

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
- se viene modificata su Render staging, richiede un rebuild/redeploy del servizio per diventare visibile
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

- `VITE_APP_LOCAL_NAME` e' una build env del frontend e non una runtime env del backend
- se viene cambiata su produzione, il servizio va rebuildato/redeployato
- salvo esigenza esplicita, lasciarla vuota per usare il fallback da `config/app-config.json`

### GitHub Actions

Secret richiesti:

- `MONGODB_URI_CI`
- `ADMIN_SESSION_SECRET_CI`

Secret opzionale:

- `RENDER_HEALTHCHECK_URL`

La pipeline normalizza la URI CI e usa `MONGODB_DB_NAME_OVERRIDE=fantaf1_ci` per impedire mutazioni dei database condivisi.

## Avvio locale

### Prerequisiti

- `npm install`
- .NET 10 SDK
- Node.js
- MongoDB raggiungibile tramite `MONGODB_URI`
- Google Chrome in `/Applications/Google Chrome.app` per il launcher monitorato

### Launcher canonico

- [start_fantaf1.command](/Users/matteobernardini/code/FantaF1/start_fantaf1.command)

Quando un task richiede di `avviare l'app`, questo e' il solo entrypoint canonico.

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

### Guardrail sui database locali

I runner locali mutanti non devono mai toccare `fantaf1` o `fantaf1_staging`.

Target supportati:

- `csharp-dev` -> `fantaf1_local_dev`
- `csharp-staging-local` -> `fantaf1_local_staging`

Se `MONGODB_URI` contiene un database condiviso, i runner locali:

- lo riscrivono sul database isolato previsto quando il target e' consentito
- falliscono esplicitamente se qualcuno tenta di usarli verso `fantaf1` o `fantaf1_staging`

## Docker

Il deploy Docker usa il [Dockerfile](/Users/matteobernardini/code/FantaF1/Dockerfile) nella root del repository.

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
- esporre `GET /api/health` con `environment=production` e `databaseTarget=fantaf1`

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

- se il servizio produzione non usa davvero Docker + `./Dockerfile`, il cutover non e' pronto
- se `GET /api/health` non restituisce `environment=production`, il cutover e' fallito
- se `GET /api/health` non restituisce `databaseTarget=fantaf1`, il cutover e' fallito
- non usare `MONGODB_DB_NAME_OVERRIDE` per forzare la produzione: il runtime rifiuta target non coerenti

## CI/CD

Workflow principali:

- [pr-ci.yml](/Users/matteobernardini/code/FantaF1/.github/workflows/pr-ci.yml)
- [pr-auto-merge.yml](/Users/matteobernardini/code/FantaF1/.github/workflows/pr-auto-merge.yml)
- [post-merge-health.yml](/Users/matteobernardini/code/FantaF1/.github/workflows/post-merge-health.yml)

Job richiesti su PR verso `main`:

- `lint`
- `build`
- `format-csharp`
- `build-csharp`
- `test-csharp`
- `responsive-dev`
- `smoke-ci-db`

I workflow aggiuntivi `gemini-*` restano validi come automazioni repository-side e devono continuare a parsare correttamente come YAML.

## Coverage e qualita'

Baseline verificata corrente sullo scope ufficiale frontend/repository:

- `5176 / 5176` statements
- `408 / 408` functions
- `2096 / 2096` branches
- `5176 / 5176` lines

Baseline verificata corrente su `backend-csharp/src/`:

- `2932 / 2932` lines
- `1653 / 1653` branches
- `489 / 489` methods
- `70` file inclusi

Le soglie repository restano a `100%` su statements, branches, functions e lines.

## Struttura repository

- `src/`: frontend React
- `backend-csharp/`: backend ASP.NET Core
- `config/`: configurazione applicativa
- `scripts/`: launcher, smoke, automation e utility runtime
- `tests/`: test frontend e tooling
- `public/`: asset statici frontend
- `.github/workflows/`: CI/CD e automazioni GitHub

## Documenti canonici

- [README.md](/Users/matteobernardini/code/FantaF1/README.md): stato operativo reale, runtime, env, deploy, CI/CD
- [CHANGELOG.md](/Users/matteobernardini/code/FantaF1/CHANGELOG.md): cronologia release e audit
- [PROJECT.md](/Users/matteobernardini/code/FantaF1/PROJECT.md): vincoli di business e invarianti di dominio
- [AGENTS.md](/Users/matteobernardini/code/FantaF1/AGENTS.md): disciplina ingegneristica obbligatoria
