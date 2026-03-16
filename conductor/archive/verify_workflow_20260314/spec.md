# Track Specification: Verifica Integrità Workflow

## Obiettivo
L'obiettivo è verificare che l'attuale progetto FantaF1 (v1.4.4) aderisca ai nuovi standard del workflow Conductor, assicurando specificamente la copertura test al 100% e il corretto funzionamento del launcher canonico.

## Criteri di Accettazione
1.  Tutti i test passano (`npm run test`).
2.  La copertura totale è al 100% per statements, functions, branches e lines.
3.  Il launcher canonico `./start_fantaf1.command` completa con successo i suoi controlli preflight.
4.  Nessuna regressione riscontrata nelle viste desktop o mobile (`check viste`).
5.  Il backend C# mantiene la copertura del 100% sullo scope configurato.
