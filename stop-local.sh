#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

stop_pid_file() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$name is not running."
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    echo "Stopped $name (pid $pid)."
  else
    echo "$name pid file existed, but process $pid was not running."
  fi
  rm -f "$pid_file"
}

stop_pid_file "backend" "$RUN_DIR/backend.pid"
stop_pid_file "frontend" "$RUN_DIR/frontend.pid"
