# Implementation Plan: Ripristino Dati Produzione su Staging

Questa track esegue il restore del dump di sicurezza sul database di staging per test.

## Fase 1: Preflight e Identificazione Backup
**Obiettivo:** Identificare il dump corretto da ripristinare.

- [ ] Task: Trovare l'ultimo backup (GREEN)
    - [ ] Identificare la sottocartella in `backups/` più recente contenente i dati di `fantaf1`.
- [ ] Task: Conductor - User Manual Verification 'Fase 1' (Protocollo in workflow.md)

## Fase 2: Esecuzione Restore
**Obiettivo:** Trasferire i dati sul database `fantaf1_staging` usando l'opzione `--drop`.

- [ ] Task: Esecuzione mongorestore (GREEN)
    - [ ] Lanciare `mongorestore` con l'URI di staging e il path del backup identificato.
    - [ ] Aggiungere il flag `--drop` per pulire le collection di staging prima dell'inserimento.
- [ ] Task: Conductor - User Manual Verification 'Fase 2' (Protocollo in workflow.md)

## Fase 3: Verifica Funzionale post-Restore
**Obiettivo:** Assicurarsi che i dati ripristinati siano visualizzabili nell'app di staging.

- [ ] Task: Lettura API
    - [ ] Eseguire `curl` verso `https://fantaf1-staging.onrender.com/api/data` per confermare la presenza dello storico.
- [ ] Task: Conductor - User Manual Verification 'Fase 3' (Protocollo in workflow.md)
