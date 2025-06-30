#!/bin/bash
echo "🚀 Iniciando WhatsAuto Servidor..."
echo "📂 Diretório: $(pwd)"
echo "📦 Versão Node: $(node -v)"
echo "📦 Versão NPM: $(npm -v)"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Iniciar aplicação
echo "🔄 Iniciando aplicação..."
npm start
