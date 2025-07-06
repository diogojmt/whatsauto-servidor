/**
 * Middleware para integrar o collector de métricas ao sistema existente
 */
class MetricsMiddleware {
  constructor(metricsCollector) {
    this.metricsCollector = metricsCollector;
  }

  /**
   * Middleware para interceptar mensagens e registrar métricas
   */
  async interceptarMensagem(
    sender,
    mensagem,
    nomeUsuario,
    processarMensagemOriginal
  ) {
    let atendimentoId = null;

    try {
      // Registrar evento de mensagem recebida
      await this.metricsCollector.registrarEvento(sender, "mensagem_recebida", {
        mensagem: mensagem.substring(0, 100),
        nome_usuario: nomeUsuario,
      });

      // Detectar tipo de atendimento baseado na mensagem
      const tipoAtendimento = this.detectarTipoAtendimento(mensagem);

      if (tipoAtendimento) {
        // Iniciar atendimento
        atendimentoId = await this.metricsCollector.iniciarAtendimento(
          sender,
          tipoAtendimento,
          { mensagem_inicial: mensagem }
        );

        // Registrar uso do serviço
        await this.metricsCollector.registrarUsoServico(
          sender,
          tipoAtendimento
        );
      }

      // Processar mensagem normalmente
      const resposta = await processarMensagemOriginal();

      // Se iniciou atendimento, finalizar com sucesso
      if (atendimentoId) {
        await this.metricsCollector.finalizarAtendimento(atendimentoId, true);
      }

      return resposta;
    } catch (erro) {
      // Registrar erro
      await this.metricsCollector.registrarEvento(
        sender,
        "erro_processamento",
        {
          erro: erro.message,
          stack: erro.stack,
        }
      );

      // Se iniciou atendimento, finalizar com erro
      if (atendimentoId) {
        await this.metricsCollector.finalizarAtendimento(
          atendimentoId,
          false,
          erro.message
        );
      }

      throw erro;
    }
  }

  /**
   * Detecta o tipo de atendimento baseado na mensagem
   */
  detectarTipoAtendimento(mensagem) {
    const msg = mensagem.toLowerCase();

    // Opções do menu
    if (msg === "1" || msg.includes("débito") || msg.includes("dam")) {
      return "debitos";
    }
    if (msg === "2" || msg.includes("certidão") || msg.includes("certidao")) {
      return "certidoes";
    }
    if (msg === "3" || msg.includes("nfse") || msg.includes("nota fiscal")) {
      return "nfse";
    }
    if (msg === "4" || msg.includes("bci") || msg.includes("boletim")) {
      return "bci";
    }
    if (msg === "5" || msg.includes("agendamento") || msg.includes("agendar")) {
      return "agendamento";
    }
    if (msg === "6" || msg.includes("tflf") || msg.includes("fiscalização")) {
      return "tflf";
    }
    if (msg === "7" || msg.includes("demonstrativo")) {
      return "demonstrativo";
    }
    if (msg === "8" || msg.includes("substituto")) {
      return "substitutos";
    }
    if (msg === "9" || msg.includes("cadastro geral")) {
      return "cadastro_geral";
    }
    if (msg === "0" || msg.includes("ebcerramento")) {
      return "encerramento_atendimento_virtual";
    }

    // Detecção por palavras-chave
    if (msg.includes("cpf") || msg.includes("cnpj")) {
      return "consulta_documento";
    }
    if (msg.includes("iptu") || msg.includes("imposto")) {
      return "debitos";
    }

    return null;
  }

  /**
   * Registra métricas de sistema
   */
  async registrarMetricaSistema(servico, metrica, valor, detalhes = null) {
    try {
      await this.metricsCollector.registrarMetricaSistema(
        servico,
        metrica,
        valor,
        detalhes
      );
    } catch (error) {
      console.error("❌ Erro ao registrar métrica de sistema:", error);
    }
  }

  /**
   * Registra evento personalizado
   */
  async registrarEvento(usuarioId, tipoEvento, detalhes = null) {
    try {
      await this.metricsCollector.registrarEvento(
        usuarioId,
        tipoEvento,
        detalhes
      );
    } catch (error) {
      console.error("❌ Erro ao registrar evento:", error);
    }
  }
}

module.exports = { MetricsMiddleware };
