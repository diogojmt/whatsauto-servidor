const express = require('express');
const { MetricsCollector } = require('./src/services/metricsCollector');

// Teste simples da API do dashboard
async function testDashboardAPI() {
  console.log('🧪 Testando API do Dashboard...');
  
  const collector = new MetricsCollector();
  await collector.init();
  
  // Simular alguns dados de teste
  const users = ['5511999887766', '5511999887767', '5511999887768'];
  const tipos = ['debitos', 'certidoes', 'bci', 'nfse'];
  
  console.log('📊 Gerando dados de teste...');
  
  for (let i = 0; i < 10; i++) {
    const userId = users[i % users.length];
    const tipo = tipos[i % tipos.length];
    
    // Registrar evento
    await collector.registrarEvento(userId, 'mensagem_recebida', {
      mensagem: `Teste ${i}`,
      nome_usuario: `Usuario${i}`
    });
    
    // Iniciar e finalizar atendimento
    const atendimentoId = await collector.iniciarAtendimento(userId, tipo, {
      teste: true,
      numero: i
    });
    
    // Simular tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Finalizar com sucesso (90% das vezes)
    const sucesso = Math.random() > 0.1;
    await collector.finalizarAtendimento(atendimentoId, sucesso, sucesso ? null : 'Erro de teste');
    
    // Registrar uso de serviço
    await collector.registrarUsoServico(userId, tipo);
  }
  
  console.log('✅ Dados de teste gerados!');
  
  // Testar estatísticas
  console.log('\n📊 Testando estatísticas...');
  const stats = await collector.obterEstatisticasGerais();
  console.log('Atendimentos hoje:', stats.atendimentosHoje?.total || 0);
  console.log('Taxa de sucesso:', stats.taxaSucesso?.taxa_sucesso || 0, '%');
  console.log('Usuários únicos:', stats.usuariosUnicos?.total || 0);
  console.log('Tipos populares:', stats.tiposPopulares?.length || 0, 'tipos');
  
  // Testar dados dos gráficos
  console.log('\n📈 Testando dados dos gráficos...');
  const chartData = await collector.obterDadosGraficos();
  console.log('Atendimentos por dia:', chartData.atendimentosPorDia?.length || 0, 'dias');
  console.log('Atendimentos por hora:', chartData.atendimentosPorHora?.length || 0, 'horas');
  console.log('Tipos de atendimento:', chartData.tiposAtendimento?.length || 0, 'tipos');
  
  // Testar listagem de atendimentos
  console.log('\n📋 Testando listagem de atendimentos...');
  const atendimentos = await collector.db.all(
    'SELECT * FROM atendimentos ORDER BY inicio_timestamp DESC LIMIT 5'
  );
  console.log('Atendimentos encontrados:', atendimentos.length);
  
  if (atendimentos.length > 0) {
    console.log('Último atendimento:', {
      id: atendimentos[0].id,
      tipo: atendimentos[0].tipo_atendimento,
      status: atendimentos[0].status,
      sucesso: atendimentos[0].sucesso
    });
  }
  
  await collector.db.close();
  console.log('✅ Teste da API concluído!');
  
  // Mostrar instruções para testar no navegador
  console.log('\n🌐 Para testar no navegador:');
  console.log('1. Inicie o servidor: npm start');
  console.log('2. Acesse: http://localhost:3000/admin');
  console.log('3. Login: admin / admin123');
  console.log('4. Os dados de teste já estão no banco!');
}

testDashboardAPI().catch(console.error);
