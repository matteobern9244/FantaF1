#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

export NODE_ENV=development
export FANTAF1_LOCAL_RUNTIME="${FANTAF1_LOCAL_RUNTIME:-csharp-dev}"

readonly APP_TITLE="Fanta Formula 1"
readonly STARTUP_TIMEOUT_SECONDS=45
readonly SHUTDOWN_TIMEOUT_SECONDS=15

backend_pid=""
frontend_pid=""
backend_log=""
frontend_log=""
current_step="inizializzazione"

show_popup() {
  local message="$1"
  local escaped_message="${message//\"/\\\"}"

  /usr/bin/osascript -e "display alert \"$APP_TITLE\" message \"$escaped_message\"" \
    >/dev/null 2>&1 || true
}

run_step() {
  local title="$1"
  shift

  current_step="$title"
  echo
  echo "==> $title"
  "$@"
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local pid="$3"
  local deadline=$((SECONDS + STARTUP_TIMEOUT_SECONDS))

  while (( SECONDS < deadline )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
      echo "Il processo $label si e' fermato prima di rispondere su $url." >&2
      return 1
    fi

    sleep 1
  done

  echo "Timeout durante l'attesa di $label su $url." >&2
  return 1
}

stop_process() {
  local pid="$1"

  if [[ -z "$pid" ]]; then
    return
  fi

  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
}

cleanup_preflight() {
  stop_process "$frontend_pid"
  stop_process "$backend_pid"
  frontend_pid=""
  backend_pid=""
}

on_error() {
  local exit_code=$?

  cleanup_preflight

  if (( exit_code != 0 )); then
    local message="Controlli pre-avvio falliti durante: $current_step. Consulta l'output del terminale per i dettagli."
    echo "$message" >&2
    if [[ -n "$backend_log" ]]; then
      echo "Log backend preflight: $backend_log" >&2
    fi
    if [[ -n "$frontend_log" ]]; then
      echo "Log frontend preflight: $frontend_log" >&2
    fi
    show_popup "$message"
  fi

  exit "$exit_code"
}

trap on_error ERR INT TERM

check_mongodb() {
  echo "==> Verifico dipendenze: MongoDB"
  local uri
  uri=$(grep "^MONGODB_URI=" .env | cut -d'=' -f2- | tr -d '\r')
  
  if [[ -z "$uri" ]]; then
    echo "ERRORE: MONGODB_URI non trovata nel file .env." >&2
    return 1
  fi

  echo "Tentativo di connessione a MongoDB..."
  if ! node -e "
    import { MongoClient } from 'mongodb';
    const uri = '$uri';
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
      await client.connect();
      process.exit(0);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  " --input-type=module; then
    echo "ERRORE: Impossibile connettersi a MongoDB." >&2
    echo "Verifica la tua connessione internet e le credenziali in .env." >&2
    return 1
  fi
  echo "MongoDB e' attivo e raggiungibile."
}

if [[ ! -f ".env" ]]; then
  echo "==> ERRORE: File .env non trovato." >&2
  echo "Assicurati di aver configurato l'ambiente partendo da .env.example." >&2
  echo "Puoi farlo eseguendo: cp .env.example .env" >&2
  exit 1
fi

run_step "Verifico MongoDB" check_mongodb
run_step "Build Backend" dotnet build backend-csharp/FantaF1.Backend.sln -c Release
run_step "Build Frontend" npm run build  
#run_step "Eseguo validazione UI responsive" npm run test:ui-responsive

backend_log="$(mktemp -t fantaf1-preflight-backend.XXXXXX.log)"
frontend_log="$(mktemp -t fantaf1-preflight-frontend.XXXXXX.log)"

echo
echo "==> Avvio applicazione"
current_step="avvio applicazione"
trap - ERR INT TERM
exec node ./scripts/dev-launcher.mjs
