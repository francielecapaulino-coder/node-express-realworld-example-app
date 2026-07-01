#!/bin/bash

echo "🔧 Corrigindo ambiente Node.js..."

# Carregar NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Usar Node.js correto
nvm use 18.20.8

echo "Node.js ativo: $(node --version)"
echo "NPM ativo: $(npm --version)"

# Limpar e reinstalar dependências
echo "🧹 Limpando node_modules..."
rm -rf node_modules package-lock.json

echo "📦 Reinstalando dependências..."
npm install

echo "🧪 Testando scripts..."
npm test --if-present

echo "🎯 Testando Stryker..."
npx stryker --version

echo "✅ Correção concluída!"