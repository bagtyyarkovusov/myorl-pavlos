#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
LOG_FILE="${LOG_FILE:-/dev/stdout}"

usage() {
  echo "Usage: $0 <dev|rehearsal|production>"
  echo ""
  echo "  Prune search_query_log rows older than 90 days."
  echo "  Production runs require --force (passed through to the Python tool)."
  echo ""
  echo "  Environment variables:"
  echo "    LOG_FILE  path to append log output (default: stdout)"
  exit 1
}

if [ -z "${TARGET}" ]; then
  usage
fi

case "${TARGET}" in
  dev|rehearsal) FORCE_FLAG="" ;;
  production)    FORCE_FLAG="--force" ;;
  *)             usage ;;
esac

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruning search_query_log rows older than 90 days (target: ${TARGET})..." | tee -a "${LOG_FILE}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "${SCRIPT_DIR}")"

python3 "${REPO_ROOT}/tools/prune_search_query_log.py" \
  --target "${TARGET}" \
  ${FORCE_FLAG} \
  2>&1 | tee -a "${LOG_FILE}"

EXIT_CODE=${PIPESTATUS[0]}

if [ ${EXIT_CODE} -eq 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Prune completed successfully." | tee -a "${LOG_FILE}"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Prune failed with exit code ${EXIT_CODE}." | tee -a "${LOG_FILE}"
  exit ${EXIT_CODE}
fi

echo ""
echo "To schedule daily pruning at 3 AM, add one of these lines to your crontab (crontab -e):"
echo ""
echo "  # Dev — prune search_query_log nightly"
echo "  0 3 * * * cd $(pwd) && bash $(pwd)/tools/prune-search-log.sh dev >> $(pwd)/logs/prune-search-log.log 2>&1"
echo ""
echo "  # Rehearsal — prune search_query_log nightly"
echo "  0 3 * * * cd $(pwd) && bash $(pwd)/tools/prune-search-log.sh rehearsal >> $(pwd)/logs/prune-search-log.log 2>&1"
echo ""
echo "  # Production — prune search_query_log nightly"
echo "  0 3 * * * cd $(pwd) && bash $(pwd)/tools/prune-search-log.sh production >> $(pwd)/logs/prune-search-log.log 2>&1"
