const { MetricsCollector } = require('../services/metricsCollector');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Controller para o dashboard administrativo
 */
class DashboardController {
  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.JWT_SECRET = process.env.JWT_SECRET || 'whatsauto_admin_secret_2024';
  }

  /**
   * Middleware de autenticação
   */
  async authenticate(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const decoded = jwt.verify(token, this.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  }

  /**
   * Login administrativo
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username e password são obrigatórios' });
      }

      await this.metricsCollector.ensureInitialized();
      
      const user = await this.metricsCollector.db.get(
        'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
        [username]
      );

      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Atualizar último login
      await this.metricsCollector.db.run(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      const token = jwt.sign(
        { id: user.id, username: user.username },
        this.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('❌ Erro no login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Criar usuário administrador
   */
  async createAdmin(req, res) {
    try {
      const { username, password, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username e password são obrigatórios' });
      }

      await this.metricsCollector.ensureInitialized();
      
      // Verificar se já existe
      const existingUser = await this.metricsCollector.db.get(
        'SELECT id FROM admin_users WHERE username = ?',
        [username]
      );

      if (existingUser) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      
      await this.metricsCollector.db.run(
        'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
        [username, passwordHash, email]
      );

      res.json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
      console.error('❌ Erro ao criar admin:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém estatísticas gerais
   */
  async getStats(req, res) {
    try {
      await this.metricsCollector.ensureInitialized();
      const stats = await this.metricsCollector.obterEstatisticasGerais();
      res.json(stats);
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém dados para gráficos
   */
  async getChartData(req, res) {
    try {
      await this.metricsCollector.ensureInitialized();
      const data = await this.metricsCollector.obterDadosGraficos();
      res.json(data);
    } catch (error) {
      console.error('❌ Erro ao obter dados dos gráficos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém lista de atendimentos
   */
  async getAtendimentos(req, res) {
    try {
      const { page = 1, limit = 50, tipo, status, usuario } = req.query;
      const offset = (page - 1) * limit;
      
      await this.metricsCollector.ensureInitialized();
      
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
      
      const atendimentos = await this.metricsCollector.db.all(
        `SELECT * FROM atendimentos ${whereQuery} 
         ORDER BY inicio_timestamp DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const total = await this.metricsCollector.db.get(
        `SELECT COUNT(*) as total FROM atendimentos ${whereQuery}`,
        params
      );

      res.json({
        atendimentos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.total,
          pages: Math.ceil(total.total / limit)
        }
      });
    } catch (error) {
      console.error('❌ Erro ao obter atendimentos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém eventos de usuário
   */
  async getEventosUsuario(req, res) {
    try {
      const { usuarioId } = req.params;
      const { limit = 100 } = req.query;
      
      await this.metricsCollector.ensureInitialized();
      
      const eventos = await this.metricsCollector.db.all(
        `SELECT * FROM eventos_usuario 
         WHERE usuario_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [usuarioId, limit]
      );

      res.json(eventos);
    } catch (error) {
      console.error('❌ Erro ao obter eventos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém métricas de sistema
   */
  async getMetricasSistema(req, res) {
    try {
      const { servico, periodo = '7d' } = req.query;
      
      await this.metricsCollector.ensureInitialized();
      
      let whereClause = [];
      let params = [];
      
      if (servico) {
        whereClause.push('servico = ?');
        params.push(servico);
      }
      
      // Definir período
      let periodoClause = '';
      switch (periodo) {
        case '1d':
          periodoClause = "DATE(timestamp) >= DATE('now', '-1 days')";
          break;
        case '7d':
          periodoClause = "DATE(timestamp) >= DATE('now', '-7 days')";
          break;
        case '30d':
          periodoClause = "DATE(timestamp) >= DATE('now', '-30 days')";
          break;
        default:
          periodoClause = "DATE(timestamp) >= DATE('now', '-7 days')";
      }
      
      whereClause.push(periodoClause);
      
      const whereQuery = `WHERE ${whereClause.join(' AND ')}`;
      
      const metricas = await this.metricsCollector.db.all(
        `SELECT * FROM metricas_sistema ${whereQuery} 
         ORDER BY timestamp DESC 
         LIMIT 500`,
        params
      );

      res.json(metricas);
    } catch (error) {
      console.error('❌ Erro ao obter métricas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Exporta relatório
   */
  async exportRelatorio(req, res) {
    try {
      const { tipo = 'geral', formato = 'json' } = req.query;
      
      await this.metricsCollector.ensureInitialized();
      
      let dados;
      
      switch (tipo) {
        case 'geral':
          dados = await this.metricsCollector.obterEstatisticasGerais();
          break;
        case 'graficos':
          dados = await this.metricsCollector.obterDadosGraficos();
          break;
        case 'atendimentos':
          dados = await this.metricsCollector.db.all(
            'SELECT * FROM atendimentos ORDER BY inicio_timestamp DESC LIMIT 1000'
          );
          break;
        default:
          return res.status(400).json({ error: 'Tipo de relatório inválido' });
      }

      if (formato === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.json"`);
        res.json(dados);
      } else {
        res.status(400).json({ error: 'Formato não suportado' });
      }
    } catch (error) {
      console.error('❌ Erro ao exportar relatório:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = { DashboardController };
