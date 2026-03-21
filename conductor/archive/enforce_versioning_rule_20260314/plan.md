# Implementation Plan: Enforce Versioning Discipline

## Obiettivo

Salvare e far rispettare la direttiva per cui ogni incremento di versione deve
includere il controllo e la modifica di `package.json`, `package-lock.json` e
file correlati (oltre a `CHANGELOG.md` e `README.md`). Questa direttiva verrà
salvata nella memoria globale (TOTALE) dell'assistente e propagata in tutti i
file di configurazione progetto pertinenti.

## Implementation Steps

### 1. Salvare in Memoria Globale

- **Azione**: Usare lo strumento `save_memory` per registrare la seguente regola
  a livello globale: "Quando aumenti la versione di un progetto, devi sempre
  controllare e aggiornare il file package.json, package-lock.json e tutti i
  file correlati, non solo il changelog."

### 2. Aggiornamento Documentazione di Progetto

- **Azione**: Aggiungere la direttiva ai file di istruzioni operative per gli
  agenti.
  - `AGENTS.md` (già aggiornato, controllerò per completezza).
  - `GEMINI.md` (già aggiornato, controllerò per completezza).
  - `PROJECT.md`: Aggiungere un vincolo forte sulle release per menzionare
    l'obbligo di coordinamento delle versioni.
  - `CLAUDE.md`: Assicurarsi che le istruzioni per gli agenti Claude richiamino
    questa regola.

### 3. Allineamento Registro Tracks

- **Azione**: Aggiornare `conductor/tracks.md` includendo questa nuova track e
  marcandola completata al termine dei lavori.

## Criteri di Accettazione

- Il comando `save_memory` ha restituito un successo.
- I file `PROJECT.md` e `CLAUDE.md` riportano esplicitamente la regola di
  aggiornamento dei `package.json`.
- La track è registrata nel framework Conductor.
