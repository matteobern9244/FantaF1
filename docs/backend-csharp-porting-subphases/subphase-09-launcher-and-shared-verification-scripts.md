# Subphase 9 - Launcher and shared verification scripts

Invocazione canonica: `Subphase 9`

## Stato

- `completed`
- Chiusura verificata con `npm run lint`, `npm run test`, `npm run build`, `npm run test:coverage`, `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`, `npm run test:csharp-coverage`, `npm run test:save-local`, `SAVE_SMOKE_TARGET=csharp-dev npm run test:save-local`, `SAVE_SMOKE_TARGET=csharp-staging-local npm run test:save-local`, `UI_RESPONSIVE_TARGET=node-dev npm run test:ui-responsive`, `UI_RESPONSIVE_TARGET=csharp-dev npm run test:ui-responsive` e `UI_RESPONSIVE_TARGET=csharp-staging-local npm run test:ui-responsive`.
- `start_fantaf1.command` resta il launcher canonico monitorato, mantiene `node-dev` come default e consente il runtime C# solo tramite opt-in esplicito `FANTAF1_LOCAL_RUNTIME`.
- Gli shared verification scripts verificano ora davvero `node-dev`, `csharp-dev` e `csharp-staging-local`, con bootstrap esplicito della sessione admin per il target production-like locale e senza fallback impliciti a `fantaf1_dev`.

## Scopo della subphase

- Aggiornare `start_fantaf1.command` per mantenerlo launcher canonico locale monitorato durante il porting.
- Parametrizzare `scripts/save-local-check.mjs` e `scripts/ui-responsive-check.mjs` per impedire qualunque fallback a `fantaf1_dev`.
- Rendere riusabile la verifica condivisa contro Node baseline, backend C# locale e locale production-like.

## Source of truth e runtime autorevole

- Il runtime autorevole per gli utenti resta Node fino a cutover esplicitamente approvato, anche se il runtime C# locale integrato esiste gia'.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- `start_fantaf1.command` resta il launcher canonico e non puo' inglobare `npm run test:ui-responsive` nel preflight.

## In scope

- Aggiornamento di `start_fantaf1.command`.
- Parametrizzazione di `scripts/save-local-check.mjs`.
- Parametrizzazione di `scripts/ui-responsive-check.mjs`.
- Introduzione di un resolver condiviso dei target locali e del seed admin deterministico usato dagli smoke/script locali.
- Esplicitazione di base URL, backend target, expected environment e expected database target.
- Blocco di ogni fallback implicito verso `fantaf1_dev`.
- Preservazione del baseline UI mergeato di `main`: navigation nell'hero, select native su mobile, `back-to-top` e standings pubbliche.

## Out of scope

- Docker, Atlas staging, Render staging e staging browser gate, demandati a `Subphase 10`.
- Attivita' finali di governance, cutover e chiusura del porting, demandate a `Subphase 11`.
- Ridefinizione dei contratti `/api/*`, gia' congelati nelle subphasi precedenti.

## Dipendenze e precondizioni

- `Subphase 8` completata con runtime C# integrato e same-origin locale disponibile.
- `start_fantaf1.command` resta l'unico entrypoint locale canonico.
- I browser gate locali sono ormai eseguibili contro il backend C# integrato.

## File/layer toccati

- `start_fantaf1.command`
- `scripts/dev-launcher.mjs`
- `scripts/local-runtime-targets.mjs`
- `scripts/local-admin-credential.mjs`
- `scripts/save-local-check.mjs`
- `scripts/ui-responsive-check.mjs`
- helper condivisi sotto `scripts/ui-responsive/`
- `tests/*` per launcher lifecycle, smoke save e responsive runner target-aware

## Contratti e invarianti da preservare

- Nessun controllo mutante del porting puo' risolvere di default `fantaf1_dev`.
- `start_fantaf1.command` deve restare valido, eseguibile e allineato al flusso reale di startup monitorato.
- `start_fantaf1.command` non deve eseguire `npm run test:ui-responsive` nel preflight automatico.
- `start_fantaf1.command` deve restare `node-dev` by default finche' il cutover non e' formalmente autorizzato.
- Gli script condivisi devono rimanere single-sourced e riutilizzabili per Node baseline, C# locale e C# locale production-like.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per fallback implicito a `fantaf1_dev`, launcher non allineato e parametri mancanti.
- `GREEN`: introdurre i parametri minimi e aggiornare il launcher fino al verde dei test.
- `REFACTOR`: semplificare parsing/configurazione e mantenere la logica condivisa in un solo punto.

