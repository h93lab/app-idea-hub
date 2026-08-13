#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Applying database migrations..."
  corepack pnpm drizzle-kit migrate
fi

exec "$@"
