#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
APP_PORT="${PORT:-8080}"
DB_PORT="${DB_PORT:-3307}"

export PORT="$APP_PORT"
export DB_URL="${DB_URL:-jdbc:mysql://127.0.0.1:${DB_PORT}/shield?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=utf8}"
export DB_USERNAME="${DB_USERNAME:-shield}"
export DB_PASSWORD="${DB_PASSWORD:-shield_dev_password}"
export SHEILD_STORAGE_DIR="${SHEILD_STORAGE_DIR:-$ROOT/data/evidence}"

echo "SHEild local development"
echo "  Database : $DB_URL"
echo "  App      : http://localhost:$APP_PORT"
echo "  Evidence : $SHEILD_STORAGE_DIR"
echo "  Note     : defaults are for local development only."

cd "$ROOT"
exec ./mvnw spring-boot:run