## Coverage 100% totale

- Tutto il codice JavaScript introdotto o modificato negli script condivisi deve restare al 100%.
- La baseline Node/React deve restare al 100%.
- Lo scope ufficiale `backend-csharp/src/` deve restare al 100% per linee, branch e metodi.

## Piano di implementazione passo-passo

1. Introdurre un resolver condiviso dei target locali per `node-dev`, `csharp-dev` e `csharp-staging-local`, con base URL, health URL, porte, environment atteso, database target atteso e policy auth esplicita.
2. Rendere `scripts/save-local-check.mjs` esplicito su target, login admin e cookie reuse per `csharp-staging-local`, usando seed admin deterministico derivato a runtime.
3. Rendere `scripts/ui-responsive-check.mjs` e gli helper `ui-responsive/` espliciti sugli stessi target, con bootstrap della sessione admin per il target production-like locale.
4. Aggiornare `start_fantaf1.command` e `scripts/dev-launcher.mjs` per mantenere `node-dev` come default monitorato e supportare il runtime C# solo su opt-in esplicito.
5. Verificare che gli stessi script colpiscano davvero Node baseline, C# locale e C# locale production-like senza fallback legacy, preservando il baseline UI mergeato di `main`.

## Test da aggiungere o aggiornare

- Test unitari sui resolver dei target locali e sul seed admin deterministico.
- Test su `save-local-check` per login admin, cookie reuse e failure esplicite sui target C#.
- Test sul responsive runner per bootstrap target-aware e sessione admin su `csharp-staging-local`.
- Test sul launcher per il flusso di startup monitorato, il default `node-dev` e l'assenza del responsive check nel preflight.
- Riesecuzione della baseline Node/React e della suite C# gia' introdotta.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: obbligatorie tramite `UI_RESPONSIVE_TARGET=node-dev npm run test:ui-responsive` e `UI_RESPONSIVE_TARGET=csharp-dev npm run test:ui-responsive`.
- Mobile admin/public in sviluppo: obbligatorie tramite gli stessi check responsive sui due target locali.
- Produzione-like locale: obbligatoria la verifica responsive contro `UI_RESPONSIVE_TARGET=csharp-staging-local npm run test:ui-responsive` su `fantaf1_porting`.
- Staging: non applicabile finche' il servizio Render non esiste; il gate esterno resta demandato a `Subphase 10`.

## Comandi di validazione da eseguire

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:coverage`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `npm run test:csharp-coverage`
- `npm run test:save-local`
- `SAVE_SMOKE_TARGET=csharp-dev npm run test:save-local`
- `SAVE_SMOKE_TARGET=csharp-staging-local npm run test:save-local`
- `UI_RESPONSIVE_TARGET=node-dev npm run test:ui-responsive`
- `UI_RESPONSIVE_TARGET=csharp-dev npm run test:ui-responsive`
- `UI_RESPONSIVE_TARGET=csharp-staging-local npm run test:ui-responsive`

## Criteri di completamento

- Il launcher canonico resta monitorato, conserva `node-dev` come default e supporta il runtime C# solo con selezione esplicita.
- Gli script condivisi non possono piu' ricadere su `fantaf1_dev` quando il target selezionato e' C#.
- `node-dev`, `csharp-dev` e `csharp-staging-local` sono tutti verificabili tramite smoke save e browser gate riusabili.
- Coverage 100% su tutti i file toccati.

## Blocchi / condizioni di stop

- Necessita' di introdurre staging Render o workflow GitHub per chiudere questa subphase.
- Impossibilita' di parametrizzare gli script senza duplicare logica.
- Launcher non coerente con le regole di `AGENTS.md`.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali del browser locale o del launcher, da riportare esplicitamente.
- Nessun rischio residuo ammesso su fallback database o launcher canonico.
