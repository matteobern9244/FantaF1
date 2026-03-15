#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

readonly CHROME_APP_PATH="/Applications/Google Chrome.app"
readonly CHROME_BIN_PATH="$CHROME_APP_PATH/Contents/MacOS/Google Chrome"
readonly PLAYWRIGHT_PROFILE_PATTERN='playwright_chromiumdev_profile-'
readonly DEVTOOLS_MCP_PATTERN='chrome-devtools-mcp'
readonly CLEANUP_WAIT_SECONDS=5
readonly STARTUP_WAIT_SECONDS=8

show_message() {
  local message="$1"
  local escaped_message="${message//\"/\\\"}"

  /usr/bin/osascript -e "display alert \"Pulizia Google Chrome\" message \"$escaped_message\"" \
    >/dev/null 2>&1 || true
}

require_chrome_installation() {
  if [[ ! -d "$CHROME_APP_PATH" ]] || [[ ! -x "$CHROME_BIN_PATH" ]]; then
    local message="Google Chrome non risulta installato in $CHROME_APP_PATH."
    echo "$message" >&2
    show_message "$message"
    exit 1
  fi
}

cleanup_automation_processes() {
  echo "Chiudo eventuali processi Chrome di automazione rimasti aperti..."

  pkill -f "$PLAYWRIGHT_PROFILE_PATTERN" 2>/dev/null || true
  pkill -f "$DEVTOOLS_MCP_PATTERN" 2>/dev/null || true

  local elapsed=0

  while (( elapsed < CLEANUP_WAIT_SECONDS )); do
    if ! pgrep -fal "$PLAYWRIGHT_PROFILE_PATTERN" >/dev/null 2>&1 \
      && ! pgrep -fal "$DEVTOOLS_MCP_PATTERN" >/dev/null 2>&1; then
      return
    fi

    sleep 1
    ((elapsed += 1))
  done
}

open_chrome() {
  echo "Riavvio Google Chrome..."
  open -na "$CHROME_APP_PATH"
  /usr/bin/osascript -e 'tell application "Google Chrome" to activate' >/dev/null 2>&1 || true
}

verify_chrome_running() {
  local elapsed=0

  while (( elapsed < STARTUP_WAIT_SECONDS )); do
    if pgrep -fal "$CHROME_BIN_PATH" >/dev/null 2>&1; then
      return
    fi

    sleep 1
    ((elapsed += 1))
  done

  local message="Google Chrome non risulta avviato dopo il tentativo di riapertura."
  echo "$message" >&2
  show_message "$message"
  exit 1
}

main() {
  require_chrome_installation
  cleanup_automation_processes
  open_chrome
  verify_chrome_running

  local message="Pulizia completata. Google Chrome e' stato rilanciato."
  echo "$message"
  show_message "$message"
}

main "$@"
