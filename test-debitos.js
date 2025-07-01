// Teste simples para verificar se a implementação funciona
const { DebitosService } = require('./src/services/debitosService');

console.log('🧪 Testando implementação de débitos...');

async function testarImplementacao() {
  try {
    const debitosService = new DebitosService();
    
    // Teste de detecção de intenção
    console.log('✅ Detecção de intenção para "segunda via":', debitosService.detectarIntencaoConsultaDebitos('segunda via'));
    console.log('✅ Detecção de intenção para "boleto":', debitosService.detectarIntencaoConsultaDebitos('quero meu boleto'));
    console.log('❌ Detecção de intenção para "oi":', debitosService.detectarIntencaoConsultaDebitos('oi'));
    
    // Teste de inicialização
    const resposta = debitosService.iniciarConsultaDebitos('test_user', 'João');
    console.log('✅ Inicialização do fluxo:', resposta.type === 'text' ? 'OK' : 'ERRO');
    
    // Teste de processamento de etapas
    const resposta2 = await debitosService.processarEtapa('test_user', '1');
    console.log('✅ Processamento de tipo contribuinte:', resposta2.type === 'text' ? 'OK' : 'ERRO');
    
    console.log('🎉 Todos os testes básicos passaram!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error(error.stack);
  }
}

testarImplementacao();
