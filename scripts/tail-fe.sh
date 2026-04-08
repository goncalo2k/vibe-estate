#!/usr/bin/env bash
# Tail logs for the FE worker (property-agg-web).
set -euo pipefail
npx wrangler tail property-agg-web "$@"
