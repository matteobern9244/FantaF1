# FantaF1 Development Workflow

Questo documento definisce il workflow operativo per il progetto FantaF1, integrando gli standard di `AGENTS.md` e `PROJECT.md`.

## 1. Principi Fondamentali
- **Correctness First:** Mai sacrificare la stabilità o la correttezza per la velocità.
- **Strict TDD:** Ogni modifica comportamentale deve seguire il ciclo **RED -> GREEN -> REFACTOR**.
- **100% Coverage:** La copertura dei test deve essere mantenuta al 100% (Statements, Functions, Branches, Lines) per tutto lo scope dell'applicazione.
- **Production-Safe:** Ogni cambiamento deve essere deterministico, testato e sicuro per i dati di produzione.

## 2. Flusso di Lavoro per i Task
Per ogni task, l'agente deve:
1.  **Analisi:** Dichiarare l'obiettivo, identificare i file impattati e i rischi (regresso desktop/mobile).
2.  **Piano:** Documentare la strategia TDD, i principi di design applicati e i comandi di validazione.
3.  **Implementazione TDD:**
    -   **RED:** Creare test che riproducano il bug o definiscano la nuova feature.
    -   **GREEN:** Implementare il codice minimo per far passare i test.
    -   **REFACTOR:** Pulire il codice mantenendo i test verdi e la copertura al 100%.
4.  **Validazione:** Eseguire `npm run lint`, `npm run test`, `npm run build` e il launcher locale.

## 3. Comandi e Strumenti Canonici
- **Avvio App:** Utilizzare sempre `./start_fantaf1.command` (non `npm run start:local`).
- **Verifica UI:** Il comando `check viste` esegue `npm run test:ui-responsive` per validare i breakpoint desktop/mobile.
- **Backend Porting:** Node.js è l'implementazione autoritativa fino al cutover ufficiale verso C#.
- **Smoke Test:** Utilizzare `npm run test:save-local` per verificare l'integrità della persistenza.

## 4. Gestione Git e Commit
- **Nessun Commit Automatico:** I commit e i push devono essere autorizzati esplicitamente dall'utente.
- **Riepiloghi:** I riepiloghi dei task completati devono essere registrati nei metadati dei **Git Notes**.
- **Messaggi di Commit:** Devono essere accurati, in inglese e focalizzati sul "perché" oltre che sul "cosa".

## 5. Protocollo di Deployment ("deploya")
Quando l'utente autorizza esplicitamente il deploy (comando `deploya`), seguire questa sequenza:
1.  Verifica stato repository (nessun file non stageato).
2.  Incremento versione applicativa.
3.  Aggiornamento `README.md` e `CHANGELOG.md`.
4.  Esecuzione completa di test, lint, build e validazione UI.
5.  Commit e Push su branch di lavoro.
6.  Creazione Pull Request verso `main` con auto-merge abilitato.
7.  Creazione Tag e GitHub Release solo dopo il merge avvenuto con successo.

## 6. Sicurezza e Privacy
- **Segreti:** Nessuna credenziale o API key in chiaro deve essere presente nei file versionati.
- **Dati di Produzione:** Operare con la massima cautela sui flussi di scoring, proiezioni e sincronizzazione risultati.
