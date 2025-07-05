const { normalizarTexto } = require("../utils/textUtils");
const {
  INTENTIONS,
  CONTEXT_RULES,
  INTENTION_RESPONSES,
} = require("../config/intentions");
const { ESTADOS } = require("../config/constants");
const { obterEstadoUsuario } = require("./stateService");

/**
 * Serviço de detecção e processamento de intenções
 * Sistema contextual e global para identificar intenções do usuário
 */
class IntentionService {
  constructor() {
    this.intentions = INTENTIONS;
    this.contextRules = CONTEXT_RULES;
    this.responses = INTENTION_RESPONSES;
    this.userContexts = new Map(); // Histórico de contextos por usuário
  }

  /**
   * Detecta intenções na mensagem do usuário
   * @param {string} message - Mensagem do usuário
   * @param {string} sender - ID do usuário
   * @param {string} currentState - Estado atual do usuário
   * @returns {Object} Resultado da detecção
   */
  detectIntentions(message, sender, currentState = null) {
    if (!message || typeof message !== "string") {
      return { intentions: [], confidence: 0, context: null };
    }

    const normalizedMessage = normalizarTexto(message);
    const detectedIntentions = [];

    // Verificar cada intenção
    for (const [id, intention] of Object.entries(this.intentions)) {
      const score = this.calculateIntentionScore(
        normalizedMessage,
        intention,
        sender,
        currentState
      );

      if (score > 0) {
        detectedIntentions.push({
          id,
          intention,
          score,
          confidence: this.calculateConfidence(
            score,
            intention,
            normalizedMessage
          ),
        });
      }
    }

    // Ordenar por score (maior primeiro)
    detectedIntentions.sort((a, b) => b.score - a.score);

    // Verificar contexto atual
    const contextInfo = this.analyzeContext(
      normalizedMessage,
      sender,
      currentState
    );

    return {
      intentions: detectedIntentions,
      confidence:
        detectedIntentions.length > 0 ? detectedIntentions[0].confidence : 0,
      context: contextInfo,
      originalMessage: message,
      normalizedMessage,
    };
  }

  /**
   * Calcula o score de uma intenção para a mensagem
   * @param {string} normalizedMessage - Mensagem normalizada
   * @param {Object} intention - Definição da intenção
   * @param {string} sender - ID do usuário
   * @param {string} currentState - Estado atual
   * @returns {number} Score da intenção
   */
  calculateIntentionScore(normalizedMessage, intention, sender, currentState) {
    let score = 0;

    // Score baseado em palavras-chave
    for (const keyword of intention.keywords) {
      if (normalizedMessage.includes(keyword)) {
        score += 10;
      }
    }

    // Score baseado em frases
    for (const phrase of intention.phrases || []) {
      const normalizedPhrase = normalizarTexto(phrase);
      if (normalizedMessage.includes(normalizedPhrase)) {
        score += 20;
      }
    }

    // Boost por prioridade da intenção
    score += intention.priority;

    // Boost por contexto
    score += this.calculateContextBoost(
      normalizedMessage,
      intention,
      sender,
      currentState
    );

    return score;
  }

  /**
   * Calcula boost de contexto
   * @param {string} normalizedMessage - Mensagem normalizada
   * @param {Object} intention - Definição da intenção
   * @param {string} sender - ID do usuário
   * @param {string} currentState - Estado atual
   * @returns {number} Boost de contexto
   */
  calculateContextBoost(normalizedMessage, intention, sender, currentState) {
    let boost = 0;

    // Boost se o usuário está no mesmo contexto
    if (currentState === intention.state) {
      boost += this.contextRules.PRIORITY_BOOST.SAME_CONTEXT;
    }

    // Boost se usa palavras de mudança de assunto
    for (const changeWord of this.contextRules.CHANGE_TOPIC) {
      if (normalizedMessage.includes(changeWord)) {
        boost += this.contextRules.PRIORITY_BOOST.CHANGE_TOPIC;
        break;
      }
    }

    // Boost baseado no histórico do usuário
    const userHistory = this.userContexts.get(sender) || [];
    if (userHistory.includes(intention.id)) {
      boost += this.contextRules.PRIORITY_BOOST.RELATED_CONTEXT;
    }

    return boost;
  }

