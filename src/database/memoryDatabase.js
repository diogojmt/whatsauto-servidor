/**
 * Banco de dados em memória para desenvolvimento/teste
 * Substitui o SQLite quando há problemas de instalação
 */
class MemoryDatabase {
  constructor() {
    this.data = {
      atendimentos: [],
      eventos_usuario: [],
      metricas_sistema: [],
      sessoes: [],
      admin_users: []
    };
    this.nextId = 1;
  }

  async init() {
    console.log('✅ Banco de dados em memória inicializado');
    
    // Criar usuário admin padrão para teste
    const bcrypt = require('bcrypt');
    const adminPassword = bcrypt.hashSync('admin123', 10);
    
    this.data.admin_users.push({
      id: 1,
      username: 'admin',
      password_hash: adminPassword,
      email: 'admin@whatsauto.com',
      created_at: new Date().toISOString(),
      is_active: 1
    });
    
    console.log('👤 Usuário admin criado: admin / admin123');
  }

  async run(sql, params = []) {
    // Simular INSERT
    if (sql.includes('INSERT INTO atendimentos')) {
      const [usuario_id, tipo_atendimento, status, dados_consulta] = params;
      const id = this.nextId++;
      const item = {
        id,
        usuario_id,
        tipo_atendimento,
        status,
        dados_consulta,
        inicio_timestamp: new Date().toISOString(),
        fim_timestamp: null,
        duracao_segundos: null,
        sucesso: 0,
        erro_detalhes: null,
        created_at: new Date().toISOString()
      };
      this.data.atendimentos.push(item);
      return { id, changes: 1 };
    }
    
    if (sql.includes('INSERT INTO eventos_usuario')) {
      const [usuario_id, tipo_evento, detalhes, sessao_id, intencao_detectada, confianca_intencao] = params;
      const id = this.nextId++;
      const item = {
        id,
        usuario_id,
        tipo_evento,
        detalhes,
        sessao_id,
        intencao_detectada,
        confianca_intencao,
        timestamp: new Date().toISOString()
      };
      this.data.eventos_usuario.push(item);
      return { id, changes: 1 };
    }
    
    if (sql.includes('INSERT INTO metricas_sistema')) {
      const [servico, metrica, valor, detalhes] = params;
      const id = this.nextId++;
      const item = {
        id,
        servico,
        metrica,
        valor,
        detalhes,
        timestamp: new Date().toISOString()
      };
      this.data.metricas_sistema.push(item);
      return { id, changes: 1 };
    }
    
    if (sql.includes('INSERT INTO sessoes')) {
      const [usuario_id, sessao_id] = params;
      const id = this.nextId++;
      const item = {
        id,
        usuario_id,
        sessao_id,
        inicio: new Date().toISOString(),
        fim: null,
        total_mensagens: 0,
        total_servicos_usados: 0,
        servicos_usados: null,
        satisfacao: null
      };
      this.data.sessoes.push(item);
      return { id, changes: 1 };
    }
    
    // Simular UPDATE
    if (sql.includes('UPDATE atendimentos') && sql.includes('WHERE id = ?')) {
      const id = params[params.length - 1];
      const item = this.data.atendimentos.find(a => a.id === id);
      if (item) {
        item.fim_timestamp = new Date().toISOString();
        item.duracao_segundos = params[0];
        item.sucesso = params[1];
        item.erro_detalhes = params[2];
        item.status = params[3];
        return { changes: 1 };
      }
    }
    
    if (sql.includes('UPDATE sessoes') && sql.includes('total_mensagens')) {
      const sessao_id = params[0];
      const item = this.data.sessoes.find(s => s.sessao_id === sessao_id);
      if (item) {
        item.total_mensagens += 1;
        return { changes: 1 };
      }
    }
    
    return { changes: 0 };
  }

