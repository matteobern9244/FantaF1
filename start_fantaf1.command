#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"
node ./scripts/dev-launcher.mjs
