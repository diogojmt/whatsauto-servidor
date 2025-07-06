/**
 * Utilitário para enviar mensagens de aguardo durante processamento
 */

class WaitingMessage {
  static messages = [
    "⏳ Aguarde, estou processando sua solicitação...",
    "🔍 Consultando as informações, aguarde um momento...",
    "⏱️ Processando sua consulta, por favor aguarde...",
    "🔄 Realizando a consulta, isso pode levar alguns segundos...",
    "📊 Buscando os dados solicitados, aguarde...",
  ];

  /**
   * Envia uma mensagem de aguardo aleatória
   */
  static getRandomMessage() {
    const randomIndex = Math.floor(Math.random() * this.messages.length);
    return this.messages[randomIndex];
  }

  /**
   * Envia mensagem de aguardo para consultas específicas
   */
  static getMessageForType(type) {
    const specificMessages = {
      debitos: "🔍 Consultando débitos no sistema, aguarde...",
      bci: "📋 Verificando informações de BCI, aguarde...",
      consulta: "🔍 Realizando consulta, aguarde...",
      api: "🌐 Consultando API externa, aguarde...",
    };

    return specificMessages[type] || this.getRandomMessage();
  }
}

module.exports = WaitingMessage;
