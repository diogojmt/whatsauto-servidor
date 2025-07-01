const fs = require("fs");
const path = require("path");

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Níveis de log
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Configuração do logger
const config = {
  level: process.env.LOG_LEVEL || "INFO",
  console: process.env.NODE_ENV !== "production",
  file: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
};

/**
 * Formata a mensagem de log
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem
 * @param {object} meta - Metadados
 * @returns {string} Mensagem formatada
 */
function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr =
    Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level.padEnd(5)} | ${message}${metaStr}`;
}

/**
 * Escreve log no arquivo
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem
 * @param {object} meta - Metadados
 */
function writeToFile(level, message, meta = {}) {
  if (!config.file) return;

  try {
    const logFile = path.join(
      logsDir,
      `app-${new Date().toISOString().split("T")[0]}.log`
    );
    const formattedMessage = formatMessage(level, message, meta);

    fs.appendFileSync(logFile, formattedMessage + "\n", "utf8");

    // Verificar tamanho do arquivo e rotacionar se necessário
    const stats = fs.statSync(logFile);
    if (stats.size > config.maxFileSize) {
      rotateLogFile(logFile);
    }
  } catch (error) {
    console.error("Erro ao escrever log:", error.message);
  }
}

/**
 * Rotaciona arquivo de log
 * @param {string} logFile - Caminho do arquivo
 */
function rotateLogFile(logFile) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rotatedFile = logFile.replace(".log", `-${timestamp}.log`);

    fs.renameSync(logFile, rotatedFile);

    // Limpar arquivos antigos
    cleanOldLogFiles();
  } catch (error) {
    console.error("Erro ao rotacionar log:", error.message);
  }
}

/**
 * Limpa arquivos de log antigos
 */
function cleanOldLogFiles() {
  try {
    const files = fs
      .readdirSync(logsDir)
      .filter((file) => file.endsWith(".log"))
      .map((file) => ({
        name: file,
        path: path.join(logsDir, file),
        time: fs.statSync(path.join(logsDir, file)).mtime,
      }))
      .sort((a, b) => b.time - a.time);

    // Manter apenas os últimos arquivos
    if (files.length > config.maxFiles) {
      files.slice(config.maxFiles).forEach((file) => {
        fs.unlinkSync(file.path);
      });
    }
  } catch (error) {
    console.error("Erro ao limpar logs antigos:", error.message);
  }
}

/**
 * Função genérica de log
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem
 * @param {object} meta - Metadados
 */
function log(level, message, meta = {}) {
  const levelNum = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  const configLevelNum =
    LOG_LEVELS[config.level.toUpperCase()] || LOG_LEVELS.INFO;

  if (levelNum > configLevelNum) return;

  const formattedMessage = formatMessage(level, message, meta);

  // Log no console
  if (config.console) {
    switch (level.toUpperCase()) {
      case "ERROR":
        console.error(formattedMessage);
        break;
      case "WARN":
        console.warn(formattedMessage);
        break;
      case "DEBUG":
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  // Log no arquivo
  writeToFile(level, message, meta);
}

// Exportar funções de log
const logger = {
  error: (message, meta = {}) => log("ERROR", message, meta),
  warn: (message, meta = {}) => log("WARN", message, meta),
  info: (message, meta = {}) => log("INFO", message, meta),
  debug: (message, meta = {}) => log("DEBUG", message, meta),

  // Configuração
  setLevel: (level) => {
    config.level = level.toUpperCase();
  },

  setConsole: (enabled) => {
    config.console = enabled;
  },

  setFile: (enabled) => {
    config.file = enabled;
  },
};

module.exports = logger;
