/**
 * Controller real para o dashboard administrativo
 * Usa dados reais coletados pelo MetricsCollector
 */
class RealDashboardController {
  constructor() {
    this.JWT_SECRET = 'whatsauto_admin_secret_2024';
    // Usuário admin em memória para desenvolvimento
    this.adminUser = {
      id: 1,
      username: 'admin',
      password: 'admin123', // Em produção usar hash
      email: 'admin@whatsauto.com'
    };
  }

  /**
   * Middleware de autenticação
   */
  authenticate(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      // Verificação simplificada para desenvolvimento
      if (token.startsWith('fake_token_')) {
        const decoded = JSON.parse(token.replace('fake_token_', ''));
        req.user = decoded;
        next();
      } else {
        return res.status(401).json({ error: 'Token inválido' });
      }
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  }

  /**
   * Login administrativo
   */
  login(req, res) {
    try {
      console.log('🔐 Tentativa de login:', req.body);
      
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username e password são obrigatórios' });
      }

      if (username === this.adminUser.username && password === this.adminUser.password) {
        const token = 'fake_token_' + JSON.stringify({
          id: this.adminUser.id,
          username: this.adminUser.username
        });

        console.log('✅ Login realizado com sucesso para:', username);
        
        res.json({
          token,
          user: {
            id: this.adminUser.id,
            username: this.adminUser.username,
            email: this.adminUser.email
          }
        });
      } else {
        console.log('❌ Credenciais inválidas para:', username);
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém estatísticas gerais (dados reais)
   */
  async getStats(req, res) {
    try {
      const metricsCollector = req.metricsCollector;
      
      if (!metricsCollector) {
        // Fallback para dados mock se não houver collector
        return res.json({
          atendimentosHoje: { total: 0 },
          atendimentosSemana: { total: 0 },
          taxaSucesso: { taxa_sucesso: 0 },
          usuariosUnicos: { total: 0 },
          tiposPopulares: [],
          tempoMedio: { media_segundos: 0 }
        });
      }

      // Obter estatísticas reais
      const stats = await metricsCollector.obterEstatisticasGerais();
      console.log('📊 Estatísticas reais obtidas:', stats);
      
      res.json(stats);
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      // Fallback para dados básicos em caso de erro
      res.json({
        atendimentosHoje: { total: 0 },
        atendimentosSemana: { total: 0 },
        taxaSucesso: { taxa_sucesso: 0 },
        usuariosUnicos: { total: 0 },
        tiposPopulares: [],
        tempoMedio: { media_segundos: 0 }
      });
    }
  }

  /**
   * Obtém dados para gráficos (dados reais)
   */
  async getChartData(req, res) {
    try {
      const metricsCollector = req.metricsCollector;
      
      if (!metricsCollector) {
        // Fallback para dados mock
        return res.json({
          atendimentosPorDia: [],
          atendimentosPorHora: [],
          tiposAtendimento: [],
          intencoes: []
        });
      }

      // Obter dados reais dos gráficos
      const data = await metricsCollector.obterDadosGraficos();
      console.log('📈 Dados dos gráficos obtidos:', data);
      
      res.json(data);
    } catch (error) {
      console.error('❌ Erro ao obter dados dos gráficos:', error);
      // Fallback para dados vazios
      res.json({
        atendimentosPorDia: [],
        atendimentosPorHora: [],
        tiposAtendimento: [],
        intencoes: []
      });
    }
  }

  /**
   * Obtém lista de atendimentos (dados reais)
   */
  async getAtendimentos(req, res) {
    try {
      const { page = 1, limit = 50, tipo, status, usuario } = req.query;
      const offset = (page - 1) * limit;
      
      const metricsCollector = req.metricsCollector;
      
      if (!metricsCollector) {
        return res.json({
          atendimentos: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }

      // Construir query com filtros
      let whereClause = [];
      let params = [];
      
      if (tipo) {
        whereClause.push('tipo_atendimento = ?');
        params.push(tipo);
      }
      
      if (status) {
        whereClause.push('status = ?');
        params.push(status);
      }
      
      if (usuario) {
        whereClause.push('usuario_id LIKE ?');
        params.push(`%${usuario}%`);
      }
      
      const whereQuery = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
      
      // Obter atendimentos reais
      const atendimentos = await metricsCollector.db.all(
        `SELECT * FROM atendimentos ${whereQuery} 
         ORDER BY inicio_timestamp DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const total = await metricsCollector.db.get(
        `SELECT COUNT(*) as total FROM atendimentos ${whereQuery}`,
        params
      );

      console.log(`📋 ${atendimentos.length} atendimentos retornados`);

      res.json({
        atendimentos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total?.total || 0,
          pages: Math.ceil((total?.total || 0) / limit)
        }
      });
    } catch (error) {
      console.error('❌ Erro ao obter atendimentos:', error);
      res.json({
        atendimentos: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }
  }

  /**
   * Obtém eventos de usuário
   */
  async getEventosUsuario(req, res) {
    try {
      const { usuarioId } = req.params;
      const { limit = 100 } = req.query;
      
      const metricsCollector = req.metricsCollector;
      
      if (!metricsCollector) {
        return res.json([]);
      }
      
      const eventos = await metricsCollector.db.all(
        `SELECT * FROM eventos_usuario 
         WHERE usuario_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [usuarioId, limit]
      );

      console.log(`📱 ${eventos.length} eventos retornados para usuário ${usuarioId}`);
      res.json(eventos);
    } catch (error) {
      console.error('❌ Erro ao obter eventos:', error);
      res.json([]);
    }
  }

  /**
   * Exporta relatório (dados reais)
   */
  async exportRelatorio(req, res) {
    try {
      const { tipo = 'geral' } = req.query;
      const metricsCollector = req.metricsCollector;
      
      if (!metricsCollector) {
        return res.status(503).json({ error: 'Sistema de métricas não disponível' });
      }
      
      let dados;
      
      switch (tipo) {
        case 'geral':
          dados = await metricsCollector.obterEstatisticasGerais();
          break;
        case 'graficos':
          dados = await metricsCollector.obterDadosGraficos();
          break;
        case 'atendimentos':
          dados = await metricsCollector.db.all(
            'SELECT * FROM atendimentos ORDER BY inicio_timestamp DESC LIMIT 1000'
          );
          break;
        default:
          return res.status(400).json({ error: 'Tipo de relatório inválido' });
      }

      console.log(`📁 Exportando relatório: ${tipo}`);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.json"`);
      
      const relatorio = {
        tipo_relatorio: tipo,
        data_geracao: new Date().toISOString(),
        total_registros: Array.isArray(dados) ? dados.length : 1,
        dados: dados
      };
      
      res.json(relatorio);
    } catch (error) {
      console.error('❌ Erro ao exportar relatório:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = { RealDashboardController };
