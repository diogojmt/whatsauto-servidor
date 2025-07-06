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
  let sessionId = null;
  const startTime = Date.now();

  try {
    // Verificar se temos collector disponível
    if (!metricsCollector) {
      console.log(
        "⚠️ MetricsCollector não disponível, processando sem métricas"
      );
      return await processarMensagemOriginal(
        message,
        sender,
        dadosTFLF,
        dadosISS,
        req,
        nomeUsuario
      );
    }

    // Garantir que o collector está inicializado
    await metricsCollector.ensureInitialized();

    // Obter ou criar sessão
    sessionId = metricsCollector.getOrCreateSession(sender);

    // Registrar início da mensagem
    await registrarEventoSeguro(metricsCollector, sender, "mensagem_recebida", {
      mensagem: message.substring(0, 100), // Limitado para privacidade
      nome_usuario: nomeUsuario || "Cidadão",
      tamanho_mensagem: message.length,
      sessao_id: sessionId,
    });

    // Detectar tipo de atendimento baseado na mensagem
    const tipoAtendimento = detectarTipoAtendimento(message);
    const intencaoDetectada = detectarIntencao(message);

    if (tipoAtendimento) {
      try {
        // Iniciar atendimento
        atendimentoId = await metricsCollector.iniciarAtendimento(
          sender,
          tipoAtendimento,
          {
            mensagem_inicial: message,
            nome_usuario: nomeUsuario,
            intencao_detectada: intencaoDetectada.intencao,
            confianca: intencaoDetectada.confianca,
          }
        );

        // Registrar uso do serviço
        await metricsCollector.registrarUsoServico(sender, tipoAtendimento);

        console.log(
          `📊 Atendimento iniciado: ${atendimentoId} - Tipo: ${tipoAtendimento} - Sessão: ${sessionId}`
        );
      } catch (error) {
        console.error("❌ Erro ao iniciar atendimento:", error);
        await registrarErroSeguro(
          metricsCollector,
          "iniciar_atendimento",
          error,
          {
            sender,
            tipo_atendimento: tipoAtendimento,
          }
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

    // Registrar sucesso
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    await registrarEventoSeguro(
      metricsCollector,
      sender,
      "mensagem_processada",
      {
        sucesso: true,
        duracao_segundos: duration,
        tipo_resposta: resposta?.type || "text",
        tamanho_resposta:
          typeof resposta === "string"
            ? resposta.length
            : resposta?.text?.length || 0,
        atendimento_id: atendimentoId,
      },
      sessionId,
      intencaoDetectada.intencao,
      intencaoDetectada.confianca
    );

    // Finalizar atendimento com sucesso
    if (atendimentoId) {
      try {
        await metricsCollector.finalizarAtendimento(atendimentoId, true);
        console.log(`✅ Atendimento finalizado com sucesso: ${atendimentoId}`);
      } catch (error) {
        console.error("❌ Erro ao finalizar atendimento:", error);
      }
    }

    // Registrar métrica de performance
    await registrarMetricaSegura(
      metricsCollector,
      "message_handler",
      "tempo_processamento",
      duration,
      {
        sender: sender.substring(0, 20) + "...", // Anonimizar parcialmente
        tipo_mensagem: tipoAtendimento || "indefinido",
        sucesso: true,
        sessao_id: sessionId,
      }
    );

    // Verificar se é mensagem de encerramento
    if (isEncerramento(message)) {
      await finalizarSessaoSegura(metricsCollector, sessionId);
    }

    return resposta;
  } catch (erro) {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    // Registrar erro
    await registrarEventoSeguro(
      metricsCollector,
      sender,
      "erro_processamento",
      {
        erro: erro.message,
        stack: erro.stack?.substring(0, 500), // Limitado
        duracao_segundos: duration,
        atendimento_id: atendimentoId,
        tipo_atendimento: detectarTipoAtendimento(message),
      },
      sessionId
    );

    // Finalizar atendimento com erro
    if (atendimentoId && metricsCollector) {
      try {
        await metricsCollector.finalizarAtendimento(
          atendimentoId,
          false,
          erro.message
        );
        console.log(`❌ Atendimento finalizado com erro: ${atendimentoId}`);
      } catch (error) {
        console.error("❌ Erro ao finalizar atendimento com erro:", error);
      }
    }

    // Registrar métrica de erro
    await registrarMetricaSegura(
      metricsCollector,
      "message_handler",
      "tempo_processamento_erro",
      duration,
      {
        sender: sender.substring(0, 20) + "...",
        tipo_mensagem: detectarTipoAtendimento(message) || "indefinido",
        sucesso: false,
        erro: erro.message,
        sessao_id: sessionId,
      }
    );

    // Registrar erro específico
    await registrarErroSeguro(metricsCollector, "message_handler", erro, {
      sender,
      message: message.substring(0, 100),
      duracao: duration,
    });

    throw erro; // Re-throw para manter comportamento original
  }
}

/**
 * Detecta o tipo de atendimento baseado na mensagem
 */
function detectarTipoAtendimento(mensagem) {
  const msg = mensagem.toLowerCase().trim();

  // Opções do menu principal
  if (
    msg === "1" ||
    msg.includes("débito") ||
    msg.includes("debito") ||
    msg.includes("dam") ||
    msg.includes("iptu")
  ) {
    return "debitos";
  }
  if (
    msg === "2" ||
    msg.includes("certidão") ||
    msg.includes("certidao") ||
    msg.includes("certidões") ||
    msg.includes("certidoes")
  ) {
    return "certidoes";
  }
  if (
    msg === "3" ||
    msg.includes("nfse") ||
    msg.includes("nota fiscal") ||
    msg.includes("nf-e")
  ) {
    return "nfse";
  }
  if (
    msg === "4" ||
    msg.includes("bci") ||
    msg.includes("boletim") ||
    msg.includes("cadastral")
  ) {
    return "bci";
  }
  if (
    msg === "5" ||
    msg.includes("agendamento") ||
    msg.includes("agendar") ||
    msg.includes("agendamentos")
  ) {
    return "agendamento";
  }
  if (
    msg === "6" ||
    msg.includes("tflf") ||
    msg.includes("fiscalização") ||
    msg.includes("fiscalizacao") ||
    msg.includes("funcionamento")
  ) {
    return "tflf";
  }
  if (
    msg === "7" ||
    msg.includes("demonstrativo") ||
    msg.includes("demonstrativos")
  ) {
    return "demonstrativo";
  }
  if (
    msg === "8" ||
    msg.includes("substituto") ||
    msg.includes("substitutos")
  ) {
    return "substitutos";
  }
  if (
    msg === "9" ||
    msg.includes("cadastro geral") ||
    msg.includes("cadastro")
  ) {
    return "cadastro_geral";
  }
  if (
    msg === "0" ||
    msg.includes("encerramento") ||
    msg.includes("encerrar") ||
    msg.includes("sair") ||
    msg.includes("tchau") ||
    msg.includes("obrigado")
  ) {
    return "encerramento_atendimento_virtual";
  }

  // Detecção por palavras-chave específicas
  if (msg.includes("cpf") || msg.includes("cnpj")) {
    return "consulta_documento";
  }
  if (
    msg.includes("oi") ||
    msg.includes("olá") ||
    msg.includes("ola") ||
    msg.includes("menu") ||
    msg.includes("ajuda") ||
    msg.includes("help") ||
    msg.includes("início") ||
    msg.includes("inicio")
  ) {
    return "saudacao";
  }

  // Detecção de consultas específicas
  if (msg.includes("consulta") || msg.includes("consultar")) {
    return "consulta_geral";
  }
  if (msg.includes("dúvida") || msg.includes("duvida")) {
    return "duvida";
  }

  return null; // Não identificado
}

/**
 * Detecta intenção do usuário com nível de confiança
 */
function detectarIntencao(mensagem) {
  const msg = mensagem.toLowerCase().trim();

  // Intenções com alta confiança (comandos diretos)
  if (/^[0-9]$/.test(msg)) {
    return { intencao: "menu_opcao", confianca: 0.95 };
  }

  // Saudações
  if (/(oi|olá|ola|bom dia|boa tarde|boa noite)/i.test(msg)) {
    return { intencao: "saudacao", confianca: 0.9 };
  }

  // Despedidas
  if (/(tchau|obrigado|valeu|até logo|encerrar)/i.test(msg)) {
    return { intencao: "despedida", confianca: 0.85 };
  }

  // Consultas
  if (/(consultar|consulta|verificar|checar)/i.test(msg)) {
    return { intencao: "consulta", confianca: 0.8 };
  }

  // Dúvidas
  if (/(como|onde|quando|qual|dúvida|duvida|ajuda)/i.test(msg)) {
    return { intencao: "duvida", confianca: 0.75 };
  }

  // Documentos específicos
  if (/(cpf|cnpj|rg|documento)/i.test(msg)) {
    return { intencao: "documento", confianca: 0.8 };
  }

  return { intencao: "indefinida", confianca: 0.1 };
}

/**
 * Verifica se a mensagem indica encerramento
 */
function isEncerramento(mensagem) {
  const msg = mensagem.toLowerCase().trim();
  const palavrasEncerramento = [
    "tchau",
    "obrigado",
    "obrigada",
    "valeu",
    "até logo",
    "encerrar",
    "sair",
    "finalizar",
    "terminar",
    "0",
  ];

  return palavrasEncerramento.some((palavra) => msg.includes(palavra));
}

/**
 * Finaliza sessão de forma segura
 */
async function finalizarSessaoSegura(
  metricsCollector,
  sessionId,
  satisfacao = null
) {
  try {
    if (metricsCollector && sessionId) {
      await metricsCollector.finalizarSessao(sessionId, satisfacao);
      console.log(`🔚 Sessão finalizada: ${sessionId}`);
    }
  } catch (error) {
    console.error("❌ Erro ao finalizar sessão:", error);
  }
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
  detalhes = null,
  sessionId = null,
  intencaoDetectada = null,
  confiancaIntencao = null
) {
  try {
    if (metricsCollector) {
      await metricsCollector.registrarEvento(
        usuarioId,
        tipoEvento,
        detalhes,
        sessionId,
        intencaoDetectada,
        confiancaIntencao
      );
    }
  } catch (error) {
    console.error("❌ Erro ao registrar evento:", error);
  }
}

/**
 * Registra erro de forma segura
 */
async function registrarErroSeguro(
  metricsCollector,
  servico,
  erro,
  contexto = null
) {
  try {
    if (metricsCollector) {
      await metricsCollector.registrarErro(servico, erro, contexto);
    }
  } catch (error) {
    console.error("❌ Erro ao registrar erro:", error);
  }
}

/**
 * Obtém estatísticas de uso para análise
 */
async function obterEstatisticasUso(metricsCollector, usuarioId = null) {
  try {
    if (!metricsCollector) {
      return null;
    }

    if (usuarioId) {
      // Estatísticas específicas do usuário
      return {
        usuario_id: usuarioId,
        sessao_atual: metricsCollector.getOrCreateSession(usuarioId),
        estatisticas_usuario: await metricsCollector.db.get(
          `SELECT 
             COUNT(*) as total_atendimentos,
             COUNT(DISTINCT DATE(inicio_timestamp)) as dias_ativos,
             AVG(duracao_segundos) as tempo_medio,
             SUM(CASE WHEN sucesso = 1 THEN 1 ELSE 0 END) as sucessos
           FROM atendimentos 
           WHERE usuario_id = ?`,
          [usuarioId]
        ),
        tipos_mais_usados: await metricsCollector.db.all(
          `SELECT tipo_atendimento, COUNT(*) as total
           FROM atendimentos 
           WHERE usuario_id = ?
           GROUP BY tipo_atendimento
           ORDER BY total DESC
           LIMIT 5`,
          [usuarioId]
        ),
        timestamp_consulta: metricsCollector.getTimestampBrasilia(),
      };
    } else {
      // Estatísticas gerais
      return await metricsCollector.obterEstatisticasGerais();
    }
  } catch (error) {
    console.error("❌ Erro ao obter estatísticas de uso:", error);
    return null;
  }
}

/**
 * Middleware para análise de sentimento básica
 */
function analisarSentimento(mensagem) {
  const msg = mensagem.toLowerCase();

  // Palavras positivas
  const positivas = [
    "obrigado",
    "obrigada",
    "valeu",
    "ótimo",
    "otimo",
    "bom",
    "boa",
    "excelente",
    "perfeito",
    "legal",
    "show",
    "parabéns",
    "parabens",
  ];

  // Palavras negativas
  const negativas = [
    "ruim",
    "péssimo",
    "pessimo",
    "horrível",
    "horrivel",
    "problema",
    "erro",
    "não funciona",
    "nao funciona",
    "difícil",
    "dificil",
    "complicado",
    "lento",
    "demora",
  ];

  // Palavras neutras/dúvidas
  const neutras = [
    "como",
    "onde",
    "quando",
    "qual",
    "dúvida",
    "duvida",
    "ajuda",
    "help",
  ];

  const scorePositivo = positivas.filter((palavra) =>
    msg.includes(palavra)
  ).length;
  const scoreNegativo = negativas.filter((palavra) =>
    msg.includes(palavra)
  ).length;
  const scoreNeutro = neutras.filter((palavra) => msg.includes(palavra)).length;

  if (scorePositivo > scoreNegativo && scorePositivo > 0) {
    return {
      sentimento: "positivo",
      confianca: Math.min(scorePositivo * 0.3, 0.9),
    };
  } else if (scoreNegativo > scorePositivo && scoreNegativo > 0) {
    return {
      sentimento: "negativo",
      confianca: Math.min(scoreNegativo * 0.3, 0.9),
    };
  } else if (scoreNeutro > 0) {
    return {
      sentimento: "neutro",
      confianca: Math.min(scoreNeutro * 0.2, 0.7),
    };
  }

  return { sentimento: "indefinido", confianca: 0.1 };
}

/**
 * Registra feedback do usuário
 */
async function registrarFeedback(
  metricsCollector,
  usuarioId,
  tipoFeedback,
  mensagem,
  satisfacao = null
) {
  try {
    if (!metricsCollector) return;

    const sentimento = analisarSentimento(mensagem);
    const sessionId = metricsCollector.getOrCreateSession(usuarioId);

    await registrarEventoSeguro(
      metricsCollector,
      usuarioId,
      "feedback",
      {
        tipo_feedback: tipoFeedback,
        mensagem: mensagem.substring(0, 200), // Limitado
        sentimento: sentimento.sentimento,
        confianca_sentimento: sentimento.confianca,
        satisfacao: satisfacao,
      },
      sessionId
    );

    // Se há satisfação, atualizar na sessão
    if (satisfacao !== null && sessionId) {
      await metricsCollector.db.run(
        `UPDATE sessoes SET satisfacao = ? WHERE sessao_id = ?`,
        [satisfacao, sessionId]
      );
    }

    console.log(
      `📝 Feedback registrado: ${tipoFeedback} - Sentimento: ${sentimento.sentimento}`
    );
  } catch (error) {
    console.error("❌ Erro ao registrar feedback:", error);
  }
}

/**
 * Analisa padrões de uso do usuário
 */
async function analisarPadroesUso(metricsCollector, usuarioId) {
  try {
    if (!metricsCollector) return null;

    const padroes = {
      // Horários mais ativos
      horarios_ativos: await metricsCollector.db.all(
        `SELECT 
           CAST(strftime('%H', inicio_timestamp) AS INTEGER) as hora,
           COUNT(*) as total
         FROM atendimentos 
         WHERE usuario_id = ?
         GROUP BY CAST(strftime('%H', inicio_timestamp) AS INTEGER)
         ORDER BY total DESC
         LIMIT 3`,
        [usuarioId]
      ),

      // Dias da semana mais ativos
      dias_ativos: await metricsCollector.db.all(
        `SELECT 
           CASE strftime('%w', inicio_timestamp)
             WHEN '0' THEN 'Domingo'
             WHEN '1' THEN 'Segunda'
             WHEN '2' THEN 'Terça'
             WHEN '3' THEN 'Quarta'
             WHEN '4' THEN 'Quinta'
             WHEN '5' THEN 'Sexta'
             WHEN '6' THEN 'Sábado'
           END as dia_semana,
           COUNT(*) as total
         FROM atendimentos 
         WHERE usuario_id = ?
         GROUP BY strftime('%w', inicio_timestamp)
         ORDER BY total DESC`,
        [usuarioId]
      ),

      // Sequência de serviços mais comum
      sequencias_servicos: await metricsCollector.db.all(
        `SELECT servicos_usados, COUNT(*) as frequencia
         FROM sessoes 
         WHERE usuario_id = ? AND servicos_usados IS NOT NULL
         GROUP BY servicos_usados
         ORDER BY frequencia DESC
         LIMIT 5`,
        [usuarioId]
      ),

      // Tempo médio por tipo de atendimento
      tempo_por_tipo: await metricsCollector.db.all(
        `SELECT 
           tipo_atendimento,
           AVG(duracao_segundos) as tempo_medio,
           COUNT(*) as total_usos
         FROM atendimentos 
         WHERE usuario_id = ? AND duracao_segundos IS NOT NULL
         GROUP BY tipo_atendimento
         ORDER BY total_usos DESC`,
        [usuarioId]
      ),

      timestamp_analise: metricsCollector.getTimestampBrasilia(),
    };

    return padroes;
  } catch (error) {
    console.error("❌ Erro ao analisar padrões de uso:", error);
    return null;
  }
}

/**
 * Gera recomendações personalizadas baseadas no histórico
 */
async function gerarRecomendacoes(metricsCollector, usuarioId) {
  try {
    if (!metricsCollector) return [];

    const padroes = await analisarPadroesUso(metricsCollector, usuarioId);
    const recomendacoes = [];

    if (padroes) {
      // Recomendar horários menos movimentados
      if (padroes.horarios_ativos.length > 0) {
        const horarioMaisUsado = padroes.horarios_ativos[0].hora;
        if (horarioMaisUsado >= 9 && horarioMaisUsado <= 17) {
          recomendacoes.push({
            tipo: "horario_alternativo",
            mensagem:
              "💡 Dica: Tente usar nossos serviços antes das 9h ou após 17h para atendimento mais rápido!",
            prioridade: "baixa",
          });
        }
      }

      // Recomendar serviços relacionados
      if (padroes.tempo_por_tipo.length > 0) {
        const servicoMaisUsado = padroes.tempo_por_tipo[0].tipo_atendimento;

        const servicosRelacionados = {
          debitos: ["certidoes", "demonstrativo"],
          certidoes: ["debitos", "bci"],
          nfse: ["demonstrativo", "substitutos"],
        };

        if (servicosRelacionados[servicoMaisUsado]) {
          recomendacoes.push({
            tipo: "servico_relacionado",
            mensagem: `💡 Você usa muito ${servicoMaisUsado}. Que tal conhecer também: ${servicosRelacionados[
              servicoMaisUsado
            ].join(", ")}?`,
            prioridade: "media",
          });
        }
      }

      // Recomendar otimizações
      const tempoMedioGeral =
        padroes.tempo_por_tipo.reduce(
          (acc, curr) => acc + curr.tempo_medio,
          0
        ) / padroes.tempo_por_tipo.length;
      if (tempoMedioGeral > 60) {
        // Mais de 1 minuto
        recomendacoes.push({
          tipo: "otimizacao",
          mensagem:
            "💡 Dica: Tenha seus documentos em mãos antes de iniciar para agilizar o atendimento!",
          prioridade: "alta",
        });
      }
    }

    return recomendacoes;
  } catch (error) {
    console.error("❌ Erro ao gerar recomendações:", error);
    return [];
  }
}

/**
 * Função principal para processar mensagem com análise completa
 */
async function processarMensagemCompleta(
  message,
  sender,
  dadosTFLF,
  dadosISS,
  req = null,
  nomeUsuario = null,
  metricsCollector = null,
  incluirAnalises = false
) {
  const resultado = await processarMensagemComMetricas(
    message,
    sender,
    dadosTFLF,
    dadosISS,
    req,
    nomeUsuario,
    metricsCollector
  );

  // Se solicitado, incluir análises adicionais
  if (incluirAnalises && metricsCollector) {
    const analises = {
      sentimento: analisarSentimento(message),
      intencao: detectarIntencao(message),
      padroes_uso: await analisarPadroesUso(metricsCollector, sender),
      recomendacoes: await gerarRecomendacoes(metricsCollector, sender),
      estatisticas_usuario: await obterEstatisticasUso(
        metricsCollector,
        sender
      ),
    };

    return {
      resposta: resultado,
      analises: analises,
      timestamp: metricsCollector.getTimestampBrasilia(),
    };
  }

  return resultado;
}

module.exports = {
  processarMensagemComMetricas,
  processarMensagemCompleta,
  detectarTipoAtendimento,
  detectarIntencao,
  analisarSentimento,
  registrarMetricaSegura,
  registrarEventoSeguro,
  registrarErroSeguro,
  registrarFeedback,
  obterEstatisticasUso,
  analisarPadroesUso,
  gerarRecomendacoes,
  finalizarSessaoSegura,
  isEncerramento,
};
