// Tentar usar SQLite, se não conseguir, usar banco em memória
let Database;
try {
  Database = require("../database/database").Database;
} catch (error) {
  console.log("⚠️ SQLite não disponível, usando banco em memória");
  Database = require("../database/memoryDatabase").Database;
}

/**
 * Serviço para coleta de métricas do sistema
 * Configurado para horário de Brasília (GMT-3)
 */
class MetricsCollector {
  constructor() {
    this.db = new Database();
    this.isInitialized = false;
    this.sessionCache = new Map(); // Cache de sessões ativas

    // Configurar timezone para Brasília
    this.timezone = "America/Sao_Paulo";
    this.timezoneOffset = "-3 hours"; // Offset para SQLite
  }

  /**
   * Inicializa o collector
   */
  async init() {
    if (!this.isInitialized) {
      await this.db.init();
      this.isInitialized = true;
    }
  }

  /**
   * Obtém timestamp atual no horário de Brasília
   */
  getTimestampBrasilia() {
    const now = new Date();
    // Ajustar para horário de Brasília (GMT-3)
    const brasiliaTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return brasiliaTime.toISOString().replace("T", " ").substring(0, 19);
  }

  /**
   * Converte timestamp UTC para horário de Brasília
   */
  convertToBrasiliaTime(utcTimestamp) {
    const utcDate = new Date(utcTimestamp);
    const brasiliaTime = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000);
    return brasiliaTime.toISOString().replace("T", " ").substring(0, 19);
  }

  /**
   * Registra início de um atendimento
   */
  async iniciarAtendimento(usuarioId, tipoAtendimento, dadosConsulta = null) {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      const result = await this.db.run(
        `INSERT INTO atendimentos (usuario_id, tipo_atendimento, status, dados_consulta, inicio_timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
          usuarioId,
          tipoAtendimento,
          "em_andamento",
          JSON.stringify(dadosConsulta),
          timestampBrasilia,
        ]
      );

      // Atualizar cache de sessão
      const sessionId = this.getOrCreateSession(usuarioId);
      await this.registrarEvento(
        usuarioId,
        "inicio_atendimento",
        {
          tipo: tipoAtendimento,
          atendimento_id: result.id,
          timestamp_brasilia: timestampBrasilia,
        },
        sessionId
      );

      return result.id;
    } catch (error) {
      console.error("❌ Erro ao iniciar atendimento:", error);
      throw error;
    }
  }

  /**
   * Finaliza um atendimento
   */
  async finalizarAtendimento(
    atendimentoId,
    sucesso = true,
    erroDetalhes = null
  ) {
    await this.ensureInitialized();

    const fimTimestamp = this.getTimestampBrasilia();

    try {
      const inicio = await this.db.get(
        "SELECT inicio_timestamp FROM atendimentos WHERE id = ?",
        [atendimentoId]
      );

      if (inicio) {
        const inicioDate = new Date(inicio.inicio_timestamp + " GMT-0300");
        const fimDate = new Date(fimTimestamp + " GMT-0300");
        const duracaoSegundos = Math.floor((fimDate - inicioDate) / 1000);

        await this.db.run(
          `UPDATE atendimentos 
           SET fim_timestamp = ?, 
               duracao_segundos = ?,
               sucesso = ?,
               erro_detalhes = ?,
               status = ?
           WHERE id = ?`,
          [
            fimTimestamp,
            duracaoSegundos,
            sucesso ? 1 : 0,
            erroDetalhes,
            sucesso ? "finalizado" : "erro",
            atendimentoId,
          ]
        );
      }
    } catch (error) {
      console.error("❌ Erro ao finalizar atendimento:", error);
      throw error;
    }
  }

  /**
   * Registra evento de usuário
   */
  async registrarEvento(
    usuarioId,
    tipoEvento,
    detalhes = null,
    sessionId = null,
    intencaoDetectada = null,
    confiancaIntencao = null
  ) {
    await this.ensureInitialized();

    try {
      const sessaoId = sessionId || this.getOrCreateSession(usuarioId);
      const timestampBrasilia = this.getTimestampBrasilia();

      // Adicionar timestamp de Brasília aos detalhes
      const detalhesComTimestamp = {
        ...detalhes,
        timestamp_brasilia: timestampBrasilia,
      };

      await this.db.run(
        `INSERT INTO eventos_usuario (usuario_id, tipo_evento, detalhes, sessao_id, intencao_detectada, confianca_intencao, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          usuarioId,
          tipoEvento,
          JSON.stringify(detalhesComTimestamp),
          sessaoId,
          intencaoDetectada,
          confiancaIntencao,
          timestampBrasilia,
        ]
      );

      // Atualizar contador de mensagens da sessão
      await this.atualizarSessao(usuarioId, sessaoId);
    } catch (error) {
      console.error("❌ Erro ao registrar evento:", error);
      // Não relançar o erro para não quebrar o fluxo principal
    }
  }

  /**
   * Registra métrica de sistema
   */
  async registrarMetricaSistema(servico, metrica, valor, detalhes = null) {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      // Adicionar timestamp de Brasília aos detalhes
      const detalhesComTimestamp = {
        ...detalhes,
        timestamp_brasilia: timestampBrasilia,
      };

      await this.db.run(
        `INSERT INTO metricas_sistema (servico, metrica, valor, detalhes, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
          servico,
          metrica,
          valor,
          JSON.stringify(detalhesComTimestamp),
          timestampBrasilia,
        ]
      );
    } catch (error) {
      console.error("❌ Erro ao registrar métrica do sistema:", error);
      // Não relançar o erro para não quebrar o fluxo principal
    }
  }

  /**
   * Obtém ou cria uma sessão para o usuário
   */
  getOrCreateSession(usuarioId) {
    try {
      // Usar data de Brasília para chave da sessão
      const agora = new Date();
      const brasiliaDate = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
      const sessionKey = `${usuarioId}_${brasiliaDate.toDateString()}`;

      if (!this.sessionCache.has(sessionKey)) {
        const sessionId = `sess_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        this.sessionCache.set(sessionKey, sessionId);

        const timestampBrasilia = this.getTimestampBrasilia();

        // Criar sessão no banco de forma assíncrona
        this.db
          .run(
            `INSERT INTO sessoes (usuario_id, sessao_id, inicio_timestamp, ativa) VALUES (?, ?, ?, ?)`,
            [usuarioId, sessionId, timestampBrasilia, 1]
          )
          .catch((error) => {
            console.error("❌ Erro ao criar sessão no banco:", error);
          });
      }

      return this.sessionCache.get(sessionKey);
    } catch (error) {
      console.error("❌ Erro ao obter/criar sessão:", error);
      // Retornar um ID de sessão temporário para não quebrar o fluxo
      return `temp_sess_${Date.now()}`;
    }
  }

  /**
   * Atualiza dados da sessão
   */
  async atualizarSessao(usuarioId, sessionId) {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      // Usar ultima_atividade em vez de ultima_atividade para compatibilidade
      await this.db.run(
        `UPDATE sessoes 
         SET total_mensagens = total_mensagens + 1,
             inicio_timestamp = COALESCE(inicio_timestamp, ?)
         WHERE sessao_id = ?`,
        [timestampBrasilia, sessionId]
      );
    } catch (error) {
      console.error("❌ Erro ao atualizar sessão:", error);
    }
  }

  /**
   * Registra uso de serviço na sessão
   */
  async registrarUsoServico(usuarioId, nomeServico) {
    await this.ensureInitialized();

    try {
      const sessionId = this.getOrCreateSession(usuarioId);

      const sessao = await this.db.get(
        "SELECT servicos_usados FROM sessoes WHERE sessao_id = ?",
        [sessionId]
      );

      if (sessao) {
        const servicosUsados = sessao.servicos_usados
          ? JSON.parse(sessao.servicos_usados)
          : [];

        if (!servicosUsados.includes(nomeServico)) {
          servicosUsados.push(nomeServico);

          const timestampBrasilia = this.getTimestampBrasilia();

          await this.db.run(
            `UPDATE sessoes 
             SET servicos_usados = ?, 
                 total_servicos_usados = ?
             WHERE sessao_id = ?`,
            [JSON.stringify(servicosUsados), servicosUsados.length, sessionId]
          );
        }
      }
    } catch (error) {
      console.error("❌ Erro ao registrar uso de serviço:", error);
    }
  }

  /**
   * Obtém estatísticas gerais (horário de Brasília)
   */
  async obterEstatisticasGerais() {
    await this.ensureInitialized();

    try {
      const stats = {
        // Atendimentos hoje (horário de Brasília)
        atendimentosHoje: await this.db.get(
          `SELECT COUNT(*) as total FROM atendimentos 
           WHERE DATE(inicio_timestamp) = DATE('now', '${this.timezoneOffset}')`
        ),

        // Atendimentos na semana (horário de Brasília)
        atendimentosSemana: await this.db.get(
          `SELECT COUNT(*) as total FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-7 days')`
        ),

        // Taxa de sucesso
        taxaSucesso: await this.db.get(
          `SELECT 
             COUNT(*) as total,
             SUM(sucesso) as sucessos,
             ROUND(CAST(SUM(sucesso) AS FLOAT) / COUNT(*) * 100, 2) as taxa_sucesso
           FROM atendimentos 
           WHERE fim_timestamp IS NOT NULL`
        ),

        // Tipos de atendimento mais populares (última semana)
        tiposPopulares: await this.db.all(
          `SELECT tipo_atendimento, COUNT(*) as total
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-7 days')
           GROUP BY tipo_atendimento 
           ORDER BY total DESC 
           LIMIT 10`
        ),

        // Usuários únicos (última semana)
        usuariosUnicos: await this.db.get(
          `SELECT COUNT(DISTINCT usuario_id) as total 
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-7 days')`
        ),

        // Tempo médio de atendimento (última semana)
        tempoMedio: await this.db.get(
          `SELECT AVG(duracao_segundos) as media_segundos
           FROM atendimentos 
           WHERE duracao_segundos IS NOT NULL 
           AND DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-7 days')`
        ),

        // Informações de timezone
        timezone: {
          nome: this.timezone,
          offset: this.timezoneOffset,
          timestamp_atual: this.getTimestampBrasilia(),
        },
      };

      return stats;
    } catch (error) {
      console.error("❌ Erro ao obter estatísticas gerais:", error);
      return {
        erro: "Erro ao obter estatísticas",
        timestamp_erro: this.getTimestampBrasilia(),
      };
    }
  }

  /**
   * Obtém dados para gráficos (horário de Brasília)
   */
  async obterDadosGraficos() {
    await this.ensureInitialized();

    try {
      return {
        // Atendimentos por dia (últimos 30 dias - horário de Brasília)
        atendimentosPorDia: await this.db.all(
          `SELECT 
             DATE(inicio_timestamp) as data,
             COUNT(*) as total,
             SUM(sucesso) as sucessos
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-30 days')
           GROUP BY DATE(inicio_timestamp)
           ORDER BY data`
        ),

        // Atendimentos por hora do dia (horário de Brasília)
        atendimentosPorHora: await this.db.all(
          `SELECT 
             CAST(strftime('%H', inicio_timestamp) AS INTEGER) as hora,
             COUNT(*) as total
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-7 days')
           GROUP BY CAST(strftime('%H', inicio_timestamp) AS INTEGER)
           ORDER BY hora`
        ),

        // Tipos de atendimento (últimos 30 dias)
        tiposAtendimento: await this.db.all(
          `SELECT
           tipo_atendimento,
           COUNT(*) as total,
           SUM(sucesso) as sucessos,
           ROUND(AVG(duracao_segundos), 2) as tempo_medio
         FROM atendimentos 
         WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-30 days')
         GROUP BY tipo_atendimento
         ORDER BY total DESC`
        ),

        // Detecção de intenções (última semana)
        intencoes: await this.db.all(
          `SELECT 
             intencao_detectada,
             COUNT(*) as total,
             AVG(confianca_intencao) as confianca_media
           FROM eventos_usuario 
           WHERE intencao_detectada IS NOT NULL
           AND DATE(timestamp) >= DATE('now', '${this.timezoneOffset}', '-7 days')
           GROUP BY intencao_detectada
           ORDER BY total DESC`
        ),

        // Atividade por hora (padrão semanal)
        atividadePorHora: await this.db.all(
          `SELECT 
             CAST(strftime('%H', inicio_timestamp) AS INTEGER) as hora,
             strftime('%w', inicio_timestamp) as dia_semana,
             COUNT(*) as total
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-30 days')
           GROUP BY CAST(strftime('%H', inicio_timestamp) AS INTEGER), strftime('%w', inicio_timestamp)
           ORDER BY hora, dia_semana`
        ),

        // Informações de timezone para o frontend
        timezone: {
          nome: this.timezone,
          offset: this.timezoneOffset,
          timestamp_atual: this.getTimestampBrasilia(),
        },
      };
    } catch (error) {
      console.error("❌ Erro ao obter dados para gráficos:", error);
      return {
        erro: "Erro ao obter dados para gráficos",
        timestamp_erro: this.getTimestampBrasilia(),
      };
    }
  }

  /**
   * Obtém relatório de performance por período
   */
  async obterRelatorioPerformance(diasAtras = 7) {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      return {
        periodo: {
          inicio: await this.db.get(
            `SELECT DATE('now', '${this.timezoneOffset}', '-${diasAtras} days') as data`
          ),
          fim: await this.db.get(
            `SELECT DATE('now', '${this.timezoneOffset}') as data`
          ),
          timestamp_relatorio: timestampBrasilia,
        },

        // Performance geral
        resumo: await this.db.get(
          `SELECT 
             COUNT(*) as total_atendimentos,
             COUNT(DISTINCT usuario_id) as usuarios_unicos,
             AVG(duracao_segundos) as tempo_medio,
             MIN(duracao_segundos) as tempo_minimo,
             MAX(duracao_segundos) as tempo_maximo,
             SUM(CASE WHEN sucesso = 1 THEN 1 ELSE 0 END) as sucessos,
             SUM(CASE WHEN sucesso = 0 THEN 1 ELSE 0 END) as erros,
             ROUND(CAST(SUM(sucesso) AS FLOAT) / COUNT(*) * 100, 2) as taxa_sucesso
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')`
        ),

        // Performance por tipo
        porTipo: await this.db.all(
          `SELECT 
             tipo_atendimento,
             COUNT(*) as total,
             AVG(duracao_segundos) as tempo_medio,
             SUM(sucesso) as sucessos,
             ROUND(CAST(SUM(sucesso) AS FLOAT) / COUNT(*) * 100, 2) as taxa_sucesso
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
           AND duracao_segundos IS NOT NULL
           GROUP BY tipo_atendimento
           ORDER BY total DESC`
        ),

        // Horários de pico
        horariosPico: await this.db.all(
          `SELECT 
             CAST(strftime('%H', inicio_timestamp) AS INTEGER) as hora,
             COUNT(*) as total,
             AVG(duracao_segundos) as tempo_medio
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
           GROUP BY CAST(strftime('%H', inicio_timestamp) AS INTEGER)
           HAVING COUNT(*) > 0
           ORDER BY total DESC
           LIMIT 5`
        ),

        // Dias mais movimentados
        diasPico: await this.db.all(
          `SELECT 
             DATE(inicio_timestamp) as data,
             COUNT(*) as total,
             COUNT(DISTINCT usuario_id) as usuarios_unicos
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
           GROUP BY DATE(inicio_timestamp)
           ORDER BY total DESC
           LIMIT 5`
        ),
      };
    } catch (error) {
      console.error("❌ Erro ao obter relatório de performance:", error);
      return {
        erro: "Erro ao obter relatório de performance",
        timestamp_erro: timestampBrasilia,
      };
    }
  }

  /**
   * Obtém sessões ativas (últimas 24h)
   */
  async obterSessoesAtivas() {
    await this.ensureInitialized();

    try {
      return {
        sessoes_ativas: await this.db.all(
          `SELECT 
             s.usuario_id,
             s.sessao_id,
             s.inicio_timestamp,
             s.fim_timestamp,
             s.total_mensagens,
             s.total_servicos_usados,
             s.servicos_usados,
             s.ativa
           FROM sessoes s
           WHERE s.ativa = 1 
           AND DATE(s.inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-1 day')
           ORDER BY s.inicio_timestamp DESC`
        ),

        resumo_sessoes: await this.db.get(
          `SELECT 
             COUNT(*) as total_sessoes,
             COUNT(DISTINCT usuario_id) as usuarios_unicos,
             AVG(total_mensagens) as media_mensagens,
             SUM(total_mensagens) as total_mensagens
           FROM sessoes 
           WHERE ativa = 1
           AND DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-1 day')`
        ),

        timestamp_consulta: this.getTimestampBrasilia(),
      };
    } catch (error) {
      console.error("❌ Erro ao obter sessões ativas:", error);
      return {
        erro: "Erro ao obter sessões ativas",
        timestamp_erro: this.getTimestampBrasilia(),
      };
    }
  }

  /**
   * Finaliza uma sessão
   */
  async finalizarSessao(sessionId, satisfacao = null) {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      await this.db.run(
        `UPDATE sessoes 
         SET fim_timestamp = ?, 
             ativa = 0,
             satisfacao = ?
         WHERE sessao_id = ?`,
        [timestampBrasilia, satisfacao, sessionId]
      );

      // Remover do cache
      for (const [key, value] of this.sessionCache.entries()) {
        if (value === sessionId) {
          this.sessionCache.delete(key);
          break;
        }
      }
    } catch (error) {
      console.error("❌ Erro ao finalizar sessão:", error);
    }
  }

  /**
   * Limpa dados antigos (manutenção)
   */
  async limparDadosAntigos(diasParaManter = 90) {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      // Limpar atendimentos antigos
      const atendimentosRemovidos = await this.db.run(
        `DELETE FROM atendimentos 
         WHERE DATE(inicio_timestamp) < DATE('now', '${this.timezoneOffset}', '-${diasParaManter} days')`
      );

      // Limpar eventos antigos
      const eventosRemovidos = await this.db.run(
        `DELETE FROM eventos_usuario 
         WHERE DATE(timestamp) < DATE('now', '${this.timezoneOffset}', '-${diasParaManter} days')`
      );

      // Limpar sessões antigas
      const sessoesRemovidas = await this.db.run(
        `DELETE FROM sessoes 
         WHERE DATE(inicio_timestamp) < DATE('now', '${this.timezoneOffset}', '-${diasParaManter} days')`
      );

      // Limpar métricas de sistema antigas
      const metricasRemovidas = await this.db.run(
        `DELETE FROM metricas_sistema 
         WHERE DATE(timestamp) < DATE('now', '${this.timezoneOffset}', '-${diasParaManter} days')`
      );

      // Registrar limpeza
      await this.registrarMetricaSistema("manutencao", "limpeza_dados", 1, {
        dias_mantidos: diasParaManter,
        atendimentos_removidos: atendimentosRemovidos.changes || 0,
        eventos_removidos: eventosRemovidos.changes || 0,
        sessoes_removidas: sessoesRemovidas.changes || 0,
        metricas_removidas: metricasRemovidas.changes || 0,
        timestamp_limpeza: timestampBrasilia,
      });

      return {
        sucesso: true,
        dados_removidos: {
          atendimentos: atendimentosRemovidos.changes || 0,
          eventos: eventosRemovidos.changes || 0,
          sessoes: sessoesRemovidas.changes || 0,
          metricas: metricasRemovidas.changes || 0,
        },
        timestamp_limpeza: timestampBrasilia,
      };
    } catch (error) {
      console.error("❌ Erro na limpeza de dados:", error);

      await this.registrarMetricaSistema("manutencao", "erro_limpeza", 1, {
        erro: error.message,
        timestamp_erro: timestampBrasilia,
      });

      return {
        sucesso: false,
        erro: error.message,
        timestamp_erro: timestampBrasilia,
      };
    }
  }

  /**
   * Exporta dados para relatório
   */
  async exportarDados(tipo = "completo", diasAtras = 30) {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      const dados = {
        metadata: {
          tipo_relatorio: tipo,
          periodo_dias: diasAtras,
          timestamp_exportacao: timestampBrasilia,
          timezone: this.timezone,
        },
      };

      switch (tipo) {
        case "atendimentos":
          dados.atendimentos = await this.db.all(
            `SELECT * FROM atendimentos 
             WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
             ORDER BY inicio_timestamp DESC`
          );
          break;

        case "sessoes":
          dados.sessoes = await this.db.all(
            `SELECT * FROM sessoes 
             WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
             ORDER BY inicio_timestamp DESC`
          );
          break;

        case "eventos":
          dados.eventos = await this.db.all(
            `SELECT * FROM eventos_usuario 
             WHERE DATE(timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
             ORDER BY timestamp DESC
             LIMIT 10000`
          );
          break;

        case "metricas":
          dados.metricas = await this.db.all(
            `SELECT * FROM metricas_sistema 
             WHERE DATE(timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
             ORDER BY timestamp DESC`
          );
          break;

        case "completo":
        default:
          dados.estatisticas = await this.obterEstatisticasGerais();
          dados.graficos = await this.obterDadosGraficos();
          dados.performance = await this.obterRelatorioPerformance(diasAtras);
          dados.sessoes_ativas = await this.obterSessoesAtivas();
          break;
      }

      // Registrar exportação
      await this.registrarMetricaSistema("sistema", "exportacao_dados", 1, {
        tipo_exportacao: tipo,
        periodo_dias: diasAtras,
        timestamp_exportacao: timestampBrasilia,
      });

      return dados;
    } catch (error) {
      console.error("❌ Erro ao exportar dados:", error);
      return {
        erro: "Erro ao exportar dados",
        timestamp_erro: timestampBrasilia,
      };
    }
  }

  /**
   * Garante que o collector está inicializado
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  /**
   * Obtém informações de status do sistema
   */
  async obterStatusSistema() {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      return {
        status: "ativo",
        timestamp_consulta: timestampBrasilia,
        timezone: {
          nome: this.timezone,
          offset: this.timezoneOffset,
        },
        cache_sessoes: {
          total: this.sessionCache.size,
          sessoes_ativas: Array.from(this.sessionCache.keys()),
        },
        database: {
          inicializado: this.isInitialized,
          tipo: Database.name || "SQLite",
        },
        uptime: process.uptime(),
        memoria: process.memoryUsage(),
      };
    } catch (error) {
      console.error("❌ Erro ao obter status do sistema:", error);
      return {
        status: "erro",
        erro: error.message,
        timestamp_erro: timestampBrasilia,
      };
    }
  }

  /**
   * Limpa cache de sessões antigas
   */
  limpezaCacheSessoes() {
    try {
      const agora = new Date();
      const brasiliaDate = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
      const hoje = brasiliaDate.toDateString();
      // Remover sessões que não são de hoje do cache
      for (const [key, value] of this.sessionCache.entries()) {
        if (!key.includes(hoje)) {
          this.sessionCache.delete(key);
        }
      }

      console.log(
        `🧹 Cache de sessões limpo. Sessões ativas: ${this.sessionCache.size}`
      );
    } catch (error) {
      console.error("❌ Erro na limpeza do cache de sessões:", error);
    }
  }

  /**
   * Obtém métricas de performance do banco
   */
  async obterMetricasPerformance() {
    await this.ensureInitialized();

    try {
      const timestampBrasilia = this.getTimestampBrasilia();

      return {
        // Contadores gerais
        contadores: {
          total_atendimentos: await this.db.get(
            "SELECT COUNT(*) as total FROM atendimentos"
          ),
          total_eventos: await this.db.get(
            "SELECT COUNT(*) as total FROM eventos_usuario"
          ),
          total_sessoes: await this.db.get(
            "SELECT COUNT(*) as total FROM sessoes"
          ),
          sessoes_ativas: await this.db.get(
            "SELECT COUNT(*) as total FROM sessoes WHERE ativa = 1"
          ),
        },

        // Métricas de hoje
        hoje: {
          atendimentos: await this.db.get(
            `SELECT COUNT(*) as total FROM atendimentos 
             WHERE DATE(inicio_timestamp) = DATE('now', '${this.timezoneOffset}')`
          ),
          eventos: await this.db.get(
            `SELECT COUNT(*) as total FROM eventos_usuario 
             WHERE DATE(timestamp) = DATE('now', '${this.timezoneOffset}')`
          ),
          usuarios_unicos: await this.db.get(
            `SELECT COUNT(DISTINCT usuario_id) as total FROM atendimentos 
             WHERE DATE(inicio_timestamp) = DATE('now', '${this.timezoneOffset}')`
          ),
        },

        // Últimos atendimentos
        ultimos_atendimentos: await this.db.all(
          `SELECT usuario_id, tipo_atendimento, status, inicio_timestamp, duracao_segundos
           FROM atendimentos 
           ORDER BY inicio_timestamp DESC 
           LIMIT 10`
        ),

        // Tipos de atendimento mais comuns (últimos 7 dias)
        tipos_comuns: await this.db.all(
          `SELECT tipo_atendimento, COUNT(*) as total
           FROM atendimentos 
           WHERE DATE(inicio_timestamp) >= DATE('now', '${this.timezoneOffset}', '-7 days')
           GROUP BY tipo_atendimento
           ORDER BY total DESC
           LIMIT 5`
        ),

        timestamp_consulta: timestampBrasilia,
      };
    } catch (error) {
      console.error("❌ Erro ao obter métricas de performance:", error);
      return {
        erro: "Erro ao obter métricas de performance",
        timestamp_erro: this.getTimestampBrasilia(),
      };
    }
  }

  /**
   * Registra erro do sistema
   */
  async registrarErro(servico, erro, contexto = null) {
    await this.ensureInitialized();

    try {
      const timestampBrasilia = this.getTimestampBrasilia();

      await this.registrarMetricaSistema("erro", servico, 1, {
        erro_message: erro.message || erro,
        erro_stack: erro.stack || null,
        contexto: contexto,
        timestamp_erro: timestampBrasilia,
      });

      console.error(`❌ Erro registrado para ${servico}:`, erro);
    } catch (error) {
      console.error("❌ Erro ao registrar erro do sistema:", error);
    }
  }

  /**
   * Obtém estatísticas de erros
   */
  async obterEstatisticasErros(diasAtras = 7) {
    await this.ensureInitialized();

    try {
      return {
        // Total de erros no período
        total_erros: await this.db.get(
          `SELECT COUNT(*) as total FROM metricas_sistema 
           WHERE servico = 'erro' 
           AND DATE(timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')`
        ),

        // Erros por serviço
        erros_por_servico: await this.db.all(
          `SELECT metrica as servico, COUNT(*) as total
           FROM metricas_sistema 
           WHERE servico = 'erro' 
           AND DATE(timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
           GROUP BY metrica
           ORDER BY total DESC`
        ),

        // Erros por dia
        erros_por_dia: await this.db.all(
          `SELECT DATE(timestamp) as data, COUNT(*) as total
           FROM metricas_sistema 
           WHERE servico = 'erro' 
           AND DATE(timestamp) >= DATE('now', '${this.timezoneOffset}', '-${diasAtras} days')
           GROUP BY DATE(timestamp)
           ORDER BY data`
        ),

        // Últimos erros
        ultimos_erros: await this.db.all(
          `SELECT metrica as servico, detalhes, timestamp
           FROM metricas_sistema 
           WHERE servico = 'erro' 
           ORDER BY timestamp DESC 
           LIMIT 10`
        ),

        timestamp_consulta: this.getTimestampBrasilia(),
      };
    } catch (error) {
      console.error("❌ Erro ao obter estatísticas de erros:", error);
      return {
        erro: "Erro ao obter estatísticas de erros",
        timestamp_erro: this.getTimestampBrasilia(),
      };
    }
  }

  /**
   * Executa manutenção automática
   */
  async executarManutencaoAutomatica() {
    await this.ensureInitialized();

    const timestampBrasilia = this.getTimestampBrasilia();

    try {
      console.log("🔧 Iniciando manutenção automática...");

      // Limpar cache de sessões
      this.limpezaCacheSessoes();

      // Finalizar sessões inativas (mais de 24h sem atividade)
      const sessoesFinalizadas = await this.db.run(
        `UPDATE sessoes 
         SET ativa = 0, fim_timestamp = ?
         WHERE ativa = 1 
         AND DATE(inicio_timestamp) < DATE('now', '${this.timezoneOffset}', '-1 day')`
      );

      // Limpar dados muito antigos (mais de 180 dias)
      const limpezaResultado = await this.limparDadosAntigos(180);

      // Registrar manutenção
      await this.registrarMetricaSistema("manutencao", "automatica", 1, {
        sessoes_finalizadas: sessoesFinalizadas.changes || 0,
        limpeza_dados: limpezaResultado,
        timestamp_manutencao: timestampBrasilia,
      });

      console.log("✅ Manutenção automática concluída");

      return {
        sucesso: true,
        sessoes_finalizadas: sessoesFinalizadas.changes || 0,
        limpeza_dados: limpezaResultado,
        timestamp_manutencao: timestampBrasilia,
      };
    } catch (error) {
      console.error("❌ Erro na manutenção automática:", error);

      await this.registrarErro("manutencao_automatica", error, {
        timestamp_erro: timestampBrasilia,
      });

      return {
        sucesso: false,
        erro: error.message,
        timestamp_erro: timestampBrasilia,
      };
    }
  }

  /**
   * Inicia tarefas automáticas (executar no início da aplicação)
   */
  iniciarTarefasAutomaticas() {
    // Executar manutenção a cada 6 horas
    setInterval(() => {
      this.executarManutencaoAutomatica().catch((error) => {
        console.error("❌ Erro na manutenção automática agendada:", error);
      });
    }, 6 * 60 * 60 * 1000); // 6 horas

    // Limpar cache de sessões a cada hora
    setInterval(() => {
      this.limpezaCacheSessoes();
    }, 60 * 60 * 1000); // 1 hora

    console.log("⏰ Tarefas automáticas iniciadas");
  }

  /**
   * Obtém resumo executivo para dashboard
   */
  async obterResumoExecutivo() {
    await this.ensureInitialized();

    try {
      const timestampBrasilia = this.getTimestampBrasilia();

      const [
        estatisticasGerais,
        metricsPerformance,
        estatisticasErros,
        sessoesAtivas,
      ] = await Promise.all([
        this.obterEstatisticasGerais(),
        this.obterMetricasPerformance(),
        this.obterEstatisticasErros(7),
        this.obterSessoesAtivas(),
      ]);

      return {
        resumo: {
          timestamp_consulta: timestampBrasilia,
          periodo_analise: "últimos 7 dias",
          status_sistema: "ativo",
        },
        estatisticas: estatisticasGerais,
        performance: metricsPerformance,
        erros: estatisticasErros,
        sessoes: sessoesAtivas,
        cache_info: {
          sessoes_em_cache: this.sessionCache.size,
          memoria_usada: process.memoryUsage(),
          uptime_segundos: process.uptime(),
        },
      };
    } catch (error) {
      console.error("❌ Erro ao obter resumo executivo:", error);
      return {
        erro: "Erro ao obter resumo executivo",
        timestamp_erro: this.getTimestampBrasilia(),
      };
    }
  }
}

module.exports = { MetricsCollector };
