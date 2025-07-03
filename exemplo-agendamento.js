/**
 * Exemplo de uso direto das funções de agendamento
 * Este arquivo demonstra como usar as funções fora do contexto do chatbot
 */

const { AgendamentoService } = require('./src/services/agendamentoService');

async function exemploUso() {
  try {
    console.log('🚀 Iniciando exemplo de uso do sistema de agendamento\n');
    
    // Criar instância do serviço
    const agendamento = new AgendamentoService();
    
    // 1. Configurar autenticação
    console.log('📋 Configurando autenticação...');
    const authOk = await agendamento.configurarAuth();
    
    if (!authOk) {
      console.log('❌ Autenticação não configurada. Execute: node setup-google-auth.js');
      return;
    }
    
    console.log('✅ Autenticação configurada\n');
    
    // 2. Consultar horários disponíveis
    console.log('🔍 Consultando horários disponíveis...');
    const horariosDisponiveis = await agendamento.consultarHorariosDisponiveis(7); // próximos 7 dias
    
    if (horariosDisponiveis.length === 0) {
      console.log('❌ Nenhum horário disponível nos próximos dias');
      return;
    }
    
    // 3. Exibir horários formatados
    console.log('\n📅 Horários disponíveis:');
    const horariosFormatados = agendamento.formatarHorariosDisponiveis(horariosDisponiveis);
    console.log(horariosFormatados);
    
    // 4. Exemplo de criação de evento (descomente para testar)
    /*
    console.log('\n📝 Criando evento de exemplo...');
    
    const dadosAgendamento = {
      data: horariosDisponiveis[0].data, // Primeira data disponível
      horario: horariosDisponiveis[0].horarios[0], // Primeiro horário disponível
      servico: 'Consulta sobre IPTU',
      nomeCompleto: 'João da Silva (TESTE)',
      telefone: '(82) 99999-9999'
    };
    
    const resultado = await agendamento.criarEventoAtendimento(dadosAgendamento);
    
    if (resultado.success) {
      console.log('✅ Evento criado com sucesso!');
      console.log('📋 Dados:', resultado.dados);
      console.log('🆔 ID do evento:', resultado.eventoId);
      
      // 5. Exemplo de cancelamento (descomente para testar)
      // console.log('\n🗑️ Cancelando evento de teste...');
      // await agendamento.cancelarEvento(resultado.eventoId);
      // console.log('✅ Evento cancelado');
    } else {
      console.log('❌ Erro ao criar evento');
    }
    */
    
    console.log('\n🎉 Exemplo concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante execução:', error.message);
  }
}

// Função para demonstrar formatação de data
function exemploFormatacao() {
  const agendamento = new AgendamentoService();
  
  console.log('\n📅 Exemplos de formatação de data:');
  
  const datas = [
    '2025-01-15',
    '2025-02-28',
    '2025-12-25'
  ];
  
  datas.forEach(data => {
    const [ano, mes, dia] = data.split('-');
    const dataObj = new Date(ano, mes - 1, dia);
    const formatada = agendamento.formatarData(dataObj);
    console.log(`${data} → ${formatada}`);
  });
}

// Função para demonstrar geração de horários
function exemploHorarios() {
  const agendamento = new AgendamentoService();
  
  console.log('\n⏰ Horários base do sistema:');
  const horarios = agendamento.gerarHorariosDia();
  console.log(horarios.join(', '));
}

// Executar exemplos se o arquivo for executado diretamente
if (require.main === module) {
  console.log('📋 Sistema de Agendamento - Exemplos de Uso\n');
  
  // Exemplo básico de formatação (não requer autenticação)
  exemploFormatacao();
  exemploHorarios();
  
  // Exemplo completo (requer autenticação configurada)
  exemploUso().then(() => {
    console.log('\n✅ Todos os exemplos foram executados');
  });
}

module.exports = {
  exemploUso,
  exemploFormatacao,
  exemploHorarios
};
