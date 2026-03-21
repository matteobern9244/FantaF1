# Track Specification: Backup Database Produzione (fantaf1)

## Obiettivo

L'obiettivo di questa track è mettere in sicurezza i dati reali di produzione
del progetto FantaF1 eseguendo un dump completo del database MongoDB Atlas
(`fantaf1`). Questo garantisce una polizza assicurativa prima di procedere con
il cutover verso il nuovo backend C#.

## Compliance Obbligatoria (AGENTS.md)

Trattandosi di un'operazione su dati di produzione ("Production-Safe Mindset"):

1. **Zero Mutation:** L'operazione deve essere rigorosamente read-only
   (`mongodump`).
2. **Secret Protection:** La stringa di connessione deve essere gestita in modo
   sicuro e non deve essere loggata o committata nel repository.
3. **Storage Security:** I file di backup devono essere salvati in una cartella
   esclusa dal controllo di versione (`.gitignore`).
4. **Validation:** Verificare l'integrità dei file generati (presenza di file
   BSON/JSON per ogni collection).

## Ambito Tecnico

### 1. Strumenti

- Utilizzo di `mongodump` (installato nella track precedente).

### 2. Esecuzione

- Target: Database `fantaf1` su cluster MongoDB Atlas.
- Output: Cartella `backups/fantaf1_YYYYMMDD_HHMMSS/` nella radice del progetto.

## Criteri di Accettazione

1.  Completamento del comando `mongodump` senza errori di rete o permessi.
2.  Presenza della cartella di backup con i dati di produzione.
3.  Verifica che la cartella `backups/` sia correttamente ignorata da Git.

## Out of Scope

- Restore del backup su altri database (salvo necessità di emergenza).
- Modifica dei dati esistenti.
