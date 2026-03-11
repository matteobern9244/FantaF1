# Subphase 8 - Startup sync bootstrap and cache fallback

Invocazione canonica: `Subphase 8`

## Scopo della subphase

- Portare in C# il bootstrap server completo, la connessione Mongo, il bootstrap credenziali admin, la sync drivers/calendar con retry e cache fallback.
- Abilitare il serving same-origin degli asset React dal backend C# come prerequisito per i browser gate integrati.
- Garantire startup non bloccante anche in presenza di failure delle sincronizzazioni esterne.

## Source of truth e runtime autorevole

- Il runtime autorevole per gli utenti resta Node finche' non esiste parity verificata e certificazione utente.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- Startup behavior, cache fallback e SPA static serving del backend Node restano la reference da preservare.

## In scope

- Bootstrap host C# completo.
- Connessione Mongo compatibile con il target locale del porting.
- Bootstrap credenziali admin.
- Background sync per drivers/calendar con retry e fallback a cache.
- Startup non bloccante in caso di fallimento sync.
- Serving same-origin degli asset React dal backend C#.

## Out of scope

- Launcher e script condivisi di verifica, demandati a `Subphase 9`.
- Docker, Atlas staging, Render staging e staging browser gate, demandati a `Subphase 10`.
- Attivita' finali di governance, cutover e chiusura del porting, demandate a `Subphase 11`.

## Dipendenze e precondizioni

- `Subphase 2`-`Subphase 7` completate.
- Tutte le route migrate fino a qui devono essere parity-green.
- Build React esistente riusabile come asset statico servito dal backend C#.

## File/layer toccati

- `backend-csharp/src/FantaF1.Api` bootstrap, middleware, static files e SPA fallback.
- `backend-csharp/src/FantaF1.Application` orchestrazione startup e sync.
- `backend-csharp/src/FantaF1.Infrastructure` Mongo bootstrap, seed credenziali, external clients e cache fallback.
- `backend-csharp/tests/*` per unit, integration, hosted service e parity.

## Contratti e invarianti da preservare

- Lo startup non deve bloccarsi per failure di sync drivers/calendar.
- Il fallback a cache deve restare disponibile.
- Le credenziali admin devono essere bootstrapate senza mutare target non consentiti.
- Il backend C# deve servire React e API dallo stesso origin senza alterare i contratti `/api/*`.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per startup blocking, retry/cached fallback, bootstrap credenziali e static hosting same-origin.
- `GREEN`: implementare bootstrap, hosted services e static hosting minimi fino al verde dei test.
- `REFACTOR`: isolare responsabilita' di startup, sync e static hosting senza cambiare il comportamento.

## Coverage 100% totale

- Tutto il codice C# introdotto per bootstrap, sync, cache fallback e static hosting deve essere coperto al 100%.
- La baseline Node/React deve restare al 100%.

## Piano di implementazione passo-passo

1. Implementare il bootstrap host C# con connessione Mongo e gestione delle failure coerente con Node.
2. Implementare bootstrap credenziali admin e cache bootstrap in modo idempotente.
3. Implementare background sync drivers/calendar con retry e fallback a cache.
4. Configurare static file serving e SPA fallback per servire il build React dallo stesso origin.
5. Verificare che tutte le route migrate restino parity-green una volta eseguite dietro il runtime C# integrato.

## Test da aggiungere o aggiornare

- Unit test su policy di retry e condizioni di fallback.
- Integration test di bootstrap host e hosted services.
- Test di static hosting same-origin e SPA fallback.
- Parity test sulle route migrate eseguite attraverso il runtime C# integrato.
- Riesecuzione baseline Node/React.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: obbligatorio eseguire il frontend servito dal backend C# same-origin.
- Mobile admin/public in sviluppo: obbligatorio eseguire il frontend servito dal backend C# same-origin.
- Produzione-like locale: obbligatorio verificare la stessa integrazione in modalita' `Staging` locale contro `fantaf1_porting`.
- Staging: non applicabile finche' il servizio Render non esiste; il gate esterno resta demandato a `Subphase 10`.

## Comandi di validazione da eseguire

- `dotnet build backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`
- `npm run test:save-local`

## Criteri di completamento

- Il runtime C# integrato si avvia senza bloccare lo startup in caso di failure di sync.
- Il fallback a cache funziona e le route migrate restano parity-green.
- React e API sono serviti same-origin dal backend C# locale.
- Coverage 100% su tutti i file toccati.

## Blocchi / condizioni di stop

- Startup bloccante in caso di failure esterna.
- Necessita' di introdurre launcher, staging Render o workflow per chiudere la subphase.
- Impossibilita' di servire il build React same-origin senza cambiare il comportamento frontend.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali del build React o dell'host locale, da riportare esplicitamente.
- Nessun rischio residuo ammesso su startup behavior, sync fallback o same-origin serving.
