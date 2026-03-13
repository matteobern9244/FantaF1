# Subphase 6A - Main delta assimilation and standings parity

Invocazione canonica: `Subphase 6A`

## Scopo della subphase

- Assimilare formalmente nel piano di porting il delta autorevole di `main` introdotto dopo la base `2c53c1573a06cc8518b544f461deba4be3c7072f`.
- Portare in C# `GET /api/standings`.
- Portare in C# la capability riusabile di sync standings con fallback a cache.
- Preservare parity su parsing, cache-first behavior, arricchimento roster/team e payload `updatedAt`.

## Source of truth e runtime autorevole

- Il runtime autorevole per gli utenti resta Node; questa subphase recepisce il nuovo baseline di `main` e lo rende tracciabile nel porting C#.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- `backend/standings.js`, `backend/storage.js`, `backend/models.js`, `backend/config.js`, `config/app-config.json` e i fixture standings del `main` mergeato sono la reference assoluta di parity.

## In scope

- Assimilazione documentata del delta `main` relativo a standings.
- `GET /api/standings`.
- Repository Mongo standings compatibile con `standingscaches`.
- Parser standings ufficiali e client sorgente ufficiale.
- Cache-first behavior.
- Sync on-demand quando la cache e' vuota.
- Capability standings sync riusabile dallo startup runtime futuro.
- Fallback a cache su errore sorgente o payload strutturalmente vuoto.
- Parity su `driverId`, `avatarUrl`, `color`, `logoUrl`, `updatedAt`.

## Out of scope

- Wiring finale del background sync standings nel bootstrap host integrato, demandato a `Subphase 8`.
- Launcher, script condivisi e browser gate riusabili, demandati a `Subphase 9`.
- Staging Render/Atlas, demandato a `Subphase 10`.
- Legacy removal finale, demandato a `Subphase 11`.

## Dipendenze e precondizioni

- `Subphase 2`-`Subphase 6` completate.
- Merge reale di `main` su `porting-backend-c#` gia' eseguito e baseline Node/React preservata.
- Contratti standings del `main` mergeato congelati nel piano canonico.

## File/layer toccati

- `backend-csharp/src/FantaF1.Api` controller standings.
- `backend-csharp/src/FantaF1.Application` read service, sync service e astrazioni standings.
- `backend-csharp/src/FantaF1.Domain` read models standings.
- `backend-csharp/src/FantaF1.Infrastructure` repository Mongo standings, parser e source client.
- `backend-csharp/tests/*` per unit, integration, contract e guardrail documentali.

## Contratti e invarianti da preservare

- La route deve restituire `{ driverStandings, constructorStandings, updatedAt }`.
- Se la cache contiene standings, la route non deve forzare una sync.
- Se la cache e' vuota, la route deve attivare la sync on-demand.
- Se la sorgente ufficiale fallisce o restituisce payload vuoti/inutilizzabili, il sistema deve ricadere sulla cache.
- Un errore inatteso a livello route deve restituire `Failed to read standings`.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per interfacce standings, route `/api/standings`, parser, repository cache, sync capability e ledger documentale `6A`.
- `GREEN`: implementare il minimo necessario per portare al verde route, servizi, repository, parser, source client e documentazione canonica.
- `REFACTOR`: ripulire seam, naming e DI senza cambiare comportamento o shape del payload.

## Coverage 100% totale

- Tutto il codice C# introdotto per standings deve essere coperto al 100%.
- La baseline Node/React mergeata da `main` deve restare al 100%.

## Piano di implementazione passo-passo

1. Formalizzare `Subphase 6A` nel ledger canonico e nella matrice di assimilazione delta `main`.
2. Introdurre le astrazioni standings nel layer `Application`.
3. Implementare controller, read service, sync service e repository Mongo standings.
4. Implementare parser e source client coerenti con la reference Node.
5. Verificare parity Node-vs-C# su route, payload, cache, fallback e fixture di parsing.

## Test da aggiungere o aggiornare

- Contract test sulle astrazioni standings.
- Integration test su `GET /api/standings`.
- Unit test su parser standings, sync capability e fallback.
- Repository test su `standingscaches`.
- Guardrail documentali sul ledger `Subphase 6A` e sulla matrice di assimilazione `main`.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: la UI mergeata che consuma standings deve continuare a funzionare contro il baseline Node.
- Mobile admin/public in sviluppo: stessa verifica del desktop.
- Produzione-like locale: il gate browser completo resta demandato a `Subphase 9`, ma la compatibilita' del contratto standings deve essere gia' preservata.
- Staging: non applicabile in questa subphase; restera' ownership di `Subphase 10`.

## Comandi di validazione da eseguire

- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `npm run test:csharp-coverage`
- `npm run test`
- `npm run test:coverage`

## Criteri di completamento

- `GET /api/standings` e' parity-green tra Node e C#.
- La capability riusabile di sync standings esiste e rispetta cache/fallback Node.
- La matrice di assimilazione delta `main` e il ledger canonico sono allineati.
- Coverage 100% su tutti i file toccati, misurata con `npm run test:csharp-coverage` sullo scope ufficiale `backend-csharp/src/`.
