#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUN_DIR="$ROOT_DIR/.run"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-3002}"

BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

mkdir -p "$RUN_DIR"

ensure_env_file() {
  local env_file="$FRONTEND_DIR/.env.local"
  if [[ ! -f "$env_file" ]]; then
    cat >"$env_file" <<EOF
NEXT_PUBLIC_API_URL=http://${BACKEND_HOST}:${BACKEND_PORT}
EOF
  fi
}

ensure_backend_deps() {
  if [[ ! -x "$BACKEND_DIR/.venv/bin/python" ]]; then
    echo "Creating backend virtualenv..."
    (cd "$BACKEND_DIR" && python3 -m venv .venv)
  fi

  if ! "$BACKEND_DIR/.venv/bin/python" -c "import fastapi, uvicorn, sqlalchemy, httpx, dotenv, pydantic" >/dev/null 2>&1; then
    echo "Installing backend dependencies..."
    (cd "$BACKEND_DIR" && ./.venv/bin/pip install -r requirements.txt)
  fi
}

ensure_frontend_deps() {
  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
  fi
}

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

start_backend() {
  if [[ -f "$BACKEND_PID_FILE" ]] && is_pid_running "$(cat "$BACKEND_PID_FILE")"; then
    echo "Backend already running on http://${BACKEND_HOST}:${BACKEND_PORT}"
    return
  fi

  echo "Starting backend..."
  (
    cd "$BACKEND_DIR"
    exec ./.venv/bin/uvicorn main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT"
  ) >"$BACKEND_LOG" 2>&1 &
  echo $! >"$BACKEND_PID_FILE"
}

start_frontend() {
  if [[ -f "$FRONTEND_PID_FILE" ]] && is_pid_running "$(cat "$FRONTEND_PID_FILE")"; then
    echo "Frontend already running on http://${FRONTEND_HOST}:${FRONTEND_PORT}"
    return
  fi

  echo "Starting frontend..."
  (
    cd "$FRONTEND_DIR"
    exec npm run dev -- --hostname "$FRONTEND_HOST" --port "$FRONTEND_PORT"
  ) >"$FRONTEND_LOG" 2>&1 &
  echo $! >"$FRONTEND_PID_FILE"
}

wait_for_http() {
  local url="$1"
  local name="$2"

  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$name is ready: $url"
      return
    fi
    sleep 1
  done

  echo "$name failed to start. Recent log output:"
  if [[ "$name" == "Backend" ]]; then
    tail -n 40 "$BACKEND_LOG" || true
  else
    tail -n 40 "$FRONTEND_LOG" || true
  fi
  exit 1
}

ensure_env_file
ensure_backend_deps
ensure_frontend_deps
start_backend
wait_for_http "http://${BACKEND_HOST}:${BACKEND_PORT}/health" "Backend"
start_frontend
wait_for_http "http://${FRONTEND_HOST}:${FRONTEND_PORT}/channels" "Frontend"

cat <<EOF

App is running.
Frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}/channels
Backend:  http://${BACKEND_HOST}:${BACKEND_PORT}/docs

Logs:
  $BACKEND_LOG
  $FRONTEND_LOG

Stop:
  bash "$ROOT_DIR/stop-local.sh"
EOF
