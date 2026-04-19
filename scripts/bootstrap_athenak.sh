#!/usr/bin/env bash
# Clone the upstream AthenaK repo into $ATHENAK_CACHE_DIR/upstream/athenak.
# Safe to re-run: fast-forwards an existing clone instead of re-cloning.

set -euo pipefail

# Load .env if present so callers can just `./scripts/bootstrap_athenak.sh`.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

CACHE_DIR="${ATHENAK_CACHE_DIR:-$HOME/.athenak-frontend}"
GIT_URL="${ATHENAK_GIT_URL:-https://github.com/IAS-Astrophysics/athenak.git}"
REF="${ATHENAK_DEFAULT_REF:-main}"

# Expand ~ in CACHE_DIR if present.
CACHE_DIR="${CACHE_DIR/#~/$HOME}"
UPSTREAM_DIR="$CACHE_DIR/upstream/athenak"

mkdir -p "$CACHE_DIR/upstream" "$CACHE_DIR/workspaces"

if [[ -d "$UPSTREAM_DIR/.git" ]]; then
  echo "==> Updating existing AthenaK clone at $UPSTREAM_DIR"
  git -C "$UPSTREAM_DIR" fetch --recurse-submodules origin
  git -C "$UPSTREAM_DIR" checkout "$REF"
  git -C "$UPSTREAM_DIR" pull --ff-only --recurse-submodules origin "$REF"
  git -C "$UPSTREAM_DIR" submodule update --init --recursive
else
  echo "==> Cloning AthenaK from $GIT_URL into $UPSTREAM_DIR"
  git clone --recurse-submodules --branch "$REF" "$GIT_URL" "$UPSTREAM_DIR"
fi

# Clean up any leftover staged user_problem.cpp from a previous crashed build.
STAGED_PGEN="$UPSTREAM_DIR/src/pgen/user_problem.cpp"
if [[ -f "$STAGED_PGEN" ]]; then
  echo "==> Removing stale staged user_problem.cpp from upstream src/pgen/"
  rm -f "$STAGED_PGEN"
fi

echo "==> Done. AthenaK is ready at: $UPSTREAM_DIR"
