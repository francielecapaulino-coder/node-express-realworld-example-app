#!/bin/bash

# Forçar Node.js v18.20.8
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18.20.8

echo "=== VERIFICANDO AMBIENTE ==="
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "PATH: $PATH"
echo ""

echo "=== REINSTALANDO DEPENDÊNCIAS ==="
rm -rf node_modules package-lock.json
npm install

echo ""
echo "=== TESTANDO SCRIPTS ==="
echo "Testando nx..."
npx nx --version

echo "Testando stryker..."
npx stryker --version

echo ""
echo "=== RODANDO TESTES ==="
npm test