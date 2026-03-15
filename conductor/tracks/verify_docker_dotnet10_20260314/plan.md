# Implementation Plan: Validazione Immagine Docker (.NET 10)

## Obiettivo
Confermare che la build del `backend-csharp/Dockerfile` per FantaF1 avvenga con successo in ambiente locale, utilizzando correttamente i layer di base `.NET 10` e che non ci siano regressioni relative al runtime quando l'applicazione viene deployata (su Render.com o simili).

## Pre-requisiti
- **Docker Desktop** deve essere completamente installato e in esecuzione sul sistema host (macOS arm64).
- Il comando `docker` deve essere disponibile nel `PATH` del terminale.

## Implementation Steps

### 1. Verifica dell'ambiente Docker
- **Azione:** Controllare che il demone Docker risponda correttamente e stampare le informazioni di base (architettura e versione).
- **Comandi:** `docker info`

### 2. Build dell'Immagine
- **Azione:** Eseguire la multi-stage build specificata nel `Dockerfile` del backend C#, che include sia la transpilazione del frontend React sia la build e il publish della solution `.NET 10`.
- **Comandi:** `docker build -t fantaf1-test -f backend-csharp/Dockerfile .`

### 3. (Opzionale) Smoke Test di Avvio
- **Azione:** Eseguire temporaneamente il container appena compilato per assicurarsi che il server Kestrel si avvii senza crashare sulla porta 3001 e risponda all'endpoint di health check.
- **Comandi:**
  - `docker run -d -p 3001:3001 --name fantaf1_smoke_test fantaf1-test`
  - Attendere qualche secondo.
  - `curl -f http://127.0.0.1:3001/api/health || echo "Fail"`
  - Pulire il container: `docker rm -f fantaf1_smoke_test`

## Criteri di Accettazione
- `docker build` si conclude senza alcun errore.
- (Se testato) Il container esegue correttamente il boot dimostrando che il runtime .NET 10 è stabile sull'immagine `aspnet:10.0-alpine`.
