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
 */
class MetricsCollector {
  constructor() {
    this.db = new Database();
    this.isInitialized = false;
    this.sessionCache = new Map(); // Cache de sessões ativas
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
   * Registra início de um atendimento
   */
  async iniciarAtendimento(usuarioId, tipoAtendimento, dadosConsulta = null) {
    await this.ensureInitialized();

    const result = await this.db.run(
      `INSERT INTO atendimentos (usuario_id, tipo_atendimento, status, dados_consulta)
       VALUES (?, ?, ?, ?)`,
      [
        usuarioId,
        tipoAtendimento,
        "em_andamento",
        JSON.stringify(dadosConsulta),
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
      },
      sessionId
    );

    return result.id;
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

    const inicio = await this.db.get(
      "SELECT inicio_timestamp FROM atendimentos WHERE id = ?",
      [atendimentoId]
    );

    if (inicio) {
      const agora = new Date();
      const inicioDate = new Date(inicio.inicio_timestamp);
      const duracaoSegundos = Math.floor((agora - inicioDate) / 1000);

      await this.db.run(
        `UPDATE atendimentos 
         SET fim_timestamp = CURRENT_TIMESTAMP, 
             duracao_segundos = ?,
             sucesso = ?,
             erro_detalhes = ?,
             status = ?
         WHERE id = ?`,
        [
          duracaoSegundos,
          sucesso ? 1 : 0,
          erroDetalhes,
          sucesso ? "finalizado" : "erro",
          atendimentoId,
        ]
      );
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

    const sessaoId = sessionId || this.getOrCreateSession(usuarioId);

    await this.db.run(
      `INSERT INTO eventos_usuario (usuario_id, tipo_evento, detalhes, sessao_id, intencao_detectada, confianca_intencao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        tipoEvento,
        JSON.stringify(detalhes),
        sessaoId,
        intencaoDetectada,
        confiancaIntencao,
      ]
    );

    // Atualizar contador de mensagens da sessão
    await this.atualizarSessao(usuarioId, sessaoId);
  }

  /**
   * Registra métrica de sistema
   */
  async registrarMetricaSistema(servico, metrica, valor, detalhes = null) {
    await this.ensureInitialized();

    await this.db.run(
      `INSERT INTO metricas_sistema (servico, metrica, valor, detalhes)
       VALUES (?, ?, ?, ?)`,
      [servico, metrica, valor, JSON.stringify(detalhes)]
    );
  }

  /**
   * Obtém ou cria uma sessão para o usuário
   */
  getOrCreateSession(usuarioId) {
    const agora = new Date();
    const sessionKey = `${usuarioId}_${agora.toDateString()}`;

    if (!this.sessionCache.has(sessionKey)) {
      const sessionId = `sess_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      this.sessionCache.set(sessionKey, sessionId);

      // Criar sessão no banco
      this.db.run(`INSERT INTO sessoes (usuario_id, sessao_id) VALUES (?, ?)`, [
        usuarioId,
        sessionId,
      ]);
    }

    return this.sessionCache.get(sessionKey);
  }

  /**
   * Atualiza dados da sessão
   */
  async atualizarSessao(usuarioId, sessionId) {
    await this.ensureInitialized();

    await this.db.run(
      `UPDATE sessoes 
       SET total_mensagens = total_mensagens + 1 
       WHERE sessao_id = ?`,
      [sessionId]
    );
  }

  /**
   * Registra uso de serviço na sessão
   */
  async registrarUsoServico(usuarioId, nomeServico) {
    await this.ensureInitialized();

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

        await this.db.run(
          `UPDATE sessoes 
           SET servicos_usados = ?, 
               total_servicos_usados = ? 
           WHERE sessao_id = ?`,
          [JSON.stringify(servicosUsados), servicosUsados.length, sessionId]
        );
      }
    }
  }

  /**
   * Obtém estatísticas gerais
   */
  async obterEstatisticasGerais() {
    await this.ensureInitialized();

    const hoje = new Date().toISOString().split("T")[0];
    const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const stats = {
      // Atendimentos hoje
      atendimentosHoje: await this.db.get(
        `SELECT COUNT(*) as total FROM atendimentos 
         WHERE DATE(inicio_timestamp) = DATE('now')`
      ),

      // Atendimentos na semana
      atendimentosSemana: await this.db.get(
        `SELECT COUNT(*) as total FROM atendimentos 
         WHERE DATE(inicio_timestamp) >= DATE('now', '-7 days')`
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

      // Tipos de atendimento mais populares
      tiposPopulares: await this.db.all(
        `SELECT tipo_atendimento, COUNT(*) as total
         FROM atendimentos 
         WHERE DATE(inicio_timestamp) >= DATE('now', '-7 days')
         GROUP BY tipo_atendimento 
         ORDER BY total DESC 
         LIMIT 10`
      ),

      // Usuários únicos
      usuariosUnicos: await this.db.get(
        `SELECT COUNT(DISTINCT usuario_id) as total 
         FROM atendimentos 
         WHERE DATE(inicio_timestamp) >= DATE('now', '-7 days')`
      ),

      // Tempo médio de atendimento
      tempoMedio: await this.db.get(
        `SELECT AVG(duracao_segundos) as media_segundos
         FROM atendimentos 
         WHERE duracao_segundos IS NOT NULL 
         AND DATE(inicio_timestamp) >= DATE('now', '-7 days')`
      ),
    };

    return stats;
  }

  /**
   * Obtém dados para gráficos
   */
  async obterDadosGraficos() {
    await this.ensureInitialized();

    return {
      // Atendimentos por dia (últimos 30 dias)
      atendimentosPorDia: await this.db.all(
        `SELECT 
           DATE(inicio_timestamp) as data,
           COUNT(*) as total,
           SUM(sucesso) as sucessos
         FROM atendimentos 
         WHERE DATE(inicio_timestamp) >= DATE('now', '-30 days')
         GROUP BY DATE(inicio_timestamp)
         ORDER BY data`
      ),

      // Atendimentos por hora do dia
      atendimentosPorHora: await this.db.all(
        `SELECT 
           CAST(strftime('%H', inicio_timestamp) AS INTEGER) as hora,
           COUNT(*) as total
         FROM atendimentos 
         WHERE DATE(inicio_timestamp) >= DATE('now', '-7 days')
         GROUP BY CAST(strftime('%H', inicio_timestamp) AS INTEGER)
         ORDER BY hora`
      ),

      // Tipos de atendimento
      tiposAtendimento: await this.db.all(
        `SELECT 
           tipo_atendimento,
           COUNT(*) as total,
           SUM(sucesso) as sucessos,
           ROUND(AVG(duracao_segundos), 2) as tempo_medio
         FROM atendimentos 
         WHERE DATE(inicio_timestamp) >= DATE('now', '-30 days')
         GROUP BY tipo_atendimento
         ORDER BY total DESC`
      ),

      // Detecção de intenções
      intencoes: await this.db.all(
        `SELECT 
           intencao_detectada,
           COUNT(*) as total,
           AVG(confianca_intencao) as confianca_media
         FROM eventos_usuario 
         WHERE intencao_detectada IS NOT NULL
         AND DATE(timestamp) >= DATE('now', '-7 days')
         GROUP BY intencao_detectada
         ORDER BY total DESC`
      ),
    };
  }

  /**
   * Garante que o collector está inicializado
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}

module.exports = { MetricsCollector };
