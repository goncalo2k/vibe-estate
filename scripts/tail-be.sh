#!/usr/bin/env bash
# Tail logs for the BE worker (property-agg-api).
set -euo pipefail
npx wrangler tail property-agg-api "$@"
