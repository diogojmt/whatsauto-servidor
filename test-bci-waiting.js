/**
 * Teste para verificar se a mensagem de aguardo do BCI funciona
 */

const WaitingMessage = require('./src/utils/waitingMessage');

console.log('=== Teste BCI Waiting Message ===\n');

// Teste da mensagem de aguardo do BCI
const waitingMsg = WaitingMessage.getMessageForType('bci');
console.log('Mensagem de aguardo BCI:');
console.log(`📋 ${waitingMsg}`);
console.log('');

// Simular o que aparece no log
console.log('Log simulado que deveria aparecer:');
console.log(`[BciService] 📋 ${waitingMsg}`);
console.log('');

console.log('=== Teste Concluído ===');
