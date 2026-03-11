# Subphase 5 - Read routes data drivers calendar

Invocazione canonica: `Subphase 5`

## Scopo della subphase

- Portare in C# `GET /api/data`, `GET /api/drivers` e `GET /api/calendar`.
- Preservare sorting, sanitizzazione, shape dei documenti e compatibilita' con le collection esistenti.

## Source of truth e runtime autorevole

- Il runtime autorevole per gli utenti resta Node; le read routes C# vengono introdotte per parity e non per cutover.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- La shape dei payload read-only restituiti oggi da Node e' la reference da preservare.

## In scope

- `GET /api/data`
- `GET /api/drivers`
- `GET /api/calendar`
- Sorting alfabetico dei piloti e sorting per round del calendario.
- Sanitizzazione e compatibilita' della shape persistita.
- Compatibilita' con `appdatas`, `drivers`, `weekends`.

## Out of scope

- Write routes, demandate a `Subphase 6`.
- Results route, demandata a `Subphase 7`.
- Bootstrap completo e static hosting same-origin, demandati a `Subphase 8`.
- Launcher, staging e attivita' finali di governance del porting, demandati a `Subphase 9`-`Subphase 11`.

## Dipendenze e precondizioni

- `Subphase 2`, `Subphase 3` e `Subphase 4` completate.
- Contratti Node di shape dati, sorting e sanitizzazione congelati in `Subphase 1`.
- Collection names gia' formalizzati come invarianti di compatibilita'.

## File/layer toccati

- `backend-csharp/src/FantaF1.Api` controller/DTO read.
- `backend-csharp/src/FantaF1.Application` orchestrazione read e sanitizzazione.
- `backend-csharp/src/FantaF1.Infrastructure` repository Mongo read-only.
- `backend-csharp/tests/*` per unit, integration, repository integration e parity.

## Contratti e invarianti da preservare

- `GET /api/data` deve restituire lo stato persistito sanitizzato con gli stessi field names del backend Node.
- `GET /api/drivers` deve restituire il roster ordinato alfabeticamente.
- `GET /api/calendar` deve restituire il calendario ordinato per round.
- Nessuna read route puo' correggere silenziosamente collection name o shape dei documenti legacy.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per payload, sorting, sanitizzazione e shape persistita.
- `GREEN`: implementare repository, servizi e controller minimi per portare al verde le tre route.
- `REFACTOR`: centralizzare mapping/sorting e rimuovere duplicazioni senza cambiare il contratto HTTP.

## Coverage 100% totale

- Tutto il codice C# introdotto per le read routes deve essere coperto al 100%.
- La baseline Node/React deve restare al 100%.

## Piano di implementazione passo-passo

1. Implementare i repository Mongo read-only per `appdatas`, `drivers` e `weekends`.
2. Implementare i servizi applicativi di sanitizzazione e sorting coerenti con Node.
3. Implementare i tre endpoint C# con DTO compatibili.
4. Verificare round-trip read-only tra document shape Mongo e payload HTTP.
5. Verificare parity Node-vs-C# su status code, field names, sorting e campi opzionali.

## Test da aggiungere o aggiornare

- Unit test su sorting e sanitizzazione.
- Integration test su `GET /api/data`, `GET /api/drivers`, `GET /api/calendar`.
- Repository integration test sulla compatibilita' della shape dei documenti.
- Parity test Node-vs-C# su payload e ordering.
- Riesecuzione baseline Node/React.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: verificare che i pannelli che leggono dati, piloti e calendario mostrino lo stesso contenuto quando puntano al backend C#.
- Mobile admin/public in sviluppo: stessa verifica del desktop.
- Produzione-like locale: eseguire smoke read-only se il frontend puo' colpire il backend C# in modalita' `Staging` senza toccare il frontend.
- Staging: non applicabile finche' non esiste il servizio staging reale.

## Comandi di validazione da eseguire

- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`

## Criteri di completamento

- Le tre read routes sono parity-green tra Node e C#.
- Sorting e sanitizzazione restano invariati.
- Nessuna write route, results route o bootstrap runtime e' stata anticipata.
- Coverage 100% su tutti i file toccati.

## Blocchi / condizioni di stop

- Necessita' di introdurre logica write o di sessione oltre quanto gia' chiuso.
- Ambiguita' irrisolte sulla shape persistita o sui collection names compatibili.
- Parity non raggiunta su sorting, payload o campi opzionali.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali del test host o del frontend locale, da riportare con il comando fallito.
- Nessun rischio residuo ammesso sulla compatibilita' read-only dei payload.
