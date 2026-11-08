#!/bin/sh
# Gera dist/terrario-linux-<versao>.tar.gz: o Terrario para rodar no Linux
# sem instalar dependencias do npm (so node, cage e chromium no sistema).
set -eu
cd "$(dirname "$0")/.."
V=$(node -p "require('./package.json').version")
mkdir -p dist
tar --transform "s,^,terrario/," -czf "dist/terrario-linux-$V.tar.gz" \
  server.mjs package.json README.md CHANGELOG.md src public linux
echo "dist/terrario-linux-$V.tar.gz"
