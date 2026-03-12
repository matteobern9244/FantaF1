# Subphase 1 - Foundation and safety rails

Invocazione canonica: `Subphase 1`

## Scopo della subphase

- Congelare la baseline esecutiva del porting backend C# prima di qualunque implementazione runtime.
- Formalizzare safety rails, inventario finale dei contratti Node, matrice ambienti/database, branch isolation e piano TDD/parity/coverage comune a tutte le subfasi.

## Source of truth e runtime autorevole

- Il runtime autorevole resta il backend Node.js in `backend/`, `app.js` e `server.js` fino a cutover esplicitamente approvato.
- Le fonti vincolanti sono `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md`, `guide-porting-c#/backend-csharp-porting-plan.md`.
- Senza eccezioni sono vincolanti anche tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`: `Engineering Principles`, `Migration-Specific Rules`, `Testing Strategy`, `Verification`, `Development Conventions`, `Notes For AI Coding Agents`.
- Questa subphase non autorizza modifiche a `/api/*`, payload, cookie, business logic o mutazioni verso `fantaf1` e `fantaf1_dev`.

## In scope

- Inventario definitivo delle route, dei cookie, delle collection e degli invarianti Node da preservare.
- Matrice ambienti/database con regole esplicite per `Development`, `Staging` e `Production`.
- Regole comuni di branch isolation, releasability, no commit/push non autorizzati e no fallback silenziosi.
- Piano comune `RED -> GREEN -> REFACTOR`, parity, coverage 100% e regression gates per tutte le subfasi successive.
- Matrice requisiti -> owner che assegna ogni requisito del porting a una sola subphase.

## Out of scope

- La creazione della solution `backend-csharp/` e delle astrazioni condivise, demandata a `Subphase 2`.
- L'implementazione di route, bootstrap runtime, launcher, staging e attivita' finali di chiusura del porting, demandata alle `Subphase 3`-`Subphase 11`.

## Dipendenze e precondizioni

- `docs/backend-csharp-porting-plan.md` deve essere allineato con `AGENTS.md`.
- Il branch di lavoro deve restare `porting-backend-c#`.
- La baseline Node deve essere verificabile con `npm run lint`, `npm run build` e `npm run test:coverage`.

## File/layer toccati

- Documentazione di governance del porting.
- Riferimenti in sola lettura a `backend/`, `app.js`, `server.js`, `.github/workflows/`, `start_fantaf1.command`, `scripts/save-local-check.mjs`, `scripts/ui-responsive-check.mjs`.

## Contratti e invarianti da preservare

- Nessuna subphase puo' modificare API pubbliche, shape dei payload, semantica dei cookie o business logic prima della parity verificata.
- Il repository deve restare releasable sul branch `porting-backend-c#`.
- Nessuna attivita' del porting puo' leggere o scrivere su `fantaf1` o `fantaf1_dev`.
- La collection runtime `appdatas` resta il nome compatibile da preservare, anche se `PROJECT.md` cita `appdata`.
- Ogni requisito trasversale va definito qui una sola volta e poi richiamato dalle subfasi successive senza duplicarlo in forma divergente.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: rilevare i vuoti documentali attuali, costruire la matrice requisiti -> owner e fissare la baseline Node da preservare.
- `GREEN`: documentare safety rails, contratti congelati, matrice ambienti/database, regole comuni di parity e coverage.
- `REFACTOR`: uniformare terminologia, eliminare sovrapposizioni e mantenere il piano canonico come unica source of truth.

## Coverage 100% totale

- La baseline ufficiale del repository deve restare al 100% per statements, branches, functions e lines.
- Nessuna subphase successiva puo' chiudersi se lo scope Node/React o lo scope C# introdotto scende sotto il 100%.
- Per questa subphase documentale non sono ammesse modifiche runtime che alterino la baseline di coverage.

## Piano di implementazione passo-passo

1. Congelare l'inventario di route, cookie, collection, invarianti di dominio e ambienti dal piano canonico.
2. Formalizzare il divieto di operare su `fantaf1` e `fantaf1_dev`, con `fantaf1_porting` come unico target locale mutabile e `fantaf1_staging` come target esterno di staging.
3. Formalizzare che ogni subphase deve lasciare il branch releasable, senza commit/push non autorizzati.
4. Materializzare nel piano canonico, sotto `## Subphase execution index`, la matrice requisiti -> owner che assegna ogni ambito del porting a una sola subphase.
5. Definire i gate comuni di parity, coverage 100%, regression test e browser verification da riusare nelle subfasi successive.

## Test da aggiungere o aggiornare

- Nessun nuovo test runtime: il deliverable di questa subphase e' documentale.
- Rieseguire l'intera baseline Node/React come prova che i safety rails non hanno toccato il comportamento applicativo.
- Aggiungere controlli strutturali documentali per verificare che ogni requisito del porting abbia un owner univoco.
- Verificare che la matrice requisito -> owner viva nel piano canonico e non in una source of truth concorrente.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: nessuna modifica runtime ammessa; confermare che la baseline resta invariata.
- Mobile admin/public in sviluppo: nessuna modifica runtime ammessa; confermare che la baseline resta invariata.
- Produzione-like locale: non applicabile in questa subphase, ma il requisito deve essere riportato come gate obbligatorio per le subfasi che espongono runtime C#.
- Staging: non applicabile in questa subphase, ma il gate staging-only resta obbligatorio per le subfasi operative che portano il backend in staging.

## Comandi di validazione da eseguire

- `find docs/backend-csharp-porting-subphases -maxdepth 1 -type f | sort`
- `rg -n "^# Subphase " docs/backend-csharp-porting-subphases`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`

## Criteri di completamento

- Tutti i requisiti del porting hanno un owner univoco.
- Tutti i safety rails comuni sono esplicitati senza conflitti con il piano canonico.
- La matrice requisito -> owner e' materializzata nel piano canonico e referenziata da questa subphase.
- La baseline Node/React resta verde e con coverage 100%.

## Blocchi / condizioni di stop

- Contraddizioni tra piano canonico, `AGENTS.md`, `PROJECT.md` e template migration.
- Impossibilita' di assegnare un owner esclusivo a un requisito del porting.
- Qualunque richiesta di toccare runtime, workflow o database reali in questa subphase.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali di esecuzione locale, da riportare esplicitamente con il comando fallito e il rischio residuo.
- Nessun rischio residuo funzionale e' accettabile per route, payload o database target.
