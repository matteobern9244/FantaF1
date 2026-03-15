# Implementation Plan: Risoluzione Errore "Killed" e Setup .NET 10 (Locale, Docker, CI/CD)

## Obiettivo
Risolvere il blocco critico su macOS (`zsh: killed dotnet --list-sdks`), garantendo un'installazione pulita e funzionante di .NET 10 SDK nativo per Apple Silicon (arm64). Assicurare, inoltre, che l'intero ecosistema del progetto (host locale, Docker/Render.com e CI/CD su GitHub Actions) sia configurato per utilizzare uniformemente .NET 10, senza regressioni.

## Analisi del Problema "zsh: killed dotnet"
L'errore `Killed: 9` su macOS Apple Silicon si verifica tipicamente in due casi:
1. **Architettura errata (x64 su arm64):** Si è tentato di eseguire un binario Intel senza avere Rosetta 2 installato o funzionante.
2. **Blocco Gatekeeper (Quarantine):** Il binario è stato scaricato da script senza firma/notarizzazione riconosciuta e macOS ne forza la chiusura per sicurezza.

Essendo su architettura arm64 ed avendo concordato una pulizia totale, il piano procederà con l'eliminazione dei vecchi binari corrotti/bloccati e con l'installazione nativa pulita.

## Implementation Steps

### 1. Pulizia Totale Ambiente Locale (macOS arm64)
- **Azione:** Rimuovere qualsiasi traccia delle precedenti installazioni di .NET corrotte o di architettura errata.
- **Comandi previsti:** 
  - `sudo rm -rf /usr/local/share/dotnet`
  - `rm -rf ~/.dotnet`
  - Rimozione di link simbolici eventuali (es. in `/usr/local/bin/dotnet`).

### 2. Installazione .NET 10 SDK (Native arm64)
- **Azione:** Installare la versione corretta di .NET 10 per Apple Silicon.
- **Metodo:** Scaricheremo ed estrarremo la build nativa `arm64` per macOS, oppure useremo lo script `dotnet-install.sh` forzando l'architettura `-Architecture arm64` e rimuovendo gli attributi di quarantena di Gatekeeper.
- **Verifica:** 
  - Eseguire `xattr -c $(which dotnet)` per sicurezza.
  - Eseguire `dotnet --info` per confermare che l'architettura riportata sia `arm64` e la versione sia `10.0.xxx`.

### 3. Validazione Compilazione Locale
- **Azione:** Verificare che il codice del progetto compili correttamente con il nuovo SDK.
- **Verifica:** Eseguire `dotnet build backend-csharp/FantaF1.Backend.sln`.

### 4. Validazione Docker e Deploy (Render.com)
- **Azione:** Confermare il comportamento dell'immagine Docker. Il file `backend-csharp/Dockerfile` usa già `10.0-alpine`, ma ne testeremo l'integrità.
- **Verifica:** Eseguire una build locale `docker build -t fantaf1-test -f backend-csharp/Dockerfile .` per assicurarsi che l'app venga impacchettata senza errori e confermare che la produzione (Render.com) non avrà regressioni.

### 5. Aggiornamento CI/CD GitHub Actions
- **Azione:** Integrare .NET 10 nei workflow di CI/CD.
- **Metodo:** Modificare `.github/workflows/pr-ci.yml` (e altri se necessari) per includere lo step `actions/setup-dotnet@v4` con `dotnet-version: '10.0.x'`.
- **Verifica:** L'integrazione garantirà che GitHub Actions certifichi la correttezza del codice C# usando .NET 10 in ambiente isolato.

## Acceptance Criteria
- Il comando `dotnet --list-sdks` restituisce la lista senza errori (nessun `zsh: killed`).
- La compilazione C# locale avviene con successo.
- Docker build completa senza problemi utilizzando i container base .NET 10.
- Workflow CI/CD aggiornato e funzionante per .NET 10.
