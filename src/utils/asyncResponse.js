/**
 * Utilitário para lidar com respostas assíncronas que precisam de mensagem de aguardo
 */
const WaitingMessage = require('./waitingMessage');

class AsyncResponse {
  constructor() {
    this.responses = new Map();
  }

  /**
   * Executa uma função assíncrona com mensagem de aguardo
   * @param {string} sender - ID do remetente
   * @param {Function} asyncFunction - Função assíncrona a ser executada
   * @param {string} type - Tipo de consulta para mensagem personalizada
   * @returns {Object} Resposta com mensagem de aguardo
   */
  async executeWithWaiting(sender, asyncFunction, type = 'api') {
    const waitingMessage = WaitingMessage.getMessageForType(type);
    
    // Executar função assíncrona em background
    setImmediate(async () => {
      try {
        const result = await asyncFunction();
        this.responses.set(sender, result);
        console.log(`[AsyncResponse] Resultado pronto para ${sender}:`, result);
      } catch (error) {
        console.error(`[AsyncResponse] Erro para ${sender}:`, error);
        this.responses.set(sender, {
          type: 'error',
          message: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.'
        });
      }
    });

    return {
      type: 'waiting',
      message: waitingMessage,
      hasCallback: true
    };
  }

  /**
   * Verifica se há resultado disponível para o usuário
   * @param {string} sender - ID do remetente
   * @returns {Object|null} Resultado se disponível
   */
  getResult(sender) {
    const result = this.responses.get(sender);
    if (result) {
      this.responses.delete(sender);
      return result;
    }
    return null;
  }

  /**
   * Verifica se há resultado pendente
   * @param {string} sender - ID do remetente
   * @returns {boolean}
   */
  hasPendingResult(sender) {
    return this.responses.has(sender);
  }
}

// Instância singleton
const asyncResponse = new AsyncResponse();

module.exports = asyncResponse;
