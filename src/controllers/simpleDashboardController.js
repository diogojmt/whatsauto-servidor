/**
 * Controller simplificado para o dashboard administrativo
 */
class SimpleDashboardController {
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
   * Middleware de autenticação simplificado
   */
  authenticate(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      // Verificação simplificada
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
   * Login administrativo simplificado
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
   * Obtém estatísticas gerais (dados mock)
   */
  getStats(req, res) {
    try {
      const stats = {
        atendimentosHoje: { total: 25 },
        atendimentosSemana: { total: 156 },
        taxaSucesso: { taxa_sucesso: 87.5 },
        usuariosUnicos: { total: 89 },
        tiposPopulares: [
          { tipo_atendimento: 'debitos', total: 45 },
          { tipo_atendimento: 'certidoes', total: 32 },
          { tipo_atendimento: 'bci', total: 28 },
          { tipo_atendimento: 'nfse', total: 21 }
        ],
        tempoMedio: { media_segundos: 45 }
      };
      
      res.json(stats);
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém dados para gráficos (dados mock)
   */
  getChartData(req, res) {
    try {
      const data = {
        atendimentosPorDia: [
          { data: '2024-01-01', total: 12, sucessos: 10 },
          { data: '2024-01-02', total: 18, sucessos: 16 },
          { data: '2024-01-03', total: 25, sucessos: 22 }
        ],
        atendimentosPorHora: [
          { hora: 8, total: 5 },
          { hora: 9, total: 12 },
          { hora: 10, total: 18 },
          { hora: 11, total: 15 },
          { hora: 14, total: 20 },
          { hora: 15, total: 16 },
          { hora: 16, total: 10 }
        ],
        tiposAtendimento: [
          { tipo_atendimento: 'debitos', total: 45, sucessos: 42, tempo_medio: 35 },
          { tipo_atendimento: 'certidoes', total: 32, sucessos: 30, tempo_medio: 55 },
          { tipo_atendimento: 'bci', total: 28, sucessos: 25, tempo_medio: 40 },
          { tipo_atendimento: 'nfse', total: 21, sucessos: 18, tempo_medio: 60 }
        ],
        intencoes: [
          { intencao_detectada: 'DEBITOS', total: 45, confianca_media: 0.92 },
          { intencao_detectada: 'CERTIDOES', total: 32, confianca_media: 0.88 },
          { intencao_detectada: 'BCI', total: 28, confianca_media: 0.85 }
        ]
      };
      
      res.json(data);
    } catch (error) {
      console.error('❌ Erro ao obter dados dos gráficos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém lista de atendimentos (dados mock)
   */
  getAtendimentos(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      
      const atendimentos = [
        {
          id: 1,
          usuario_id: '551199887766',
          tipo_atendimento: 'debitos',
          status: 'finalizado',
          inicio_timestamp: new Date().toISOString(),
          duracao_segundos: 45
        },
        {
          id: 2,
          usuario_id: '551188776655',
          tipo_atendimento: 'certidoes',
          status: 'em_andamento',
          inicio_timestamp: new Date().toISOString(),
          duracao_segundos: null
        }
      ];

      res.json({
        atendimentos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 2,
          pages: 1
        }
      });
    } catch (error) {
      console.error('❌ Erro ao obter atendimentos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Exporta relatório (dados mock)
   */
  exportRelatorio(req, res) {
    try {
      const { tipo = 'geral' } = req.query;
      
      const dados = {
        tipo_relatorio: tipo,
        data_geracao: new Date().toISOString(),
        dados: {
          total_atendimentos: 156,
          taxa_sucesso: 87.5,
          usuarios_unicos: 89
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(dados);
    } catch (error) {
      console.error('❌ Erro ao exportar relatório:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = { SimpleDashboardController };
