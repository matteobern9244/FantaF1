# Guida alla Migrazione Render.com (da Node.js a C# Docker)

Per allineare l'ambiente di Render.com al nuovo stack basato su C# e Docker prima del merge su `main`, seguire questi passaggi:

## 1. Configurazione del Servizio Web (Staging/Produzione)
Assicurarsi che il servizio su Render sia configurato per utilizzare Docker.

- **Runtime:** Docker
- **Docker Command:** (Lasciare vuoto se definito nel Dockerfile)
- **Docker Context:** `backend-csharp` (o la root se il Dockerfile gestisce i percorsi relativi)
- **Dockerfile Path:** `./backend-csharp/Dockerfile`

## 2. Variabili d'Ambiente
Verificare e aggiornare le seguenti variabili d'Ambiente su Render:

- `ASPNETCORE_ENVIRONMENT`: `Staging` (o `Production`)
- `ConnectionStrings__MongoDb`: Assicurarsi che punti al database corretto (es. `fantaf1_staging`)
- `JWT_SECRET`: (Se usato per l'autenticazione nel nuovo backend)
- `ADMIN_PASSWORD`: (Se necessario per le credenziali admin)
- `PORT`: `8080` (O la porta esposta dal container Docker)

## 3. Build e Deploy
- Una volta completate le modifiche ai file CI/CD in questo branch, il push su Render dovrebbe innescare automaticamente la build Docker.
- Monitorare i log di build per assicurarsi che il restore dei pacchetti NuGet e la pubblicazione avvengano correttamente.

## 4. Verifica Post-Deploy
- Accedere all'URL del servizio di staging.
- Verificare che il frontend carichi i dati chiamando le nuove API C#.
- Controllare i log di Render per eventuali errori di connessione al database MongoDB.
