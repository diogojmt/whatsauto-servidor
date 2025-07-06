const {
  processarMensagem: processarMensagemOriginal,
} = require("./messageHandler");

/**
 * Wrapper do processarMensagem que adiciona coleta de métricas
 */
async function processarMensagemComMetricas(
  message,
  sender,
  dadosTFLF,
  dadosISS,
  req = null,
  nomeUsuario = null,
  metricsCollector = null
) {
  let atendimentoId = null;
  const startTime = Date.now();

  try {
    // Registrar início da mensagem se temos collector
    if (metricsCollector) {
      await metricsCollector.registrarEvento(sender, "mensagem_recebida", {
        mensagem: message.substring(0, 100), // Limitado para privacidade
        nome_usuario: nomeUsuario || "Cidadão",
        timestamp: new Date().toISOString(),
      });

      // Detectar tipo de atendimento baseado na mensagem
      const tipoAtendimento = detectarTipoAtendimento(message);

      if (tipoAtendimento) {
        // Iniciar atendimento
        atendimentoId = await metricsCollector.iniciarAtendimento(
          sender,
          tipoAtendimento,
          {
            mensagem_inicial: message,
            nome_usuario: nomeUsuario,
          }
        );

        // Registrar uso do serviço
        await metricsCollector.registrarUsoServico(sender, tipoAtendimento);

        console.log(
          `📊 Atendimento iniciado: ${atendimentoId} - Tipo: ${tipoAtendimento}`
        );
      }
    }

    // Processar mensagem normalmente
    const resposta = await processarMensagemOriginal(
      message,
      sender,
      dadosTFLF,
      dadosISS,
      req,
      nomeUsuario
    );

    // Registrar sucesso se temos collector
    if (metricsCollector) {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      await metricsCollector.registrarEvento(sender, "mensagem_processada", {
        sucesso: true,
        duracao_segundos: duration,
        tipo_resposta: resposta?.type || "text",
      });

      // Finalizar atendimento com sucesso
      if (atendimentoId) {
        await metricsCollector.finalizarAtendimento(atendimentoId, true);
        console.log(`✅ Atendimento finalizado com sucesso: ${atendimentoId}`);
      }

      // Registrar métrica de performance
      await metricsCollector.registrarMetricaSistema(
        "message_handler",
        "tempo_processamento",
        duration,
        { sender, tipo_mensagem: detectarTipoAtendimento(message) }
      );
    }

    return resposta;
  } catch (erro) {
    // Registrar erro se temos collector
    if (metricsCollector) {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      await metricsCollector.registrarEvento(sender, "erro_processamento", {
        erro: erro.message,
        stack: erro.stack?.substring(0, 500), // Limitado
        duracao_segundos: duration,
      });

      // Finalizar atendimento com erro
      if (atendimentoId) {
        await metricsCollector.finalizarAtendimento(
          atendimentoId,
          false,
          erro.message
        );
        console.log(`❌ Atendimento finalizado com erro: ${atendimentoId}`);
      }
    }

    throw erro; // Re-throw para manter comportamento original
  }
}

/**
 * Detecta o tipo de atendimento baseado na mensagem
 */
function detectarTipoAtendimento(mensagem) {
  const msg = mensagem.toLowerCase();

  // Opções do menu principal
  if (
    msg === "1" ||
    msg.includes("débito") ||
    msg.includes("dam") ||
    msg.includes("iptu")
  ) {
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
  if (msg === "0" || msg.includes("encerramento")) {
    return "encerramento_atendimento_virtual";
  }

  // Detecção por palavras-chave
  if (msg.includes("cpf") || msg.includes("cnpj")) {
    return "consulta_documento";
  }
  if (
    msg.includes("oi") ||
    msg.includes("olá") ||
    msg.includes("menu") ||
    msg.includes("ajuda")
  ) {
    return "saudacao";
  }

  return null; // Não identificado
}

/**
 * Registra métrica de sistema de forma segura
 */
async function registrarMetricaSegura(
  metricsCollector,
  servico,
  metrica,
  valor,
  detalhes = null
) {
  try {
    if (metricsCollector) {
      await metricsCollector.registrarMetricaSistema(
        servico,
        metrica,
        valor,
        detalhes
      );
    }
  } catch (error) {
    console.error("❌ Erro ao registrar métrica:", error);
  }
}

/**
 * Registra evento de usuário de forma segura
 */
async function registrarEventoSeguro(
  metricsCollector,
  usuarioId,
  tipoEvento,
  detalhes = null
) {
  try {
    if (metricsCollector) {
      await metricsCollector.registrarEvento(usuarioId, tipoEvento, detalhes);
    }
  } catch (error) {
    console.error("❌ Erro ao registrar evento:", error);
  }
}

module.exports = {
  processarMensagemComMetricas,
  detectarTipoAtendimento,
  registrarMetricaSegura,
  registrarEventoSeguro,
};
