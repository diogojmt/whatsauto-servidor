const fs = require('fs');
const path = require('path');
const { Database } = require('../src/database/database');

/**
 * Script para resetar o banco de dados do dashboard
 */
async function resetDatabase() {
  console.log('🗑️ Resetando banco de dados do dashboard...');
  
  const dbPath = path.join(__dirname, '../data/dashboard.db');
  
  try {
    // Opção 1: Deletar arquivo se existir
    if (fs.existsSync(dbPath)) {
      console.log('📄 Arquivo do banco encontrado, tentando deletar...');
      
      try {
        fs.unlinkSync(dbPath);
        console.log('✅ Arquivo do banco deletado com sucesso!');
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'ENOTEMPTY') {
          console.log('⚠️ Arquivo está sendo usado, limpando dados...');
          
          // Opção 2: Limpar dados sem deletar arquivo
          const db = new Database();
          await db.init();
          
          // Limpar todas as tabelas
          await db.run('DELETE FROM atendimentos');
          await db.run('DELETE FROM eventos_usuario');
          await db.run('DELETE FROM metricas_sistema');
          await db.run('DELETE FROM sessoes');
          
          // Resetar sequências
          await db.run('DELETE FROM sqlite_sequence');
          
          await db.close();
          console.log('✅ Dados do banco limpos com sucesso!');
        } else {
          throw error;
        }
      }
    } else {
      console.log('📄 Arquivo do banco não existe, nada para deletar.');
    }
    
    // Criar novo banco limpo
    console.log('🆕 Criando novo banco de dados...');
    const newDb = new Database();
    await newDb.init();
    
    // Criar usuário admin padrão
    const bcrypt = require('bcrypt');
    const adminPassword = bcrypt.hashSync('admin123', 10);
    
    await newDb.run(
      'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
      ['admin', adminPassword, 'admin@whatsauto.com']
    );
    
    await newDb.close();
    
    console.log('✅ Banco de dados resetado com sucesso!');
    console.log('👤 Usuário admin criado: admin / admin123');
    console.log('🌐 Acesse: http://localhost:3000/admin');
    
  } catch (error) {
    console.error('❌ Erro ao resetar banco:', error);
    
    // Fallback: usar banco em memória temporariamente
    console.log('🔄 Usando banco em memória como fallback...');
    console.log('⚠️ Os dados serão perdidos ao reiniciar o servidor.');
  }
}

resetDatabase().catch(console.error);
