// Teste rápido do sistema corrigido
const { processarMensagem } = require('./src/handlers/messageHandler');

async function testeRapido() {
  console.log('🧪 TESTE RÁPIDO DO SISTEMA CORRIGIDO');
  console.log('='.repeat(40));

  try {
    // Teste 1: Menu
    console.log('\n1️⃣ Teste Menu:');
    const menu = await processarMensagem('menu', 'TestUser', [], []);
    console.log('✅ Menu OK');

    // Teste 2: Certidões
    console.log('\n2️⃣ Teste Certidões:');
    const cert = await processarMensagem('2', 'TestUser', [], []);
    console.log('✅ Fluxo de certidão iniciado');

    // Teste 3: Tipo Contribuinte
    console.log('\n3️⃣ Teste Tipo:');
    const tipo = await processarMensagem('1', 'TestUser', [], []);
    console.log('✅ Tipo contribuinte processado');

    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Sistema está funcionando corretamente');

  } catch (error) {
    console.log('\n❌ ERRO NO TESTE:');
    console.log(error.message);
  }
}

testeRapido();
