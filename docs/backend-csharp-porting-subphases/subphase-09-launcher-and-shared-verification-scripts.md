# Subphase 9 - Launcher and shared verification scripts

Invocazione canonica: `Subphase 9`

## Scopo della subphase

- Aggiornare `start_fantaf1.command` per mantenerlo launcher canonico del runtime migrato.
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
- Esplicitazione di base URL, backend target, expected environment e expected database target.
- Blocco di ogni fallback implicito verso `fantaf1_dev`.

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
- `scripts/save-local-check.mjs`
- `scripts/ui-responsive-check.mjs`
- eventuali helper condivisi sotto `scripts/ui-responsive/`

## Contratti e invarianti da preservare

- Nessun controllo mutante del porting puo' risolvere di default `fantaf1_dev`.
- `start_fantaf1.command` deve restare valido, eseguibile e allineato al flusso reale di startup monitorato.
- `start_fantaf1.command` non deve eseguire `npm run test:ui-responsive` nel preflight automatico.
- Gli script condivisi devono rimanere single-sourced e riutilizzabili per Node baseline, C# locale e C# locale production-like.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per fallback implicito a `fantaf1_dev`, launcher non allineato e parametri mancanti.
- `GREEN`: introdurre i parametri minimi e aggiornare il launcher fino al verde dei test.
- `REFACTOR`: semplificare parsing/configurazione e mantenere la logica condivisa in un solo punto.

## Coverage 100% totale

- Tutto il codice JavaScript introdotto o modificato negli script condivisi deve restare al 100%.
- La baseline Node/React e l'eventuale scope C# gia' introdotto devono restare al 100%.

## Piano di implementazione passo-passo

1. Rendere `scripts/save-local-check.mjs` esplicito su base URL, backend target, expected environment e expected database target.
2. Rendere `scripts/ui-responsive-check.mjs` esplicito sugli stessi target, senza fallback legacy.
3. Aggiornare `start_fantaf1.command` per avviare il runtime migrato reale mantenendo il monitoraggio e i preflight esistenti.
4. Verificare che il launcher non inglobi `npm run test:ui-responsive`.
5. Verificare che gli stessi script possano colpire Node baseline, C# locale e C# locale production-like con parametri espliciti.

## Test da aggiungere o aggiornare

- Test unitari/integrazione sugli script per il parsing dei parametri obbligatori.
- Test sul launcher per il flusso di startup monitorato e per l'assenza del responsive check nel preflight.
- Riesecuzione `npm run test:save-local`.
- Riesecuzione `npm run test:ui-responsive`.
- Riesecuzione baseline Node/React e della suite C# gia' introdotta.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: obbligatorie tramite `npm run test:ui-responsive` contro il target C# locale esplicito.
- Mobile admin/public in sviluppo: obbligatorie tramite lo stesso check responsive.
- Produzione-like locale: obbligatoria la verifica responsive contro il target locale `Staging` su `fantaf1_porting`.
- Staging: non applicabile finche' il servizio Render non esiste; il gate esterno resta demandato a `Subphase 10`.

## Comandi di validazione da eseguire

- `npm run test:save-local`
- `npm run test:ui-responsive`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`

## Criteri di completamento

- Il launcher canonico punta al runtime migrato reale e resta monitorato.
- Gli script condivisi non possono piu' ricadere su `fantaf1_dev`.
- I browser gate locali sono eseguibili in sviluppo e in produzione-like locale.
- Coverage 100% su tutti i file toccati.

## Blocchi / condizioni di stop

- Necessita' di introdurre staging Render o workflow GitHub per chiudere questa subphase.
- Impossibilita' di parametrizzare gli script senza duplicare logica.
- Launcher non coerente con le regole di `AGENTS.md`.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali del browser locale o del launcher, da riportare esplicitamente.
- Nessun rischio residuo ammesso su fallback database o launcher canonico.
