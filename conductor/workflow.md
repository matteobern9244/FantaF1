# FantaF1 Development Workflow

Questo documento definisce il workflow operativo per il progetto FantaF1,
integrando gli standard di `AGENTS.md` e `PROJECT.md`.

## 1. Principi Fondamentali

- **Correctness First:** Mai sacrificare la stabilità o la correttezza per la
  velocità.
- **Strict TDD:** Ogni modifica comportamentale deve seguire il ciclo **RED ->
  GREEN -> REFACTOR**.
- **100% Coverage:** La copertura dei test deve essere mantenuta al 100%
  (Statements, Functions, Branches, Lines) per tutto lo scope dell'applicazione.
- **Production-Safe:** Ogni cambiamento deve essere deterministico, testato e
  sicuro per i dati di produzione.
- **Compliance AGENTS.md:** Tutti i task devono includere e rispettare
  rigorosamente le specifiche di `AGENTS.md`, specialmente quelle tecniche e di
  programmazione.
- **Politica di Chiarimento:** Se una logica di business, un requisito o un
  flusso di dati non è chiaro, l'agente deve fermarsi e chiedere SEMPRE
  chiarimenti all'utente prima di procedere.

## 2. Flusso di Lavoro per i Task

Per ogni task, l'agente deve:

1.  **Analisi:** Dichiarare l'obiettivo, identificare i file impattati e i
    rischi (regresso desktop/mobile).
2.  **Piano:** Documentare la strategia TDD, i principi di design applicati e i
    comandi di validazione.
3.  **Implementazione TDD:**
    - **RED:** Creare test che riproducano il bug o definiscano la nuova
      feature.
    - **GREEN:** Implementare il codice minimo per far passare i test.
    - **REFACTOR:** Pulire il codice mantenendo i test verdi e la copertura al
      100%.
4.  **Validazione:**
    - Eseguire `compliance-audit-orchestrator` per verificare l'aderenza ai
      principi di ingegneria (TDD, DI, UoW, Repository Pattern).
    - Eseguire `npm run lint`, `npm run test`, `npm run test:ui-responsive` (o
      il comando `check viste`).
    - Eseguire `npm run build` e il launcher locale per i finti test di fumo.

## 5. Comandi e Strumenti Canonici

- **Avvio App:** Utilizzare sempre `./start_fantaf1.command` (o
  `start_fantaf1.bat` su Windows).
- **Verifica UI:** Il comando `check viste` esegue `npm run test:ui-responsive`
  per validare i breakpoint desktop/mobile.
- **Backend C#:** C# (.NET 10) è l'implementazione autoritativa e l'unica
  supportata.
- **Smoke Test:** Utilizzare `npm run test:save-local` per verificare
  l'integrità della persistenza.
- **Deploy Staging:** Il comando `deploya-staging` avvia il protocollo a 23
  punti per il merge da `develop` a `staging`.
- **Deploy Produzione:** Il comando `deploya` avvia il protocollo a 23 punti per
  il merge da `staging` a `main`.

## 4. Gestione Git e Commit

- **Nessun Commit Automatico:** I commit e i push devono essere autorizzati
  esplicitamente dall'utente.
- **Riepiloghi:** I riepiloghi dei task completati devono essere registrati nei
  metadati dei **Git Notes**.
- **Messaggi di Commit:** Devono essere accurati, in inglese e focalizzati sul
  "perché" oltre che sul "cosa".
- **Branch Protetti:** `main` e `staging` sono branch protetti. Le modifiche
  devono passare tramite Pull Request, approvazione e superamento dei controlli
  CI.

## 5. Protocollo di Deployment ("deploya" e "deploya-staging")

Quando l'utente autorizza esplicitamente il deploy (comandi `deploya` o
`deploya-staging`), seguire questa sequenza:

1.  Verifica stato repository (nessun file non stageato).
2.  Incremento versione applicativa.
3.  Aggiornamento `README.md` e `CHANGELOG.md`.
4.  Esecuzione completa di test, lint, build e validazione UI.
5.  Commit e Push su branch di lavoro.
6.  Creazione Pull Request verso il branch target (`main` o `staging`) con
    auto-merge abilitato.
    - La descrizione della PR deve essere idonea, specifica e coerente con il
      lavoro realmente svolto nel branch.
    - `matteobern9244` deve essere impostato come assignee della PR.
    - Le label della PR devono riflettere esclusivamente il lavoro
      effettivamente svolto, senza categorie speculative o non pertinenti.
7.  Solo per `deploya`, dopo il merge riuscito verso `main`, leggere lo SHA
    finale di `main`, abbassare temporaneamente la protection di `staging`,
    riallineare `staging` e `develop` allo SHA finale di `main` e ripristinare
    subito la protection originaria di `staging`.
8.  Creazione Tag e GitHub Release solo dopo il merge avvenuto con successo e il
    riallineamento finale dei branch richiesto da `deploya`.

## 6. Sicurezza e Privacy

- **Segreti:** Nessuna credenziale o API key in chiaro deve essere presente nei
  file versionati.
- **Dati di Produzione:** Operare con la massima cautela sui flussi di scoring,
  proiezioni e sincronizzazione risultati.
