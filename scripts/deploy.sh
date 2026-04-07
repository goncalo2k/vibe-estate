#!/usr/bin/env bash
# Deploy API and Web workers to Cloudflare.
# Usage: pnpm ship

set -euo pipefail

echo "==> Running migrations on production D1..."
pnpm db:migrate:prod

echo ""
echo "==> Building & deploying API worker (real-estate.api.goncalo2k.com)..."
pnpm --filter @property-agg/api ship

echo ""
echo "==> Building frontend..."
pnpm --filter @property-agg/web build

echo ""
echo "==> Deploying Web worker (real-estate.goncalo2k.com)..."
pnpm --filter @property-agg/web ship

echo ""
echo "Deploy complete."