  /**
   * Calcula nível de confiança
   * @param {number} score - Score da intenção
   * @param {Object} intention - Definição da intenção
   * @param {string} normalizedMessage - Mensagem normalizada
   * @returns {number} Nível de confiança (0-100)
   */
  calculateConfidence(score, intention, normalizedMessage) {
    let confidence = Math.min(score * 2, 100);

    // Reduzir confiança se a mensagem for muito curta
    if (normalizedMessage.length < 5) {
      confidence *= 0.5;
    }

    // Aumentar confiança se encontrou frases completas
    for (const phrase of intention.phrases || []) {
      const normalizedPhrase = normalizarTexto(phrase);
      if (normalizedMessage.includes(normalizedPhrase)) {
        confidence *= 1.3;
        break;
      }
    }

    return Math.min(Math.round(confidence), 100);
  }

  /**
   * Analisa o contexto atual da conversa
   * @param {string} normalizedMessage - Mensagem normalizada
   * @param {string} sender - ID do usuário
   * @param {string} currentState - Estado atual
   * @returns {Object} Informações de contexto
   */
  analyzeContext(normalizedMessage, sender, currentState) {
    const context = {
      isChangingTopic: false,
      isCanceling: false,
      isConfirming: false,
      currentState,
      suggestedAction: null,
    };

    // Verificar mudança de assunto
    for (const changeWord of this.contextRules.CHANGE_TOPIC) {
      if (normalizedMessage.includes(changeWord)) {
        context.isChangingTopic = true;
        break;
      }
    }

    // Verificar cancelamento
    for (const cancelWord of this.contextRules.CANCEL_WORDS) {
      if (normalizedMessage.includes(cancelWord)) {
        context.isCanceling = true;
        context.suggestedAction = "return_to_menu";
        break;
      }
    }

    // Verificar confirmação
    for (const confirmWord of this.contextRules.CONFIRM_WORDS) {
      if (normalizedMessage.includes(confirmWord)) {
        context.isConfirming = true;
        break;
      }
    }

    return context;
  }

  /**
   * Processa intenções detectadas e gera resposta
   * @param {Object} detectionResult - Resultado da detecção
   * @param {string} sender - ID do usuário
   * @param {string} nome - Nome do usuário
   * @returns {Object|null} Resposta processada ou null se não há ação
   */
  processIntentions(detectionResult, sender, nome = "usuário") {
    const { intentions, context, confidence } = detectionResult;

    // Se não há intenções com confiança suficiente, não processar
    if (intentions.length === 0 || confidence < 30) {
      return null;
    }

    // Verificar se está cancelando
    if (context.isCanceling) {
      return {
        type: "redirect",
        action: "menu_principal",
        message: `${nome}, retornando ao menu principal. Como posso ajudá-lo?`,
      };
    }

    // Verificar se está confirmando e há contexto
    if (context.isConfirming && context.currentState) {
      // Continuar no fluxo atual
      return null;
    }

    // Processar intenções detectadas
    const topIntentions = intentions
      .slice(0, 3)
      .filter((i) => i.confidence > 50);

    if (topIntentions.length === 0) {
      return null;
    }

    // Atualizar histórico do usuário
    this.updateUserHistory(sender, topIntentions[0].id);

    // Se há apenas uma intenção com alta confiança
    if (topIntentions.length === 1 && topIntentions[0].confidence > 70) {
      return this.generateSingleIntentionResponse(
        topIntentions[0],
        sender,
        nome,
        context
      );
    }

    // Se há múltiplas intenções
    if (topIntentions.length > 1) {
      return this.generateMultipleIntentionsResponse(
        topIntentions,
        sender,
        nome,
        context
      );
    }

    return null;
  }

  /**
   * Gera resposta para intenção única
   * @param {Object} intentionData - Dados da intenção
   * @param {string} sender - ID do usuário
   * @param {string} nome - Nome do usuário
   * @param {Object} context - Contexto atual
   * @returns {Object} Resposta gerada
   */
  generateSingleIntentionResponse(intentionData, sender, nome, context) {
    const { intention, confidence } = intentionData;

    // Se está mudando de contexto
    if (
      context.isChangingTopic &&
      context.currentState &&
      context.currentState !== ESTADOS.MENU_PRINCIPAL
    ) {
      return {
        type: "context_change",
        action: intention.action,
        message: this.responses.CONTEXT_CHANGE.template
          .replace("{nome}", nome)
          .replace(
            "{current_context}",
            this.getContextName(context.currentState)
          )
          .replace("{new_intention}", intention.name)
          .replace("{new_intention}", intention.name)
          .replace(
            "{current_context}",
            this.getContextName(context.currentState)
          ),
        intention: intention,
        confidence,
      };
    }

    // Resposta direta para intenção
    const examples = intention.examples
      ? `💡 *Exemplos:*\n${intention.examples
          .map((ex) => `• ${ex}`)
          .join("\n")}\n\n`
      : "";

    return {
      type: "single_intention",
      action: intention.action,
      message: this.responses.SINGLE_INTENTION.template
        .replace("{nome}", nome)
        .replace("{intention_name}", intention.name.toLowerCase())
        .replace("{examples}", examples),
      intention: intention,
      confidence,
    };
  }

