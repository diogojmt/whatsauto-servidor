const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Classe para gerenciar o banco de dados SQLite do dashboard
 */
class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/dashboard.db');
  }

  /**
   * Inicializa a conexão com o banco de dados
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Erro ao conectar com o banco:', err);
          reject(err);
        } else {
          console.log('✅ Conectado ao banco SQLite');
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  /**
   * Cria as tabelas necessárias
   */
  async createTables() {
    const tables = [
      // Tabela de atendimentos
      `CREATE TABLE IF NOT EXISTS atendimentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        tipo_atendimento TEXT NOT NULL,
        status TEXT NOT NULL,
        inicio_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        fim_timestamp DATETIME,
        duracao_segundos INTEGER,
        sucesso BOOLEAN DEFAULT 0,
        erro_detalhes TEXT,
        dados_consulta TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela de eventos de usuário
      `CREATE TABLE IF NOT EXISTS eventos_usuario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        tipo_evento TEXT NOT NULL,
        detalhes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        sessao_id TEXT,
        intencao_detectada TEXT,
        confianca_intencao REAL
      )`,
      
      // Tabela de métricas de sistema
      `CREATE TABLE IF NOT EXISTS metricas_sistema (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        servico TEXT NOT NULL,
        metrica TEXT NOT NULL,
        valor REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        detalhes TEXT
      )`,
      
      // Tabela de sessões
      `CREATE TABLE IF NOT EXISTS sessoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        sessao_id TEXT UNIQUE NOT NULL,
        inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fim DATETIME,
        total_mensagens INTEGER DEFAULT 0,
        total_servicos_usados INTEGER DEFAULT 0,
        servicos_usados TEXT,
        satisfacao INTEGER
      )`,
      
      // Tabela de administradores
      `CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Criar índices para performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_atendimentos_usuario ON atendimentos(usuario_id)',
      'CREATE INDEX IF NOT EXISTS idx_atendimentos_tipo ON atendimentos(tipo_atendimento)',
      'CREATE INDEX IF NOT EXISTS idx_atendimentos_timestamp ON atendimentos(inicio_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_eventos_usuario ON eventos_usuario(usuario_id)',
      'CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON eventos_usuario(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id)',
      'CREATE INDEX IF NOT EXISTS idx_metricas_servico ON metricas_sistema(servico)',
      'CREATE INDEX IF NOT EXISTS idx_metricas_timestamp ON metricas_sistema(timestamp)'
    ];

    for (const index of indexes) {
      await this.run(index);
    }
  }

  /**
   * Executa uma query SQL
   */
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Erro na query:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Executa uma query que retorna dados
   */
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Erro na query:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Executa uma query que retorna múltiplos resultados
   */
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Erro na query:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Fecha a conexão com o banco
   */
  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Conexão com banco fechada');
          resolve();
        }
      });
    });
  }
}

module.exports = { Database };
