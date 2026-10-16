#!/bin/sh
set -e

# Create / update the database schema. `db push` refuses changes that would
# drop data, so it is safe to run on every start.
if [ "${SKIP_DB_PUSH:-false}" != "true" ]; then
  echo "Applying database schema..."
  node node_modules/prisma/build/index.js db push --skip-generate
fi

exec "$@"
