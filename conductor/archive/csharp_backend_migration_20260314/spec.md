# Specifica: Migrazione al Backend C#

## Panoramica

Questa traccia gestisce la rimozione completa del backend Node.js, passando a
usare il backend C# come unico backend ufficiale per FantaF1. Questo include il
mantenimento del frontend e dei file vitali dell'applicazione, garantendo la
piena funzionalità con il 100% di copertura dei test e zero regressioni sia in
locale che negli ambienti di staging/produzione (Render.com). Il processo sarà
graduale, mantenendo l'ambiente di staging per lo sviluppo.

## Requisiti Funzionali

- **Rimozione Backend Node.js:** Eliminare completamente tutto il codice, le
  dipendenze e le configurazioni del backend Node.js.
- **C# come Backend Ufficiale:** Promuovere il backend C# come backend primario
  per l'applicazione.
- **Transizione Database:**
  - Fornire uno script per automatizzare l'eliminazione del database locale
    `fantaf1_dev`.
  - Configurare l'ambiente di sviluppo locale per usare il database
    `fantaf1_staging`.
- **Deploy (comando "deploya"):**
  - Aggiornare il comando (o protocollo) locale `deploya` per allinearlo con il
    nuovo stack C#.
- **Deploy su Render.com:**
  - Documentare i passi manuali esatti necessari su Render.com prima di eseguire
    il merge di questo branch sul main (per allineare l'ambiente al nuovo stack
    tramite Docker Container).
  - Usare il `Dockerfile` esistente in `backend-csharp` per il deploy su Render.
- **Aggiornamento Pipeline CI/CD:**
  - Passare i test backend da Node.js/Vitest a `dotnet test`/Coverlet.
  - Aggiornare le action di deploy per puntare al servizio Docker C# su Render.
  - Pulire i passaggi CI specifici per Node.js (mantenendo solo quelli necessari
    per il frontend Vite).
- **Copertura Test:** Mantenere il 100% di test coverage senza regressioni.

## Requisiti Non Funzionali

- **Rilascio Graduale:** Assicurarsi che le modifiche siano suddivise passo dopo
  passo per una transizione sicura.
- **Nessuna Azione Non Richiesta:** Rispetto rigoroso del divieto di eseguire
  commit, push o merge sul branch attuale e sul branch `main` senza
  autorizzazione esplicita.
- **Documentazione:** Tutte le modifiche devono rispettare `AGENTS.md` e
  `PROJECT.md`.

## Fuori Ambito

- Modifiche alla logica delle feature del frontend, se non strettamente
  necessarie per interagire con le API del backend C#.
