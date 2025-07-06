const { MetricsCollector } = require('./src/services/metricsCollector');

async function testBaileysMetrics() {
  console.log('🧪 Testando métricas do Baileys...');
  
  const collector = new MetricsCollector();
  await collector.init();
  
  // Simular eventos típicos do Baileys
  console.log('📱 Simulando eventos do Baileys...');
  
  // 1. QR Code gerado
  await collector.registrarMetricaSistema(
    'baileys', 
    'qr_code_gerado', 
    1, 
    { timestamp: new Date().toISOString() }
  );
  
  // 2. Conexão estabelecida
  await collector.registrarMetricaSistema(
    'baileys', 
    'conexao_estabelecida', 
    1, 
    { timestamp: new Date().toISOString() }
  );
  
  // 3. Mensagens enviadas
  await collector.registrarMetricaSistema(
    'baileys', 
    'mensagem_texto_enviada', 
    1, 
    { sender: '5511999887766', caracteres: 150 }
  );
  
  await collector.registrarMetricaSistema(
    'baileys', 
    'mensagem_midia_enviada', 
    1, 
    { sender: '5511999887767', tipo: 'image' }
  );
  
  // 4. Erro de envio
  await collector.registrarMetricaSistema(
    'baileys', 
    'erro_envio_mensagem', 
    1, 
    { sender: '5511999887768', erro: 'Connection timeout' }
  );
  
  // 5. Desconexão
  await collector.registrarMetricaSistema(
    'baileys', 
    'desconexao', 
    1, 
    { reason: 408, timestamp: new Date().toISOString() }
  );
  
  console.log('✅ Eventos do Baileys registrados!');
  
  // Verificar métricas específicas do Baileys
  console.log('\n📊 Consultando métricas do Baileys...');
  
  const metricas = await collector.db.all(
    `SELECT servico, metrica, COUNT(*) as total, AVG(valor) as media
     FROM metricas_sistema 
     WHERE servico = 'baileys' 
     GROUP BY servico, metrica
     ORDER BY total DESC`
  );
  
  console.log('📈 Métricas coletadas:');
  metricas.forEach(m => {
    console.log(`  ${m.metrica}: ${m.total} eventos (média: ${m.media})`);
  });
  
  // Verificar últimas métricas
  console.log('\n🕐 Últimos eventos:');
  const ultimosEventos = await collector.db.all(
    `SELECT metrica, valor, detalhes, timestamp
     FROM metricas_sistema 
     WHERE servico = 'baileys' 
     ORDER BY timestamp DESC 
     LIMIT 5`
  );
  
  ultimosEventos.forEach(e => {
    const detalhes = JSON.parse(e.detalhes || '{}');
    console.log(`  ${e.metrica} - ${detalhes.timestamp || e.timestamp}`);
  });
  
  await collector.db.close();
  console.log('\n✅ Teste do Baileys concluído!');
  console.log('🌐 Acesse o dashboard para ver os dados: http://localhost:3000/admin');
}

testBaileysMetrics().catch(console.error);
