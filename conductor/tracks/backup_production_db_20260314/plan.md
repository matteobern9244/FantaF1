# Implementation Plan: Backup Database Produzione (fantaf1)

Questa track esegue il dump di sicurezza del database reale. L'integrità del backup verrà verificata post-esecuzione.

## Fase 1: Preflight e Sicurezza Workspace
**Obiettivo:** Preparare l'ambiente locale per ospitare i dati senza rischi di commit accidentali.

- [ ] Task: Verifica .gitignore (RED/GREEN)
    - [ ] Controllare se la cartella `backups/` è già presente nel `.gitignore`.
    - [ ] In caso negativo, aggiungerla immediatamente.
- [ ] Task: Creazione Directory Backup (GREEN)
    - [ ] Creare la cartella `backups/` se non esiste.
- [ ] Task: Conductor - User Manual Verification 'Fase 1' (Protocollo in workflow.md)

## Fase 2: Esecuzione Dump
**Obiettivo:** Estrarre i dati da MongoDB Atlas.

- [ ] Task: Recupero URI Produzione (Interactive)
    - [ ] Richiedere all'utente la conferma dell'URI per il database `fantaf1`.
- [ ] Task: Esecuzione mongodump (GREEN)
    - [ ] Lanciare il comando `mongodump` con l'URI fornita e output verso una sottocartella datata.
- [ ] Task: Conductor - User Manual Verification 'Fase 2' (Protocollo in workflow.md)

## Fase 3: Verifica Integrità Backup
**Obiettivo:** Assicurarsi che il backup sia utilizzabile.

- [ ] Task: Analisi Contenuto
    - [ ] Elencare i file generati per confermare la presenza di tutte le collection (appdatas, weekends, etc.).
- [ ] Task: Conductor - User Manual Verification 'Fase 3' (Protocollo in workflow.md)
