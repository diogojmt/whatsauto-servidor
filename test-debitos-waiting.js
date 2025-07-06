/**
 * Teste para verificar se a mensagem de aguardo dos débitos funciona
 */

const WaitingMessage = require('./src/utils/waitingMessage');

console.log('=== Teste Débitos Waiting Message ===\n');

// Teste da mensagem de aguardo dos débitos
const waitingMsg = WaitingMessage.getMessageForType('debitos');
console.log('Mensagem de aguardo Débitos:');
console.log(`📋 ${waitingMsg}`);
console.log('');

// Simular o que aparece no log
console.log('Log simulado que deveria aparecer:');
console.log(`[DebitosService] 📋 ${waitingMsg}`);
console.log('');

console.log('=== Teste Concluído ===');
