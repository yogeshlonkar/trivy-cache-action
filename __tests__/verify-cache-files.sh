#!/usr/bin/env bash

# Validate args
path="$1"
if [ -z "$path" ]; then
  echo "Must specify path argument"
  exit 1
fi

# Sanity check GITHUB_RUN_ID defined
if [ -z "$GITHUB_RUN_ID" ]; then
  echo "GITHUB_RUN_ID not defined"
  exit 1
fi

# Verify file exists
files=(
"$path/db/metadata.json"
"$path/db/trivy.db"
)
for file in "${files[@]}"; do
  echo "Checking for $file"
  if [ ! -e $file ]; then
    echo "File does not exist"
    exit 1
  fi
done
if [ ! -e "$path/fanal/fanal.db" ]; then
  echo "::warning fanal/fanal.db not found in cache"
fi