  async get(sql, params = []) {
    if (sql.includes('SELECT inicio_timestamp FROM atendimentos WHERE id = ?')) {
      const id = params[0];
      const item = this.data.atendimentos.find(a => a.id === id);
      return item ? { inicio_timestamp: item.inicio_timestamp } : null;
    }
    
    if (sql.includes('SELECT * FROM admin_users WHERE username = ?')) {
      const username = params[0];
      return this.data.admin_users.find(u => u.username === username && u.is_active === 1);
    }
    
    if (sql.includes('SELECT servicos_usados FROM sessoes WHERE sessao_id = ?')) {
      const sessao_id = params[0];
      const item = this.data.sessoes.find(s => s.sessao_id === sessao_id);
      return item ? { servicos_usados: item.servicos_usados } : null;
    }
    
    // Estatísticas
    if (sql.includes("COUNT(*) as total FROM atendimentos") && sql.includes("DATE('now')")) {
      const hoje = new Date().toISOString().split('T')[0];
      const count = this.data.atendimentos.filter(a => a.inicio_timestamp.startsWith(hoje)).length;
      return { total: count };
    }
    
    if (sql.includes("COUNT(*) as total FROM atendimentos") && sql.includes("'-7 days'")) {
      const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const count = this.data.atendimentos.filter(a => new Date(a.inicio_timestamp) >= semanaAtras).length;
      return { total: count };
    }
    
    if (sql.includes("taxa_sucesso")) {
      const finalizados = this.data.atendimentos.filter(a => a.fim_timestamp);
      const total = finalizados.length;
      const sucessos = finalizados.filter(a => a.sucesso === 1).length;
      return {
        total,
        sucessos,
        taxa_sucesso: total > 0 ? Math.round((sucessos / total) * 100) : 0
      };
    }
    
    if (sql.includes("COUNT(DISTINCT usuario_id) as total")) {
      const usuarios = new Set(this.data.atendimentos.map(a => a.usuario_id));
      return { total: usuarios.size };
    }
    
    if (sql.includes("AVG(duracao_segundos) as media_segundos")) {
      const comDuracao = this.data.atendimentos.filter(a => a.duracao_segundos);
      const media = comDuracao.length > 0 ? 
        comDuracao.reduce((sum, a) => sum + a.duracao_segundos, 0) / comDuracao.length : 0;
      return { media_segundos: Math.round(media) };
    }
    
    return null;
  }

  async all(sql, params = []) {
    // Tipos populares
    if (sql.includes('GROUP BY tipo_atendimento') && sql.includes('ORDER BY total DESC')) {
      const tipos = {};
      this.data.atendimentos.forEach(a => {
        tipos[a.tipo_atendimento] = (tipos[a.tipo_atendimento] || 0) + 1;
      });
      
      return Object.entries(tipos)
        .map(([tipo, total]) => ({ tipo_atendimento: tipo, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }
    
    // Atendimentos por dia
    if (sql.includes('GROUP BY DATE(inicio_timestamp)')) {
      const dias = {};
      this.data.atendimentos.forEach(a => {
        const data = a.inicio_timestamp.split('T')[0];
        if (!dias[data]) {
          dias[data] = { total: 0, sucessos: 0 };
        }
        dias[data].total += 1;
        if (a.sucesso === 1) dias[data].sucessos += 1;
      });
      
      return Object.entries(dias)
        .map(([data, counts]) => ({ data, ...counts }))
        .sort((a, b) => a.data.localeCompare(b.data));
    }
    
    // Atendimentos por hora
    if (sql.includes('GROUP BY CAST(strftime')) {
      const horas = {};
      this.data.atendimentos.forEach(a => {
        const hora = new Date(a.inicio_timestamp).getHours();
        horas[hora] = (horas[hora] || 0) + 1;
      });
      
      return Object.entries(horas)
        .map(([hora, total]) => ({ hora: parseInt(hora), total }))
        .sort((a, b) => a.hora - b.hora);
    }
    
    // Lista de atendimentos
    if (sql.includes('SELECT * FROM atendimentos') && sql.includes('ORDER BY inicio_timestamp DESC')) {
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      
      return this.data.atendimentos
        .sort((a, b) => new Date(b.inicio_timestamp) - new Date(a.inicio_timestamp))
        .slice(offset, offset + limit);
    }
    
    return [];
  }

  async close() {
    console.log('✅ Banco de dados em memória fechado');
  }
}

module.exports = { Database: MemoryDatabase };