  /**
   * Gera resposta para múltiplas intenções
   * @param {Array} intentions - Lista de intenções
   * @param {string} sender - ID do usuário
   * @param {string} nome - Nome do usuário
   * @param {Object} context - Contexto atual
   * @returns {Object} Resposta gerada
   */
  generateMultipleIntentionsResponse(intentions, sender, nome, context) {
    const intentionsList = intentions
      .map((intentionData, index) => {
        const { intention, confidence } = intentionData;
        return `*${index + 1}* - ${intention.name} (${confidence}% confiança)`;
      })
      .join("\n");

    return {
      type: "multiple_intentions",
      action: "choose_intention",
      message: this.responses.MULTIPLE_INTENTIONS.template
        .replace("{nome}", nome)
        .replace("{intentions_list}", intentionsList),
      intentions: intentions,
      context,
    };
  }

  /**
   * Obtém nome do contexto atual
   * @param {string} state - Estado atual
   * @returns {string} Nome do contexto
   */
  getContextName(state) {
    const contextNames = {
      [ESTADOS.DEBITOS_ATIVO]: "consulta de débitos",
      [ESTADOS.AGUARDANDO_TIPO_CONTRIBUINTE]: "emissão de certidão",
      [ESTADOS.OPCAO_3_NFSE]: "NFSe",
      [ESTADOS.BCI_ATIVO]: "consulta de cadastro imobiliário",
      [ESTADOS.AGENDAMENTO_ATIVO]: "agendamento de atendimento",
      [ESTADOS.OPCAO_5_TFLF]: "consulta de TFLF",
      [ESTADOS.OPCAO_7_DEMONSTRATIVO]: "demonstrativo financeiro",
      [ESTADOS.CONSULTA_ISS]: "consulta de ISS",
      [ESTADOS.CONSULTA_CNAE]: "consulta de CNAE",
    };

    return contextNames[state] || "atendimento";
  }

  /**
   * Atualiza histórico do usuário
   * @param {string} sender - ID do usuário
   * @param {string} intentionId - ID da intenção
   */
  updateUserHistory(sender, intentionId) {
    const history = this.userContexts.get(sender) || [];

    // Adicionar no início da lista
    history.unshift(intentionId);

    // Manter apenas os últimos 10 contextos
    if (history.length > 10) {
      history.pop();
    }

    this.userContexts.set(sender, history);
  }

  /**
   * Obtém histórico do usuário
   * @param {string} sender - ID do usuário
   * @returns {Array} Histórico de intenções
   */
  getUserHistory(sender) {
    return this.userContexts.get(sender) || [];
  }

  /**
   * Limpa histórico do usuário
   * @param {string} sender - ID do usuário
   */
  clearUserHistory(sender) {
    this.userContexts.delete(sender);
  }

  /**
   * Verifica se uma intenção deve ser processada no contexto atual
   * @param {string} intentionId - ID da intenção
   * @param {string} currentState - Estado atual
   * @returns {boolean} Se deve processar
   */
  shouldProcessIntention(intentionId, currentState) {
    // Sempre processar intenções de cancelamento/menu
    if (
      intentionId === "ATENDENTE" ||
      currentState === ESTADOS.MENU_PRINCIPAL
    ) {
      return true;
    }

    // Verificar se está em um estado que permite mudança de contexto
    const blockingStates = [
      ESTADOS.AGUARDANDO_CPF_CNPJ,
      ESTADOS.AGUARDANDO_INSCRICAO,
    ];

    return !blockingStates.includes(currentState);
  }

  /**
   * Adiciona nova intenção ao sistema
   * @param {string} id - ID da intenção
   * @param {Object} intentionConfig - Configuração da intenção
   */
  addIntention(id, intentionConfig) {
    this.intentions[id] = {
      id,
      ...intentionConfig,
    };
  }

  /**
   * Remove intenção do sistema
   * @param {string} id - ID da intenção
   */
  removeIntention(id) {
    delete this.intentions[id];
  }

  /**
   * Obtém estatísticas do serviço
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      totalIntentions: Object.keys(this.intentions).length,
      activeUsers: this.userContexts.size,
      intentions: Object.keys(this.intentions),
      userHistories: this.userContexts.size,
    };
  }
}

module.exports = { IntentionService };
