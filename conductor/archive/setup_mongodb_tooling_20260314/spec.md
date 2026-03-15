# Track Specification: Setup Tooling MongoDB

## Obiettivo
L'obiettivo di questa track è installare sulla macchina locale gli strumenti necessari per la gestione professionale dei database MongoDB (Atlas). Questo include i tool di dump/restore e la shell interattiva.

## Compliance Obbligatoria (AGENTS.md)
Nonostante si tratti di un task sistemistico (Chore), si applicano i principi di:
1. **Verification First:** Verificare la presenza dei requisiti (Homebrew) e lo stato precedente del sistema.
2. **Minimal Impact:** Non alterare configurazioni di sistema oltre il necessario.
3. **Validation:** Verificare il corretto funzionamento di ogni comando installato tramite `--version`.
4. **Politica di Chiarimento:** In caso di errori durante l'installazione di Homebrew o conflitti di permessi, fermarsi e chiedere all'utente.

## Ambito Tecnico
### 1. Requisiti
- Presenza di `brew` (Homebrew) nel PATH di sistema.

### 2. Installazioni (via Homebrew)
- `mongodb-database-tools`: Suite di utility per backup, esportazione e diagnostica (`mongodump`, `mongorestore`, `mongoexport`, `mongoimport`).
- `mongosh`: La shell moderna per interagire con MongoDB via CLI.

## Criteri di Accettazione
1.  Il comando `mongodump --version` restituisce un output valido.
2.  Il comando `mongosh --version` restituisce un output valido.
3.  Gli strumenti sono pronti per essere utilizzati nella successiva fase di backup.

## Out of Scope
- Esecuzione effettiva di backup o restore (demandata a track successive).
- Configurazione di utenti o permessi su MongoDB Atlas.
