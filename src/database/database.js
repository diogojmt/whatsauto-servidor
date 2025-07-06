const sqlite3 = require("sqlite3").verbose();
const path = require("path");

/**
 * Classe para gerenciar o banco de dados SQLite do dashboard
 */
class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, "../../data/dashboard.db");
  }

  /**
   * Inicializa a conexão com o banco de dados
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error("❌ Erro ao conectar com o banco:", err);
          reject(err);
        } else {
          console.log("✅ Conectado ao banco SQLite");
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

      // Tabela de sessões - CORRIGIDA para usar inicio_timestamp
      `CREATE TABLE IF NOT EXISTS sessoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        sessao_id TEXT UNIQUE NOT NULL,
        inicio_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        fim_timestamp DATETIME,
        total_mensagens INTEGER DEFAULT 0,
        total_servicos_usados INTEGER DEFAULT 0,
        servicos_usados TEXT,
        satisfacao INTEGER,
        ativa BOOLEAN DEFAULT 1
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
      )`,
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Verificar e adicionar colunas faltantes se necessário
    await this.addMissingColumns();

    // Criar índices para performance
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_atendimentos_usuario ON atendimentos(usuario_id)",
      "CREATE INDEX IF NOT EXISTS idx_atendimentos_tipo ON atendimentos(tipo_atendimento)",
      "CREATE INDEX IF NOT EXISTS idx_atendimentos_timestamp ON atendimentos(inicio_timestamp)",
      "CREATE INDEX IF NOT EXISTS idx_eventos_usuario ON eventos_usuario(usuario_id)",
      "CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON eventos_usuario(timestamp)",
      "CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id)",
      "CREATE INDEX IF NOT EXISTS idx_sessoes_timestamp ON sessoes(inicio_timestamp)",
      "CREATE INDEX IF NOT EXISTS idx_metricas_servico ON metricas_sistema(servico)",
      "CREATE INDEX IF NOT EXISTS idx_metricas_timestamp ON metricas_sistema(timestamp)",
    ];

    for (const index of indexes) {
      await this.run(index);
    }
  }

  /**
   * Adiciona colunas faltantes em tabelas existentes
   */
  async addMissingColumns() {
    try {
      // Verificar se a coluna inicio_timestamp existe na tabela sessoes
      const tableInfo = await this.all("PRAGMA table_info(sessoes)");
      const hasInicioTimestamp = tableInfo.some(
        (col) => col.name === "inicio_timestamp"
      );
      const hasAtiva = tableInfo.some((col) => col.name === "ativa");

      if (!hasInicioTimestamp) {
        console.log(
          "🔧 Adicionando coluna inicio_timestamp à tabela sessoes..."
        );
        await this.run(
          "ALTER TABLE sessoes ADD COLUMN inicio_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP"
        );

        // Migrar dados da coluna 'inicio' se ela existir
        const hasInicio = tableInfo.some((col) => col.name === "inicio");
        if (hasInicio) {
          await this.run(
            "UPDATE sessoes SET inicio_timestamp = inicio WHERE inicio_timestamp IS NULL"
          );
        }
      }

      if (!hasAtiva) {
        console.log("🔧 Adicionando coluna ativa à tabela sessoes...");
        await this.run(
          "ALTER TABLE sessoes ADD COLUMN ativa BOOLEAN DEFAULT 1"
        );
      }

      // Renomear fim para fim_timestamp se necessário
      const hasFim = tableInfo.some((col) => col.name === "fim");
      const hasFimTimestamp = tableInfo.some(
        (col) => col.name === "fim_timestamp"
      );

      if (hasFim && !hasFimTimestamp) {
        console.log("🔧 Adicionando coluna fim_timestamp à tabela sessoes...");
        await this.run("ALTER TABLE sessoes ADD COLUMN fim_timestamp DATETIME");
        await this.run(
          "UPDATE sessoes SET fim_timestamp = fim WHERE fim_timestamp IS NULL"
        );
      }
    } catch (error) {
      console.error("❌ Erro ao adicionar colunas faltantes:", error);
      // Não rejeitar aqui para não quebrar a inicialização
    }
  }

  /**
   * Executa uma query SQL
   */
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          console.error("❌ Erro na query:", err);
          console.error("SQL:", sql);
          console.error("Params:", params);
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
          console.error("❌ Erro na query:", err);
          console.error("SQL:", sql);
          console.error("Params:", params);
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
          console.error("❌ Erro na query:", err);
          console.error("SQL:", sql);
          console.error("Params:", params);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Verifica se uma tabela existe
   */
  async tableExists(tableName) {
    const result = await this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return !!result;
  }

  /**
   * Obtém informações sobre as colunas de uma tabela
   */
  async getTableInfo(tableName) {
    return await this.all(`PRAGMA table_info(${tableName})`);
  }

  /**
   * Fecha a conexão com o banco
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log("✅ Conexão com banco fechada");
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = { Database };
