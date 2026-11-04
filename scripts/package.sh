#!/bin/sh
# Builds dist/ratings-to-go-<version>.zip for the Chrome Web Store: only what
# the extension runs, nothing of the tests or the repository.
set -e
cd "$(dirname "$0")/.."
version=$(node -p 'require("./manifest.json").version')
mkdir -p dist
out="dist/ratings-to-go-$version.zip"
rm -f "$out"
zip -qr "$out" manifest.json _locales icons src -x '*.DS_Store'
echo "$out"
