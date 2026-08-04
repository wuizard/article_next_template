#!/usr/bin/env bash

set -Eeuo pipefail

readonly APP_DIR="/home/ubuntu/ant"
readonly NVM_DIR="/home/ubuntu/.nvm"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Production repository not found at $APP_DIR" >&2
  exit 1
fi

# Make Node, npm, and PM2 available when this runs from a non-login shell.
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
fi

for command_name in git npm pm2; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
done

cd "$APP_DIR"

echo "Updating production source..."
git pull --ff-only

echo "Installing locked dependencies..."
npm ci

echo "Building production assets..."
npm run build

echo "Restarting the public site..."
pm2 restart journal-site
pm2 status journal-site

echo "Production update completed successfully."
