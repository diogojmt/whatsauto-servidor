/**
 * Utilitário para gerenciar respostas de chat com mensagens de aguardo
 */
class ChatResponse {
  /**
   * Cria uma resposta com mensagem de aguardo
   * @param {string} waitingMessage - Mensagem de aguardo
   * @param {Function} asyncFunction - Função que retorna o resultado final
   * @returns {Object} Resposta estruturada
   */
  static withWaiting(waitingMessage, asyncFunction) {
    return {
      type: 'waiting_response',
      waitingMessage,
      asyncFunction,
      timestamp: Date.now()
    };
  }

  /**
   * Cria uma resposta simples
   * @param {string} message - Mensagem de resposta
   * @returns {Object} Resposta estruturada
   */
  static simple(message) {
    return {
      type: 'simple_response',
      message,
      timestamp: Date.now()
    };
  }

  /**
   * Verifica se é uma resposta com aguardo
   * @param {Object} response - Resposta a verificar
   * @returns {boolean}
   */
  static isWaitingResponse(response) {
    return response && response.type === 'waiting_response';
  }

  /**
   * Executa a função assíncrona de uma resposta com aguardo
   * @param {Object} response - Resposta com aguardo
   * @returns {Promise<string>} Resultado final
   */
  static async executeWaitingResponse(response) {
    if (!this.isWaitingResponse(response)) {
      throw new Error('Resposta não é do tipo waiting_response');
    }
    
    return await response.asyncFunction();
  }
}

module.exports = ChatResponse;
