const fs = require('fs');
const path = require('path');

/**
 * Reset manual simples - apenas para desenvolvimento
 */
function resetManual() {
  console.log('🗑️ Reset manual do banco...');
  
  const dbPath = path.join(__dirname, 'data/dashboard.db');
  
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log('✅ Banco resetado com sucesso!');
      console.log('🚀 Reinicie o servidor para criar novo banco.');
    } catch (error) {
      console.log('❌ Erro:', error.message);
      console.log('💡 Feche o servidor primeiro e tente novamente.');
    }
  } else {
    console.log('📄 Banco não existe, nada para resetar.');
  }
}

resetManual();
