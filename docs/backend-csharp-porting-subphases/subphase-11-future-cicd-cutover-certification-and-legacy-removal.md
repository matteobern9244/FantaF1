# Subphase 11 - Future CI-CD cutover certification and legacy removal

Invocazione canonica: `Subphase 11`

## Scopo della subphase

- Creare i workflow futuri branch-specific sullo stack C# solo quando lo stack C# completo esiste davvero nel repository.
- Chiudere il porting con gating CI/CD, criteri di cutover, certificazione utente e rimozione finale del backend legacy.

## Source of truth e runtime autorevole

- Il runtime autorevole resta Node fino a quando tutte le condizioni di cutover non sono soddisfatte e l'utente non certifica esplicitamente il porting sul branch `porting-backend-c#`.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- La rimozione di `backend/`, `app.js`, `server.js` e dei path legacy e' consentita solo in questa subphase e solo come ultima operazione del porting.

## In scope

- Workflow GitHub Actions futuri e branch-specific per `porting-backend-c#`.
- Gating CI/CD del futuro stack C#.
- Criteri formali di cutover e rollback readiness.
- Certificazione utente del porting.
- Rimozione del backend legacy e dei path runtime obsoleti, solo dopo parity totale verificata.

## Out of scope

- Qualunque creazione anticipata di workflow C# prima che lo stack esista realmente.
- Qualunque rimozione legacy prima che tutte le condizioni di cutover siano verdi.
- Qualunque modifica impropria ai workflow autorevoli di `main` prima del completamento del porting.

## Dipendenze e precondizioni

- `Subphase 1`-`Subphase 10` completate e verdi.
- Route parity totale, coverage 100%, browser locali verdi, browser staging verdi e rollback readiness documentata.
- `start_fantaf1.command` gia' allineato al runtime migrato e `FantaF1_staging` gia' validato.

## File/layer toccati

- `.github/workflows/` per i workflow futuri branch-specific C#
- `backend/`, `app.js`, `server.js` e path legacy solo al momento della rimozione finale
- eventuale documentazione di rollback/cutover strettamente necessaria

## Contratti e invarianti da preservare

- I workflow correnti di `main` restano invariati finche' il futuro stack C# non e' reale e completo.
- La CI del porting deve usare database dedicati e mai `fantaf1`, `fantaf1_dev`, `fantaf1_porting` o `fantaf1_staging`.
- Il cutover puo' iniziare solo dopo parity totale, coverage 100%, browser locali verdi, browser staging verdi e certificazione utente.
- La rimozione del backend legacy avviene solo dopo che il backend C# e' gia' l'implementazione verificata e certificata.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test/check che falliscono se i workflow futuri non riflettono lo stack reale o se il legacy removal avviene troppo presto.
- `GREEN`: introdurre i workflow branch-specific futuri e la rimozione legacy solo quando tutte le precondizioni sono verdi.
- `REFACTOR`: semplificare i workflow e rimuovere i path legacy non piu' necessari senza lasciare bridge permanenti.

## Coverage 100% totale

- Coverage 100% obbligatoria su tutto lo scope finale Node/React/C# rilevante al momento del cutover.
- Nessun workflow o legacy removal puo' essere accettato se abbassa il livello di coverage o salta i gate gia' fissati.

## Piano di implementazione passo-passo

1. Creare i workflow futuri branch-specific C# solo quando `backend-csharp/` e Docker assets sono reali e runnable.
2. Configurare restore/build/test/coverage C#, build Docker, check React e health staging senza toccare i workflow di `main`.
3. Verificare i criteri di cutover: parity totale, coverage 100%, browser locali verdi, browser staging verdi, launcher canonico aggiornato, rollback readiness.
4. Ottenere certificazione utente esplicita sul branch `porting-backend-c#`.
5. Solo a questo punto rimuovere `backend/`, `app.js`, `server.js` e i path legacy obsoleti.

## Test da aggiungere o aggiornare

- Validazione locale dei workflow futuri rispetto allo stack reale.
- Riesecuzione completa di suite Node/React/C#, coverage 100%, browser locali e staging.
- Smoke di health e di rollback readiness sui workflow e sugli ambienti target.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: devono restare verdi sul runtime C# finale prima del cutover.
- Mobile admin/public in sviluppo: devono restare verdi sul runtime C# finale prima del cutover.
- Produzione-like locale: deve restare verde prima del cutover.
- Staging: desktop admin/public e mobile admin/public devono essere verdi su `FantaF1_staging` prima della certificazione utente.

## Comandi di validazione da eseguire

- `dotnet build backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`
- `npm run test:save-local`
- `npm run test:ui-responsive`

## Criteri di completamento

- I workflow futuri C# esistono solo quando lo stack reale esiste.
- Tutte le condizioni di cutover sono verdi e certificate dall'utente.
- Il backend legacy viene rimosso solo come ultima operazione.
- Coverage 100% e browser gate restano verdi fino alla chiusura del porting.

## Blocchi / condizioni di stop

- Mancanza di certificazione utente.
- Workflow futuri che richiedono modifiche ai workflow autorevoli di `main` prima del tempo.
- Tentativo di rimuovere il legacy backend prima che tutte le condizioni di cutover siano verdi.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo indisponibilita' temporanee dell'infrastruttura esterna o della CI, da riportare esplicitamente con l'impatto.
- Nessun rischio residuo ammesso sul legacy removal o sul cutover senza certificazione.
