# Guida Render Staging C# Docker

Questa guida descrive il deploy staging reale del branch C# corrente. Non implica che `main` sia gia' pronto al cutover: finche' `main` resta sulla struttura legacy, lo staging Render serve solo come ambiente di certificazione esterna del branch in test.

## 1. Configurazione del servizio web

Il servizio Render staging deve usare Docker con i percorsi reali del repository:

- **Runtime:** Docker
- **Docker Context:** root del repository
- **Dockerfile Path:** `./Dockerfile`
- **Health check path:** `/api/health`

Il `Dockerfile` root costruisce il frontend Vite, pubblica l'API ASP.NET Core e serve frontend + API dallo stesso origin.

## 2. Variabili d'ambiente richieste

Per lo staging attuale le variabili corrette sono:

- `ASPNETCORE_ENVIRONMENT=Staging`
- `ADMIN_SESSION_SECRET=<secret staging-only>`
- `MONGODB_URI=<uri staging-only verso fantaf1_staging>`
- `Frontend__BuildPath=./dist`
- `PORT=3001`

Non sono richiesti `ConnectionStrings__MongoDb`, `JWT_SECRET` o `ADMIN_PASSWORD` per il runtime C# attuale.

## 3. Checklist di deploy

Prima di considerare valido il deploy staging:

1. Verificare che il build Docker usi il `Dockerfile` root senza path legacy.
2. Verificare che l'health endpoint risponda su `/api/health`.
3. Verificare `GET /api/session`, `POST /api/admin/session`, `POST /api/data` e `POST /api/predictions`.
4. Verificare che il cookie admin venga emesso e riusato in `Staging`.
5. Verificare desktop/mobile admin/public sul servizio staging.

## 4. Nota sul cutover

Lo staging Render e' il gate esterno della migrazione C# su `develop`. Il comando speciale `deploya` resta non attivabile finche' `main` non rappresenta davvero lo stack rilasciabile.
