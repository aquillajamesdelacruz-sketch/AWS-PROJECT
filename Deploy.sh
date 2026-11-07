#!/usr/bin/env bash
# Usage:
#   ./deploy.sh https://YOUR-SERVICE.onrender.com        # build + deploy the site to Firebase Hosting
#   ./deploy.sh https://YOUR-SERVICE.onrender.com push   # also git push (Render rebuilds the reader from GitHub)
set -euo pipefail

RENDER_URL="${1:-}"
FIREBASE_PROJECT="akirafirebase"

if [[ -z "$RENDER_URL" ]]; then
  echo "Give the Render URL, e.g. ./deploy.sh https://marketplace-product-reader.onrender.com"; exit 1
fi
RENDER_URL="${RENDER_URL%/}"

# 0. one-time tools
command -v firebase >/dev/null || npm install -g firebase-tools

# 1. reader (Render deploys automatically from GitHub whenever you push)
if [[ "${2:-}" == "push" ]]; then
  git add -A
  git commit -m "Deploy $(date +%F-%H%M)" || true
  git push
fi

# 2. check the reader is up (a sleeping free Render service can take ~60s)
echo "Waking/checking reader..."
curl -fsS --max-time 90 "$RENDER_URL/api/health" && echo

# 3. point the site at the reader and build
echo "VITE_PRODUCT_API_URL=$RENDER_URL" > .env.production
npm install
npm run build

# 4. publish the site (Hosting only, no Blaze needed)
firebase deploy --only hosting --project "$FIREBASE_PROJECT"