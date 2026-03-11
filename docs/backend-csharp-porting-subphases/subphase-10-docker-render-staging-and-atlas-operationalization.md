# Subphase 10 - Docker Render staging and Atlas operationalization

Invocazione canonica: `Subphase 10`

## Scopo della subphase

- Operazionalizzare `backend-csharp/Dockerfile`, Atlas `fantaf1_porting` e `fantaf1_staging`, e il deploy staging Render `FantaF1_staging`.
- Eseguire la checklist completa di validazione staging, incluso il browser gate esterno staging-only.

## Source of truth e runtime autorevole

- Il runtime autorevole di produzione resta Node; lo staging esterno C# e' il primo ambiente di validazione reale del porting.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- `FantaF1_staging` e `fantaf1_staging` sono i nomi autorevoli da usare; non sono ammessi alias concorrenti.

## In scope

- `backend-csharp/Dockerfile`
- Build multi-stage con React + ASP.NET Core same-origin.
- Provisioning Atlas di `fantaf1_porting` e `fantaf1_staging`.
- Creazione/configurazione del servizio Render `FantaF1_staging`.
- Checklist di validazione staging, compresi health, route migrate, startup sync e browser gate esterno.

## Out of scope

- Attivita' finali di governance branch-specific e cutover, demandate a `Subphase 11`.
- Modifica dei workflow `main`, che devono restare invariati fino allo stack C# completo.

## Dipendenze e precondizioni

- `Subphase 8` e `Subphase 9` completate, con runtime C# integrato e browser gate locali verdi.
- Tutte le route migrate devono essere parity-green.
- Credenziali, utenti Atlas e segreti staging dedicati disponibili e separati da produzione.

## File/layer toccati

- `backend-csharp/Dockerfile`
- configurazione Render del servizio `FantaF1_staging`
- documentazione/runbook Atlas del porting
- eventuali asset di deploy strettamente necessari al servizio staging

## Contratti e invarianti da preservare

- `fantaf1_porting` e `fantaf1_staging` sono gli unici database mutabili del porting.
- Nessun deploy staging puo' usare credenziali produzione o `fantaf1_dev`.
- Il servizio staging deve servire React e API dallo stesso origin.
- Il browser gate esterno di questo piano e' solo staging; nessun gate post-deploy produzione va anticipato qui.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test/check che falliscono per Dockerfile assente, deploy staging non coerente, build non same-origin o database target errato.
- `GREEN`: introdurre Dockerfile, configurazione staging e checklist fino a validazione verde.
- `REFACTOR`: semplificare il deploy path e il runbook senza alterare gli isolamenti tra ambienti.

## Coverage 100% totale

- Coverage 100% obbligatoria su tutto il codice applicativo gia' introdotto.
- Nessun cambiamento di deploy puo' essere accettato se rompe i gate di coverage esistenti.

## Piano di implementazione passo-passo

1. Creare `backend-csharp/Dockerfile` multi-stage per build React, build/test/publish .NET e final image stateless.
2. Provisionare `fantaf1_porting` e `fantaf1_staging` con collection compatibili e utenze least-privilege distinte.
3. Creare/configurare il servizio Render `FantaF1_staging` puntato al branch `porting-backend-c#`.
4. Configurare `ASPNETCORE_ENVIRONMENT=Staging`, URI staging-only e secret staging-only.
5. Eseguire la checklist staging completa su route migrate, startup sync, browser desktop/mobile admin/public e rollback readiness.

## Test da aggiungere o aggiornare

- Validazione locale della build Docker e del runtime same-origin.
- Riesecuzione della suite C#, Node/React e coverage 100%.
- Riesecuzione `npm run test:save-local` e `npm run test:ui-responsive` prima del deploy staging.
- Smoke e browser verification su `FantaF1_staging`.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: devono restare verdi localmente prima di ogni deploy staging.
- Mobile admin/public in sviluppo: devono restare verdi localmente prima di ogni deploy staging.
- Produzione-like locale: devono restare verdi prima del deploy staging.
- Staging: obbligatorie verifiche desktop admin/public e mobile admin/public su `FantaF1_staging`; questo e' il gate browser esterno ufficiale del piano.

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

- L'immagine Docker del backend C# costruisce e gira end-to-end.
- `FantaF1_staging` usa `fantaf1_staging` e passa la checklist staging completa.
- Il browser gate staging-only e' verde.
- Coverage 100% e route parity restano verdi.

## Blocchi / condizioni di stop

- Dockerfile non same-origin o immagine non eseguibile.
- Staging che usa credenziali o target database non isolati.
- Browser gate staging esterno fallito.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo indisponibilita' temporanee dell'infrastruttura esterna, da riportare esplicitamente con l'impatto.
- Nessun rischio residuo ammesso su isolamento staging/produzione o browser gate staging-only.
