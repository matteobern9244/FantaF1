@echo off
setlocal enabledelayedexpansion

echo ==^> Inizializzazione ambiente Windows

set NODE_ENV=development
if "%FANTAF1_LOCAL_RUNTIME%"=="" (
    set FANTAF1_LOCAL_RUNTIME=csharp-dev
)

if not exist ".env" (
    echo ==^> ERRORE: File .env non trovato.
    echo Assicurati di aver configurato l'ambiente partendo da .env.example.
    echo Puoi farlo eseguendo: copy .env.example .env
    exit /b 1
)

echo ==^> Verifico MongoDB
for /f "tokens=2 delays==" %%a in ('findstr "^MONGODB_URI=" .env') do set MONGODB_URI=%%a

if "%MONGODB_URI%"=="" (
    echo ERRORE: MONGODB_URI non trovata nel file .env.
    exit /b 1
)

node -e "import { MongoClient } from 'mongodb'; const uri = process.env.MONGODB_URI; const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }); try { await client.connect(); process.exit(0); } catch (err) { console.error(err.message); process.exit(1); }" --input-type=module
if %ERRORLEVEL% neq 0 (
    echo ERRORE: Impossibile connettersi a MongoDB.
    echo Verifica la tua connessione internet e le credenziali in .env.
    exit /b 1
)
echo MongoDB e' attivo e raggiungibile.

echo ==^> Build Backend
dotnet build backend-csharp/FantaF1.Backend.sln -c Release
if %ERRORLEVEL% neq 0 (
    echo ERRORE: Build del backend fallita.
    exit /b 1
)

echo ==^> Build Frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERRORE: Build del frontend fallita.
    exit /b 1
)

echo ==^> Avvio applicazione
node ./scripts/dev-launcher.mjs
