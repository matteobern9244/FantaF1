# Subphase 6 - Write routes data and predictions

Invocazione canonica: `Subphase 6`

## Scopo della subphase

- Portare in C# `POST /api/data` e `POST /api/predictions`.
- Preservare le regole ad alto rischio su roster, prediction completeness, race lock, save error payload, requestId e persistence round-trip.

## Source of truth e runtime autorevole

- Il runtime autorevole per gli utenti resta Node; questa subphase migra le write routes solo a fini di parity verificata.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- Le regole business sulla scrittura definite oggi dal backend Node sono intoccabili fino a parity totale.

## In scope

- `POST /api/data`
- `POST /api/predictions`
- Regole roster e partecipanti attesi.
- Prediction completeness e distinzione tra save manuale e non manuale.
- Race lock e relativi payload di errore.
- Save error payload generico con requestId.
- Persistence round-trip e regressioni ad alto rischio.

## Out of scope

- Standings route e standings sync capability, demandate a `Subphase 6A`.
- Results route, demandata a `Subphase 7`.
- Bootstrap runtime, static hosting same-origin e background sync, demandati a `Subphase 8`.
- Launcher, staging e attivita' finali di governance e chiusura del porting, demandati a `Subphase 9`-`Subphase 11`.

## Dipendenze e precondizioni

- `Subphase 2`-`Subphase 5` completate.
- Regole di dominio e invarianti roster/predictions/race lock congelate in `Subphase 1`.
- Auth/session parity completata in `Subphase 4`, per poter applicare i gate corretti in ambienti production-like.

## File/layer toccati

- `backend-csharp/src/FantaF1.Api` controller/DTO write.
- `backend-csharp/src/FantaF1.Application` orchestrazione save e validazioni applicative.
- `backend-csharp/src/FantaF1.Domain` regole roster, predictions e race lock.
- `backend-csharp/src/FantaF1.Infrastructure` repository write e request id support.
- `backend-csharp/tests/*` per unit, integration, repository integration e parity.

## Contratti e invarianti da preservare

- I partecipanti restano esattamente 3: Adriano, Fabio, Matteo.
- `POST /api/data` continua ad accettare payload all-empty solo nei flussi non manuali previsti.
- `POST /api/predictions` continua a rifiutare payload totalmente vuoti.
- Il race lock resta enforced server-side, anche dopo fine gara, come nel backend Node.
- I payload di errore restano compatibili, incluso `requestId` per i save error.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per roster, prediction completeness, race lock, requestId e round-trip persistito.
- `GREEN`: implementare il minimo necessario per portare al verde le due write routes con parity piena.
- `REFACTOR`: concentrare le regole nel domain layer e ridurre la complessita' dell'orchestrazione senza alterare il contratto.

## Coverage 100% totale

- Tutto il codice C# introdotto per le write routes deve essere coperto al 100%.
- Nessun ramo di validazione o gestione errori puo' restare scoperto.
- La baseline Node/React deve restare al 100%.

## Piano di implementazione passo-passo

1. Portare nel domain layer C# le regole di roster, completeness e race lock senza cambiare il comportamento.
2. Implementare i repository e l'orchestrazione write con requestId e payload error compatibili.
3. Implementare `POST /api/data` mantenendo il comportamento non manuale esistente.
4. Implementare `POST /api/predictions` mantenendo il comportamento manuale, il race lock e i messaggi di errore.
5. Verificare parity Node-vs-C# su status code, body, error payload, round-trip persistito e campi non correlati non mutati.

## Test da aggiungere o aggiornare

- Unit test su roster validation, completeness e race lock.
- Integration test su `POST /api/data` e `POST /api/predictions`.
- Repository integration test su round-trip persistito e shape dei documenti.
- Parity test Node-vs-C# su payload di successo e di errore, incluso `requestId`.
- Regressioni ad alto rischio sui casi gia' coperti dal backend Node.
- Riesecuzione baseline Node/React.

## Verifiche browser e responsive

- Desktop admin in sviluppo: verificare i flussi di salvataggio dati e predictions contro il backend C#.
- Desktop public in sviluppo: verificare che i flussi pubblici restino non regressivi e che le write restino coerenti con il ruolo.
- Mobile admin/public in sviluppo: stessa verifica del desktop.
- Produzione-like locale: obbligatorio verificare auth guard, race lock e payload errore in modalita' `Staging`.
- Staging: non applicabile finche' non esiste il servizio staging reale.

## Comandi di validazione da eseguire

- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `npm run test:csharp-coverage`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`
- `npm run test:save-local`

## Criteri di completamento

- Le due write routes sono parity-green tra Node e C#.
- Roster, completeness, race lock e save error payload sono identici al backend Node.
- Nessuna results route, bootstrap runtime o staging operation e' stata anticipata.
- Coverage 100% su tutti i file toccati.

## Blocchi / condizioni di stop

- Impossibilita' di preservare le regole sui tre partecipanti.
- Ambiguita' o differenze nei payload di errore rispetto a Node.
- Necessita' di introdurre bootstrap runtime o static hosting per far passare i test di questa subphase.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali del browser/test host locale, da riportare con il comando fallito.
- Nessun rischio residuo ammesso su write behavior, race lock o payload di errore.
