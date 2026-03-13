# Subphase 3 - Health and environment database parity

Invocazione canonica: `Subphase 3`

## Scopo della subphase

- Portare in C# il resolver environment/database target e `GET /api/health`.
- Garantire la parity di `environment` e `databaseTarget` tra Node e C# nei contesti `Development`, `Staging` e `Production`.

## Source of truth e runtime autorevole

- Il runtime autorevole per gli utenti resta Node; la route C# migrata qui serve a verificare parity e non abilita ancora il cutover.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- La route `GET /api/health` deve restare wire-compatible con Node per status, field names e metadati.

## In scope

- Resolver C# di environment e database target.
- `GET /api/health` con `status`, `year`, `dbState`, `environment`, `databaseTarget`.
- Compatibilita' esplicita per `Development`, `Staging` e `Production`.
- Test di parity Node-vs-C# per mapping ambienti e payload health.

## Out of scope

- Sessioni e cookie, demandati a `Subphase 4`.
- Read/write routes, demandate a `Subphase 5`-`Subphase 6`.
- Bootstrap completo, static hosting React e startup sync, demandati a `Subphase 8`.

## Dipendenze e precondizioni

- `Subphase 2` completata con solution, DI e comandi C# funzionanti.
- Contratto `GET /api/health` congelato in `Subphase 1`.
- `fantaf1_porting` definito come unico target locale mutabile del porting.

## File/layer toccati

- `backend-csharp/src/FantaF1.Api` controller e DTO health.
- `backend-csharp/src/FantaF1.Application` servizi di classificazione environment/database.
- `backend-csharp/src/FantaF1.Infrastructure` lettura configurazione.
- `backend-csharp/tests/*` per unit, integration e contract parity.

## Contratti e invarianti da preservare

- `GET /api/health` deve restituire gli stessi field names del backend Node.
- `Development` deve mappare a comportamento locale del porting e target `fantaf1_porting`.
- `Staging` deve mappare a comportamento production-like; local smoke puo' puntare a `fantaf1_porting`, staging esterno a `fantaf1_staging`.
- `Production` deve continuare a identificare `fantaf1`.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza toccare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere parity test che falliscono su mapping environment/database e payload `GET /api/health`.
- `GREEN`: implementare resolver e controller C# minimi fino al verde dei test.
- `REFACTOR`: centralizzare costanti e mapping senza alterare il payload.

## Coverage 100% totale

- Coverage 100% obbligatoria su Node/React e su tutto il codice C# introdotto per environment e health.
- Nessun ramo di mapping ambienti puo' restare scoperto.

## Piano di implementazione passo-passo

1. Introdurre un servizio applicativo C# che classifichi environment e database target secondo il piano canonico.
2. Collegare il servizio al controller `GET /api/health` con DTO compatibile.
3. Coprire `Development`, `Staging` locale smoke, `Staging` esterno e `Production`.
4. Verificare la parity Node-vs-C# su payload, status code e metadati.
5. Mantenere assente qualsiasi altra route migrata non necessaria a questa slice.

## Test da aggiungere o aggiornare

- Unit test per il mapping `Development`/`Staging`/`Production`.
- Integration test per `GET /api/health`.
- Contract/parity test Node-vs-C# sul payload health.
- Riesecuzione della baseline Node/React.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: nessun delta UI atteso; confermare che il runtime Node resti invariato.
- Mobile admin/public in sviluppo: nessun delta UI atteso; confermare che il runtime Node resti invariato.
- Produzione-like locale: eseguire smoke HTTP su `GET /api/health` in modalita' `Staging`; browser gate non ancora applicabile al frontend.
- Staging: non applicabile finche' non esiste un servizio staging C# deployabile.

## Comandi di validazione da eseguire

- `dotnet build backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `npm run test:csharp-coverage`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`

## Criteri di completamento

- `GET /api/health` C# e Node sono parity-green per payload e mapping ambienti/database.
- Nessuna altra route e' stata migrata oltre a quanto strettamente richiesto.
- Coverage 100% su tutti i file toccati.

## Blocchi / condizioni di stop

- Ambiguita' irrisolte sul mapping `Staging` locale vs staging esterno.
- Necessita' di introdurre cookie, sessioni o write behavior in questa subphase.
- Failure di parity su field names o metadati health.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali del test host locale, da riportare esplicitamente.
- Nessun rischio residuo ammesso su `GET /api/health` o sul mapping dei target database.
