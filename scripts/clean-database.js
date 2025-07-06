const { Database } = require('../src/database/database');
const readline = require('readline');

/**
 * Script para limpeza seletiva do banco de dados
 */
async function cleanDatabase() {
  const db = new Database();
  await db.init();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🧹 Limpeza Seletiva do Banco de Dados');
  console.log('=====================================\n');

  // Mostrar estatísticas atuais
  const stats = await obterEstatisticas(db);
  console.log('📊 Dados atuais no banco:');
  console.log(`  Atendimentos: ${stats.atendimentos}`);
  console.log(`  Eventos: ${stats.eventos}`);
  console.log(`  Métricas: ${stats.metricas}`);
  console.log(`  Sessões: ${stats.sessoes}\n`);

  if (stats.atendimentos === 0 && stats.eventos === 0 && stats.metricas === 0) {
    console.log('✅ Banco já está vazio!');
    await db.close();
    rl.close();
    return;
  }

  console.log('Escolha o que limpar:');
  console.log('1. Apenas dados antigos (mais de 30 dias)');
  console.log('2. Apenas dados de teste');
  console.log('3. Apenas métricas de sistema');
  console.log('4. Tudo exceto usuários admin');
  console.log('5. TUDO (reset completo)');
  console.log('0. Cancelar\n');

  const opcao = await question(rl, 'Digite sua escolha (0-5): ');

  switch (opcao) {
    case '1':
      await limparDadosAntigos(db);
      break;
    case '2':
      await limparDadosTeste(db);
      break;
    case '3':
      await limparMetricasSistema(db);
      break;
    case '4':
      await limparTudoExcetoAdmin(db);
      break;
    case '5':
      await resetCompleto(db);
      break;
    case '0':
      console.log('❌ Operação cancelada.');
      break;
    default:
      console.log('❌ Opção inválida.');
  }

  await db.close();
  rl.close();
}

async function obterEstatisticas(db) {
  const atendimentos = await db.get('SELECT COUNT(*) as total FROM atendimentos');
  const eventos = await db.get('SELECT COUNT(*) as total FROM eventos_usuario');
  const metricas = await db.get('SELECT COUNT(*) as total FROM metricas_sistema');
  const sessoes = await db.get('SELECT COUNT(*) as total FROM sessoes');

  return {
    atendimentos: atendimentos?.total || 0,
    eventos: eventos?.total || 0,
    metricas: metricas?.total || 0,
    sessoes: sessoes?.total || 0
  };
}

async function limparDadosAntigos(db) {
  console.log('🗓️ Limpando dados antigos (mais de 30 dias)...');
  
  await db.run("DELETE FROM atendimentos WHERE inicio_timestamp < date('now', '-30 days')");
  await db.run("DELETE FROM eventos_usuario WHERE timestamp < date('now', '-30 days')");
  await db.run("DELETE FROM metricas_sistema WHERE timestamp < date('now', '-30 days')");
  await db.run("DELETE FROM sessoes WHERE inicio < date('now', '-30 days')");
  
  console.log('✅ Dados antigos removidos!');
}

async function limparDadosTeste(db) {
  console.log('🧪 Limpando dados de teste...');
  
  await db.run("DELETE FROM atendimentos WHERE dados_consulta LIKE '%teste%'");
  await db.run("DELETE FROM eventos_usuario WHERE detalhes LIKE '%teste%'");
  await db.run("DELETE FROM metricas_sistema WHERE detalhes LIKE '%teste%'");
  
  console.log('✅ Dados de teste removidos!');
}

async function limparMetricasSistema(db) {
  console.log('⚙️ Limpando métricas de sistema...');
  
  await db.run('DELETE FROM metricas_sistema');
  
  console.log('✅ Métricas de sistema removidas!');
}

async function limparTudoExcetoAdmin(db) {
  console.log('🧽 Limpando todos os dados exceto usuários admin...');
  
  await db.run('DELETE FROM atendimentos');
  await db.run('DELETE FROM eventos_usuario');
  await db.run('DELETE FROM metricas_sistema');
  await db.run('DELETE FROM sessoes');
  await db.run('DELETE FROM sqlite_sequence');
  
  console.log('✅ Dados limpos, usuários admin preservados!');
}

async function resetCompleto(db) {
  console.log('💥 Reset completo do banco...');
  
  await db.run('DELETE FROM atendimentos');
  await db.run('DELETE FROM eventos_usuario');
  await db.run('DELETE FROM metricas_sistema');
  await db.run('DELETE FROM sessoes');
  await db.run('DELETE FROM admin_users');
  await db.run('DELETE FROM sqlite_sequence');
  
  // Recriar admin padrão
  const bcrypt = require('bcrypt');
  const adminPassword = bcrypt.hashSync('admin123', 10);
  
  await db.run(
    'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
    ['admin', adminPassword, 'admin@whatsauto.com']
  );
  
  console.log('✅ Reset completo realizado!');
  console.log('👤 Usuário admin recriado: admin / admin123');
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

cleanDatabase().catch(console.error);
