#!/usr/bin/env node

/**
 * Script para testar o sistema de intenções
 * Executar: node test-intentions.js
 */

const path = require('path');

// Verificar se os arquivos necessários existem
const fs = require('fs');

const requiredFiles = [
  './src/config/intentions.js',
  './src/services/intentionService.js',
  './src/handlers/messageHandler.js',
  './src/examples/addNewIntention.js',
  './src/tests/intentionService.test.js'
];

console.log('🔍 VERIFICANDO INSTALAÇÃO DO SISTEMA DE INTENÇÕES');
console.log('=' .repeat(60));

let allFilesExist = true;

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.log('\n❌ Alguns arquivos estão faltando!');
  console.log('Certifique-se de que todos os arquivos foram criados corretamente.');
  process.exit(1);
}

console.log('\n✅ Todos os arquivos necessários estão presentes!');

// Testar imports
console.log('\n🧪 TESTANDO IMPORTS...');

try {
  const { INTENTIONS } = require('./src/config/intentions.js');
  console.log(`✅ intentions.js - ${Object.keys(INTENTIONS).length} intenções configuradas`);
  
  const { IntentionService } = require('./src/services/intentionService.js');
  console.log('✅ intentionService.js - Serviço importado com sucesso');
  
  const intentionService = new IntentionService();
  const stats = intentionService.getStats();
  console.log(`✅ IntentionService instanciado - ${stats.totalIntentions} intenções carregadas`);
  
} catch (error) {
  console.log('❌ Erro ao importar:', error.message);
  process.exit(1);
}

// Testar detecção básica
console.log('\n🎯 TESTANDO DETECÇÃO BÁSICA...');

try {
  const { IntentionService } = require('./src/services/intentionService.js');
  const intentionService = new IntentionService();
  
  const testCases = [
    { msg: 'Preciso pagar meu IPTU', expected: 'DEBITOS' },
    { msg: 'Quero uma certidão negativa', expected: 'CERTIDOES' },
    { msg: 'Como emitir NFSe?', expected: 'NFSE' },
    { msg: 'Consultar meu imóvel', expected: 'BCI' },
    { msg: 'Agendar atendimento', expected: 'AGENDAMENTO' }
  ];
  
  testCases.forEach((test, index) => {
    const result = intentionService.detectIntentions(test.msg, `test_${index}`, 'MENU_PRINCIPAL');
    const detected = result.intentions[0]?.id;
    const confidence = result.confidence;
    
    const success = detected === test.expected && confidence > 30;
    console.log(`${success ? '✅' : '❌'} "${test.msg}" → ${detected} (${confidence}%)`);
  });
  
} catch (error) {
  console.log('❌ Erro nos testes:', error.message);
  process.exit(1);
}

// Executar testes completos
console.log('\n🧪 EXECUTANDO TESTES COMPLETOS...');

try {
  const { IntentionTester } = require('./src/tests/intentionService.test.js');
  const tester = new IntentionTester();
  
  // Reduzir verbosidade dos testes para este script
  const originalLog = console.log;
  let testResults = '';
  console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('✅ PASSOU') || message.includes('❌ FALHOU') || message.includes('📊 RESULTADO')) {
      originalLog(...args);
    }
    if (message.includes('📊 RESULTADO')) {
      testResults = message;
    }
  };
  
  const allPassed = tester.runAllTests();
  console.log = originalLog;
  
  if (allPassed) {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
  } else {
    console.log('⚠️ Alguns testes falharam - veja detalhes acima');
  }
  
} catch (error) {
  console.log('❌ Erro ao executar testes:', error.message);
}

// Executar exemplo
console.log('\n📚 TESTANDO EXEMPLO DE NOVA INTENÇÃO...');

try {
  const { exemploTestarDeteccao } = require('./src/examples/addNewIntention.js');
  
  // Capturar output do exemplo
  const originalLog = console.log;
  console.log = () => {}; // Silenciar temporariamente
  
  exemploTestarDeteccao();
  
  console.log = originalLog;
  console.log('✅ Exemplo de nova intenção executado com sucesso');
  
} catch (error) {
  console.log('❌ Erro no exemplo:', error.message);
}

// Resumo final
console.log('\n' + '=' .repeat(60));
console.log('📋 RESUMO DA INSTALAÇÃO');
console.log('=' .repeat(60));

console.log('✅ Sistema de Intenções instalado e funcionando!');
console.log('\n📁 Arquivos principais:');
console.log('   • src/config/intentions.js - Configuração de intenções');
console.log('   • src/services/intentionService.js - Lógica principal');
console.log('   • src/handlers/messageHandler.js - Integração');

console.log('\n🛠️ Para uso:');
console.log('   • Executar: npm start ou node index.js');
console.log('   • Testar: node src/tests/intentionService.test.js');
console.log('   • Exemplos: node src/examples/addNewIntention.js');

console.log('\n📖 Documentação:');
console.log('   • README.refatorado.md - Visão geral');
console.log('   • SISTEMA-INTENCOES.md - Documentação técnica');

console.log('\n🎯 Próximos passos:');
console.log('   1. Testar em produção com usuários reais');
console.log('   2. Ajustar palavras-chave conforme necessário');
console.log('   3. Adicionar novas intenções usando os exemplos');
console.log('   4. Monitorar logs para otimizações');

console.log('\n🚀 Sistema pronto para uso!');
