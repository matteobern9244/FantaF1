# Track Specification: Ripristino Dati Produzione su Staging

## Obiettivo

L'obiettivo di questa track è popolare il database di staging
(`fantaf1_staging`) con i dati reali estratti dal backup di produzione. Questo
permetterà di testare il nuovo backend C# con uno stato realistico prima del
cutover finale.

## Compliance Obbligatoria (AGENTS.md)

1. **Safety First:** Verificare attentamente le URI prima dell'esecuzione per
   garantire che l'operazione di restore colpisca _esclusivamente_ il database
   di staging e MAI quello di produzione.
2. **Data Integrity:** Utilizzare l'opzione `--drop` per garantire che lo
   staging diventi una copia speculare (1:1) della produzione al momento del
   dump.
3. **Secret Protection:** Non loggare o committare credenziali o URI.

## Ambito Tecnico

### 1. Strumenti

- Utilizzo di `mongorestore` (installato tramite Homebrew).

### 2. Esecuzione

- **Sorgente:** Cartella di backup locale più recente (es.
  `backups/fantaf1_YYYYMMDD_HHMMSS/fantaf1`).
- **Destinazione:** Database MongoDB Atlas `fantaf1_staging`.
- **Comando:** `mongorestore --uri="<STAGING_URI>" --drop <percorso_backup>`

## Criteri di Accettazione

1.  Il comando `mongorestore` viene completato senza errori.
2.  I dati nello staging corrispondono esattamente a quelli del backup.
3.  L'applicazione di staging (`https://fantaf1-staging.onrender.com`)
    visualizza i dati reali storici.

## Out of Scope

- Ripristino sul database di sviluppo locale o produzione.
- Modifica del codice applicativo.
