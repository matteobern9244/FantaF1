# Subphase 4 - Session and admin auth parity

Invocazione canonica: `Subphase 4`

## Scopo della subphase

- Portare in C# `GET /api/session`, `POST /api/admin/session` e `DELETE /api/admin/session`.
- Preservare parity di cookie, TTL, `defaultViewMode` e differenze tra `Development` e ambienti production-like.

## Source of truth e runtime autorevole

- Il runtime autorevole per gli utenti resta Node; questa slice C# serve a verificare parity delle sessioni admin.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- I contratti di sessione e cookie definiti dal backend Node restano congelati fino a parity verificata.

## In scope

- `GET /api/session`
- `POST /api/admin/session`
- `DELETE /api/admin/session`
- Cookie `fantaf1_admin_session`, TTL 7 giorni e flag `HttpOnly`, `SameSite=Lax`, `Secure` solo in ambienti production-like.
- Differenze di comportamento tra `Development` e `Staging`/`Production`.

## Out of scope

- Read routes e write routes, demandate a `Subphase 5` e `Subphase 6`.
- Bootstrap completo, static hosting, launcher e staging runtime, demandati a `Subphase 8`-`Subphase 10`.
- Attivita' finali di governance, cutover e chiusura del porting, demandate a `Subphase 11`.

## Dipendenze e precondizioni

- `Subphase 2` e `Subphase 3` completate.
- Servizi `IClock` e `ISignedCookieService` gia' introdotti nella solution.
- Credenziali admin e storage legacy restano solo riferimenti contrattuali finche' non esiste il bootstrap C# completo.

## File/layer toccati

- `backend-csharp/src/FantaF1.Api` controller/DTO session auth.
- `backend-csharp/src/FantaF1.Application` orchestrazione sessione e auth.
- `backend-csharp/src/FantaF1.Infrastructure` cookie signing, verifica e accesso credenziali.
- `backend-csharp/tests/*` per unit, integration e parity.

## Contratti e invarianti da preservare

- Nome cookie: `fantaf1_admin_session`.
- TTL: 7 giorni.
- `Secure` solo per `Staging` e `Production`; `Development` resta admin-open per le write requests.
- `GET /api/session` deve restituire `defaultViewMode=admin` in `Development` e `defaultViewMode=public` in ambienti production-like.
- `Staging` deve comportarsi come `Production` per auth e cookie policy.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per cookie flags, TTL, `defaultViewMode` e route auth.
- `GREEN`: implementare i servizi C# minimi e le tre route fino al verde di parity.
- `REFACTOR`: centralizzare costanti cookie/sessione e ridurre duplicazioni senza cambiare il wire contract.

## Coverage 100% totale

- Coverage 100% obbligatoria su tutte le nuove classi C# di sessione/auth.
- Coverage 100% da preservare anche sullo scope Node/React.

## Piano di implementazione passo-passo

1. Implementare il servizio C# di lettura/sessione admin con clock e signed cookie iniettati.
2. Implementare `GET /api/session` con parity di `isAdmin` e `defaultViewMode`.
3. Implementare `POST /api/admin/session` con verifica password e scrittura cookie compatibile.
4. Implementare `DELETE /api/admin/session` con clear del cookie compatibile.
5. Verificare parity Node-vs-C# per body, status code, header `Set-Cookie` e differenze ambientali.

## Test da aggiungere o aggiornare

- Unit test su TTL, flags cookie e mapping `defaultViewMode`.
- Integration test per `GET /api/session`, `POST /api/admin/session`, `DELETE /api/admin/session`.
- Parity test Node-vs-C# su header cookie e body di risposta.
- Riesecuzione baseline Node/React.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: verificare che la sessione admin e la vista di default restino coerenti quando il frontend puo' puntare al backend C# senza cambiare il frontend stesso.
- Mobile admin/public in sviluppo: stessa verifica del desktop.
- Produzione-like locale: obbligatorio verificare cookie `Secure`/`SameSite` e default view mode in modalita' `Staging`.
- Staging: non applicabile finche' non esiste il servizio staging reale; non anticipare deploy.

## Comandi di validazione da eseguire

- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`

## Criteri di completamento

- Le tre route di session/auth sono parity-green tra Node e C#.
- TTL, cookie flags e `defaultViewMode` sono identici nei contesti previsti.
- Nessuna read/write route ulteriore e' stata migrata.
- Coverage 100% su tutti i file toccati.

## Blocchi / condizioni di stop

- Necessita' di toccare write/read routes non appartenenti a questa subphase.
- Impossibilita' di ottenere parity su header `Set-Cookie`.
- Necessita' di toccare launcher, staging o workflow per chiudere questa slice.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali dei test host o del browser locale, da riportare con precisione.
- Nessun rischio residuo ammesso sui contratti di sessione e cookie.
