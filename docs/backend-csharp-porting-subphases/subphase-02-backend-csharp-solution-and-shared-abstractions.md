# Subphase 2 - Backend C# solution and shared abstractions

Invocazione canonica: `Subphase 2`

## Scopo della subphase

- Introdurre la solution `backend-csharp/` con struttura `Api/Application/Domain/Infrastructure/tests`.
- Definire le astrazioni condivise e il wiring DI minimo senza migrare ancora route complete.

## Source of truth e runtime autorevole

- Il runtime autorevole resta Node fino alla parity approvata; il backend C# introdotto qui non sostituisce ancora il percorso Node in nessun ambiente utente.
- Restano vincolanti `AGENTS.md`, `PROJECT.md`, `docs/backend-csharp-porting-plan.md` e tutte le sezioni-principio di `guide-porting-c#/AGENTS_migration_template.md`.
- Questa subphase puo' introdurre solo il minimo necessario per compilare, testare e ospitare slice successive del backend C#.

## In scope

- Creazione di `backend-csharp/FantaF1.Backend.sln`.
- Creazione dei progetti `src/FantaF1.Api`, `src/FantaF1.Application`, `src/FantaF1.Domain`, `src/FantaF1.Infrastructure`.
- Creazione dei progetti test `tests/FantaF1.Tests.Unit`, `tests/FantaF1.Tests.Integration`, `tests/FantaF1.Tests.Contract`.
- Definizione delle interfacce condivise indicate dal piano canonico, inclusi repository, servizi applicativi, `IClock` e `ISignedCookieService`.
- Wiring DI minimo e bootstrap compilabile.
- Definizione dei comandi standard `dotnet restore`, `dotnet build`, `dotnet test` e coverage per la solution.

## Out of scope

- Qualunque route completa, demandata a `Subphase 3`-`Subphase 7`.
- Bootstrap runtime completo, static hosting React e background sync, demandati a `Subphase 8`.
- Launcher, script di verifica, Docker, staging e attivita' finali di chiusura del porting, demandati a `Subphase 9`-`Subphase 11`.

## Dipendenze e precondizioni

- `Subphase 1` completata e baseline Node congelata.
- .NET SDK disponibile localmente come dichiarato nel piano canonico.
- Nessun commit/push autorizzato automaticamente.

## File/layer toccati

- `backend-csharp/`
- `backend-csharp/src/FantaF1.Api`
- `backend-csharp/src/FantaF1.Application`
- `backend-csharp/src/FantaF1.Domain`
- `backend-csharp/src/FantaF1.Infrastructure`
- `backend-csharp/tests/*`

## Contratti e invarianti da preservare

- Nessuna route `/api/*` deve cambiare comportamento per gli utenti finali in questa subphase.
- Le astrazioni C# devono riflettere i seam reali del porting, senza indirection speculative.
- Il repository deve restare releasable sul branch `porting-backend-c#`, senza commit/push non autorizzati e senza usare `fantaf1` o `fantaf1_dev`.
- Le dipendenze runtime devono essere iniettate; niente hidden collaborator graphs o istanziazioni diffuse.

## Piano TDD esplicito RED -> GREEN -> REFACTOR

- `RED`: aggiungere test che falliscono per solution assente, progetti assenti, DI non risolvibile e astrazioni mancanti.
- `GREEN`: creare solution, progetti, riferimenti, interfacce e wiring minimo fino al verde di build e test.
- `REFACTOR`: ripulire naming, package references e separazione dei layer senza introdurre route o comportamento non richiesto.

## Coverage 100% totale

- Lo scope Node/React deve rimanere al 100%.
- Tutti i file C# introdotti in questa subphase devono essere coperti al 100% da unit/integration/contract tests.
- Il comando di coverage C# standardizzato in questa subphase diventa obbligatorio per tutte le subfasi successive.

## Piano di implementazione passo-passo

1. Creare `backend-csharp/FantaF1.Backend.sln` e i progetti `Api/Application/Domain/Infrastructure/tests`.
2. Configurare i riferimenti tra progetti in modo che `Domain` non dipenda da layer superiori.
3. Introdurre le interfacce condivise del piano canonico: repository, servizi applicativi, `IClock`, `ISignedCookieService`.
4. Configurare un bootstrap DI minimo in `FantaF1.Api` che compili e si avvii senza esporre ancora slice complete.
5. Definire i comandi standard della solution:
   - `dotnet restore backend-csharp/FantaF1.Backend.sln`
   - `dotnet build backend-csharp/FantaF1.Backend.sln -c Release`
   - `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
   - `dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`

## Test da aggiungere o aggiornare

- Unit test per risoluzione DI e regole di dipendenza tra layer.
- Contract test per le interfacce condivise introdotte.
- Integration test di bootstrap dell'host C# senza route migrate.
- Riesecuzione della baseline Node/React per garantire zero regressioni.

## Verifiche browser e responsive

- Desktop admin/public in sviluppo: `npm run test:ui-responsive` contro il runtime Node baseline resta obbligatorio.
- Mobile admin/public in sviluppo: lo stesso `npm run test:ui-responsive` resta obbligatorio sul baseline Node.
- Produzione-like locale: non applicabile come gate di chiusura di questa subphase; il riuso condiviso del responsive check resta demandato a `Subphase 9`.
- Staging: non applicabile in questa subphase.

## Comandi di validazione da eseguire

- `dotnet restore backend-csharp/FantaF1.Backend.sln`
- `dotnet build backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:coverage`
- `npm run test:ui-responsive`

## Criteri di completamento

- La solution C# compila e testa in modo deterministico.
- Tutte le astrazioni condivise richieste dal piano canonico esistono.
- Non esistono ancora route migrate oltre al minimo strettamente necessario al bootstrap.
- Il browser gate baseline Node in `development` resta verde tramite `npm run test:ui-responsive`.
- Il browser gate locale `production-like` non blocca la chiusura di `Subphase 2` e resta demandato a `Subphase 9`.
- Coverage 100% su Node/React e su tutto lo scope C# introdotto.

## Blocchi / condizioni di stop

- Necessita' di introdurre route complete o comportamento utente per far compilare la solution.
- Violazione della separazione dei layer o dipendenze circolari.
- Impossibilita' di far passare build e coverage della solution.

## Rischi residui ammessi se una validazione non e' eseguibile

- Solo limiti ambientali espliciti sulla toolchain .NET locale, da riportare con il comando fallito.
- Nessun rischio residuo e' ammesso su contratti pubblici, che non devono ancora cambiare.
