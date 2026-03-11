# Subphase 7 - Results route race phase and highlights

Invocazione canonica: `Subphase 7`

## Scopo della subphase

- Portare in C# `GET /api/results/:meetingKey`.
- Preservare parity di parsing risultati, `racePhase`, `highlightsVideoUrl`, edge case e fallback.

## Source of truth e runtime autorevole

- Il runtime autorevole per gli utenti resta Node; la results route C# viene introdotta solo per parity verificata.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- I payload risultati del backend Node restano la reference assoluta per shape, campi opzionali e fallback.

## In scope

- `GET /api/results/:meetingKey`
- Calcolo di `racePhase`.
- Presenza/assenza di `highlightsVideoUrl`.
- Parsing dei risultati ufficiali e fallback a dati cache quando previsti.
- Gestione edge case su gare non trovate, highlight non disponibili e risultati incompleti.

## Out of scope

- Startup sync e static hosting same-origin, demandati a `Subphase 8`.
- Launcher, script di verifica, staging e attivita' finali di governance e chiusura del porting, demandati a `Subphase 9`-`Subphase 11`.

## Dipendenze e precondizioni

- `Subphase 2`-`Subphase 6` completate.
- Regole `racePhase`, highlights e fallback congelate in `Subphase 1`.
- Read/write parity gia' disponibile per alimentare il contesto dati necessario alla route risultati.

## File/layer toccati

- `backend-csharp/src/FantaF1.Api` controller/DTO results.
- `backend-csharp/src/FantaF1.Application` orchestrazione risultati e highlight resolution.
- `backend-csharp/src/FantaF1.Domain` logica pura di `racePhase` e invarianti di parsing.
- `backend-csharp/src/FantaF1.Infrastructure` client/parsers/fallback repository.
- `backend-csharp/tests/*` per unit, integration, repository/client integration e parity.

## Contratti e invarianti da preservare

- La route deve restituire gli stessi field names del backend Node.
- `racePhase` deve restare coerente con il comportamento Node in tutte le fasi gara.
- `highlightsVideoUrl` deve comparire o mancare esattamente quando accade nel backend Node.
- Gli edge case devono restare espliciti: race non trovata, risultati incompleti, highlight assenti, fallback cache.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per payload risultati, `racePhase`, highlights e fallback.
- `GREEN`: implementare il minimo necessario per portare al verde la results route.
- `REFACTOR`: separare parsing, `racePhase` e highlight resolution senza alterare il payload.

## Coverage 100% totale

- Tutto il codice C# introdotto per risultati, highlights e fallback deve essere coperto al 100%.
- La baseline Node/React deve restare al 100%.

## Piano di implementazione passo-passo

1. Introdurre la logica pura C# per `racePhase`.
2. Implementare parsing e orchestrazione della results route con gestione dei fallback previsti.
3. Introdurre la risoluzione highlight compatibile con Node.
4. Verificare parity Node-vs-C# per body, campi opzionali, errori e comportamenti edge case.
5. Mantenere il comportamento read/write gia' portato inalterato.

## Test da aggiungere o aggiornare

- Unit test su `racePhase` e logica highlights.
- Integration test su `GET /api/results/:meetingKey`.
- Test di parser/fallback per risultati ufficiali e cache.
- Parity test Node-vs-C# su payload, `racePhase` e `highlightsVideoUrl`.
- Riesecuzione baseline Node/React.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: verificare recap gara, stato risultati e CTA highlight contro il backend C#.
- Mobile admin/public in sviluppo: stessa verifica del desktop.
- Produzione-like locale: eseguire smoke locale se il frontend puo' raggiungere il backend C# in modalita' `Staging`.
- Staging: non applicabile finche' non esiste il servizio staging reale.

## Comandi di validazione da eseguire

- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`

## Criteri di completamento

- `GET /api/results/:meetingKey` e' parity-green tra Node e C#.
- `racePhase`, highlights e fallback restano invariati.
- Nessun bootstrap runtime, launcher o staging operation e' stata anticipata.
- Coverage 100% su tutti i file toccati.

## Blocchi / condizioni di stop

- Ambiguita' sulla precedence dei fallback rispetto al comportamento Node.
- Necessita' di introdurre startup sync o static hosting per chiudere questa slice.
- Differenze non accettabili su `racePhase` o `highlightsVideoUrl`.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali del test host o dei browser locali, da riportare esplicitamente.
- Nessun rischio residuo ammesso sulla compatibilita' della results route.
