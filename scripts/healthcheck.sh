#!/bin/bash
set -e

PORT=${PORT:-5001}
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/health || true)

if [ "$STATUS" = "200" ]; then
  echo "Backend health check PASSED"
  exit 0
else
  echo "Backend health check FAILED with status $STATUS"
  exit 1
fi
