/**
 * Teste simples para verificar se as mensagens de aguardo funcionam
 */

const WaitingMessage = require('./src/utils/waitingMessage');

console.log('=== Teste das Mensagens de Aguardo ===\n');

// Teste mensagem aleatória
console.log('1. Mensagem aleatória:');
console.log(WaitingMessage.getRandomMessage());
console.log('');

// Teste mensagens específicas
console.log('2. Mensagem para débitos:');
console.log(WaitingMessage.getMessageForType('debitos'));
console.log('');

console.log('3. Mensagem para BCI:');
console.log(WaitingMessage.getMessageForType('bci'));
console.log('');

console.log('4. Mensagem para consulta:');
console.log(WaitingMessage.getMessageForType('consulta'));
console.log('');

console.log('5. Mensagem para API:');
console.log(WaitingMessage.getMessageForType('api'));
console.log('');

console.log('6. Mensagem para tipo inexistente (deve ser aleatória):');
console.log(WaitingMessage.getMessageForType('inexistente'));
console.log('');

console.log('=== Teste Concluído ===');
