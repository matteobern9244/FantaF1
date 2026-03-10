#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

export NODE_ENV=development

readonly APP_TITLE="Fanta Formula 1"
readonly BACKEND_HEALTH_URL="http://127.0.0.1:3001/api/health"
readonly FRONTEND_URL="http://127.0.0.1:5173"
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

is_port_busy() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

ensure_port_free() {
  local port="$1"
  local label="$2"

  if is_port_busy "$port"; then
    local message="La porta $port e' gia in uso. Chiudi il processo esistente prima del controllo $label."
    echo "$message" >&2
    show_popup "$message"
    exit 1
  fi
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

wait_for_port_free() {
  local port="$1"
  local label="$2"
  local deadline=$((SECONDS + SHUTDOWN_TIMEOUT_SECONDS))

  while (( SECONDS < deadline )); do
    if ! is_port_busy "$port"; then
      return 0
    fi

    sleep 1
  done

  echo "La porta $port non si e' liberata dopo la chiusura di $label." >&2
  return 1
}

cleanup_preflight() {
  stop_process "$frontend_pid"
  stop_process "$backend_pid"
  frontend_pid=""
  backend_pid=""

  wait_for_port_free 5173 "frontend preflight" || true
  wait_for_port_free 3001 "backend preflight" || true
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

run_step "Eseguo lint" npm run lint
run_step "Eseguo test" npm run test
run_step "Eseguo build" npm run build

ensure_port_free 3001 "backend preflight"
ensure_port_free 5173 "frontend preflight"

backend_log="$(mktemp -t fantaf1-preflight-backend.XXXXXX.log)"
frontend_log="$(mktemp -t fantaf1-preflight-frontend.XXXXXX.log)"

run_step "Eseguo smoke test salvataggio locale" npm run test:save-local

echo
echo "==> Avvio applicazione"
current_step="avvio applicazione"
trap - ERR INT TERM
exec node ./scripts/dev-launcher.mjs
