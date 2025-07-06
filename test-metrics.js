const { MetricsCollector } = require('./src/services/metricsCollector');

async function testMetrics() {
  const collector = new MetricsCollector();
  await collector.init();
  
  console.log('🧪 Testando coleta de métricas...');
  
  // Simular alguns dados
  const userId = '5511999887766';
  
  // Registrar alguns eventos
  await collector.registrarEvento(userId, 'mensagem_recebida', { teste: true });
  await collector.registrarEvento(userId, 'mensagem_processada', { sucesso: true });
  
  // Iniciar e finalizar um atendimento
  const atendimentoId = await collector.iniciarAtendimento(userId, 'debitos', { teste: true });
  await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
  await collector.finalizarAtendimento(atendimentoId, true);
  
  // Registrar métricas de sistema
  await collector.registrarMetricaSistema('test', 'performance', 95.5, { teste: true });
  
  console.log('\n📊 Obtendo estatísticas...');
  const stats = await collector.obterEstatisticasGerais();
  console.log('Stats:', JSON.stringify(stats, null, 2));
  
  console.log('\n📈 Obtendo dados dos gráficos...');
  const chartData = await collector.obterDadosGraficos();
  console.log('Chart Data:', JSON.stringify(chartData, null, 2));
  
  await collector.db.close();
  console.log('✅ Teste concluído!');
}

testMetrics().catch(console.error);
