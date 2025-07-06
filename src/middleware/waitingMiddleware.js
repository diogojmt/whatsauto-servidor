/**
 * Middleware para adicionar mensagens de aguardo em consultas demoradas
 */
const WaitingMessage = require('../utils/waitingMessage');

class WaitingMiddleware {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Adiciona mensagem de aguardo antes de executar função assíncrona
   * @param {string} sender - ID do remetente
   * @param {Function} asyncFunction - Função assíncrona a ser executada
   * @param {string} type - Tipo de consulta
   * @returns {string} Mensagem de aguardo
   */
  async addWaitingMessage(sender, asyncFunction, type = 'api') {
    const waitingMessage = WaitingMessage.getMessageForType(type);
    
    // Marcar como pendente
    this.pendingRequests.set(sender, {
      startTime: Date.now(),
      type: type
    });

    // Executar função em background
    setTimeout(async () => {
      try {
        const result = await asyncFunction();
        this.pendingRequests.delete(sender);
        console.log(`[WaitingMiddleware] Consulta finalizada para ${sender}`);
      } catch (error) {
        this.pendingRequests.delete(sender);
        console.error(`[WaitingMiddleware] Erro na consulta para ${sender}:`, error);
      }
    }, 0);

    return waitingMessage;
  }

  /**
   * Verifica se há consulta pendente para o usuário
   * @param {string} sender - ID do remetente
   * @returns {boolean}
   */
  hasPendingRequest(sender) {
    return this.pendingRequests.has(sender);
  }

  /**
   * Remove consulta pendente
   * @param {string} sender - ID do remetente
   */
  removePendingRequest(sender) {
    this.pendingRequests.delete(sender);
  }
}

// Instância singleton
const waitingMiddleware = new WaitingMiddleware();

module.exports = waitingMiddleware;
