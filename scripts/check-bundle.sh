#!/usr/bin/env bash
# Fail when an ncc bundle under dist/ contains a module webpack couldn't
# resolve. Runs at the end of `npm run build`.
#
# Usage: scripts/check-bundle.sh [dist-dir]   (default: dist)
#
# What it fixed: @actions/core 3 and @actions/cache 6 are ESM-only and export
# only an `import` condition. With tsconfig `module: commonjs` tsc emitted
# require() for them, webpack resolved through the `require` condition, found
# nothing, and ncc still exited 0 with a stub that throws MODULE_NOT_FOUND on
# the action's first line. check-dist compares two builds, so it passed too:
# both were broken the same way.
set -euo pipefail

dir="${1:-dist}"
if [[ ! -d "$dir" ]]; then
  echo "check-bundle: no $dir directory, build first" >&2
  exit 2
fi

if grep -rl --include='*.js' 'webpackMissingModule' "$dir" >/dev/null; then
  echo "check-bundle: unresolved modules in the bundle:" >&2
  grep -rhoE --include='*.js' "Cannot find module '[^']+'" "$dir" | sort -u >&2
  exit 1
fi
echo "check-bundle: $dir has no unresolved modules"
