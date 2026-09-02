#!/usr/bin/env bash
set -euo pipefail
cd /app

if [[ ! -s /run/businessfuture/runtime.env ]]; then
  echo "BusinessFuture runtime secrets are not rendered" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source /run/businessfuture/runtime.env
set +a

export DATABASE_SSL="false"
export AUTOMATION_AUTO_PUBLISH="true"
export AUTOMATION_MAX_DRAFTS="${AUTOMATION_MAX_DRAFTS:-2}"
export MEDIA_MAX_GENERATIONS="${MEDIA_MAX_GENERATIONS:-6}"
export BFT_SOURCE_BUCKET="${BFT_SOURCE_BUCKET:-businessfuture-source}"
export BFT_PUBLIC_BUCKET="${BFT_PUBLIC_BUCKET:-businessfuture-public}"
export BFT_PUBLIC_ASSET_BASE_URL="${BFT_PUBLIC_ASSET_BASE_URL:-https://pub-bee1ccae8444499fb2a74842fcf63f2b.r2.dev}"
export GIT_SSH_COMMAND="ssh -i /run/github/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

exec 9>/run/businessfuture/worker.lock
flock -n 9 || { echo "BusinessFuture cycle already running"; exit 0; }

git fetch origin main
git checkout -B runtime-main origin/main
git reset --hard origin/main

lock_hash="$(sha256sum package-lock.json | awk '{print $1}')"
if [[ ! -d node_modules || ! -f /run/businessfuture/npm-lock.sha256 || "$(cat /run/businessfuture/npm-lock.sha256)" != "$lock_hash" ]]; then
  npm ci --silent
  printf '%s' "$lock_hash" > /run/businessfuture/npm-lock.sha256
fi

npx tsx scripts/automation-run.ts
npx tsx scripts/media-pipeline.ts
node scripts/archive-rss-r2.mjs
node scripts/export-static-content.mjs

git add content/
if git diff --cached --quiet; then
  echo "No publication content changes"
  exit 0
fi

git -c user.name="Business Future Today Bot" -c user.email="bot@businessfuture.today" commit -m "Publish Business Future Today content"
git push origin HEAD:main
