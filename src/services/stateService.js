const { ESTADOS } = require("../config/constants");

// Controle de Estados do Atendimento
const estadosUsuario = new Map();

// Controle de dados temporários (para fluxos que precisam guardar informações)
const dadosTemporarios = new Map();

/**
 * Obtém o estado atual do usuário
 * @param {string} sender - ID do usuário
 * @returns {string} Estado atual do usuário
 */
function obterEstadoUsuario(sender) {
  return estadosUsuario.get(sender) || ESTADOS.MENU_PRINCIPAL;
}

/**
 * Define o estado do usuário
 * @param {string} sender - ID do usuário
 * @param {string} estado - Novo estado
 */
function definirEstadoUsuario(sender, estado) {
  estadosUsuario.set(sender, estado);
}

/**
 * Remove o estado do usuário (limpa memória)
 * @param {string} sender - ID do usuário
 */
function limparEstadoUsuario(sender) {
  estadosUsuario.delete(sender);
}

/**
 * Obtém todos os estados ativos (para debug)
 * @returns {Map} Map com todos os estados
 */
function obterTodosEstados() {
  return estadosUsuario;
}

/**
 * Obtém os dados temporários do usuário
 * @param {string} sender - ID do usuário
 * @returns {Object|null} Dados temporários ou null
 */
function obterDadosTemporarios(sender) {
  return dadosTemporarios.get(sender) || null;
}

/**
 * Define dados temporários para o usuário
 * @param {string} sender - ID do usuário
 * @param {Object} dados - Dados a serem armazenados
 */
function definirDadosTemporarios(sender, dados) {
  dadosTemporarios.set(sender, dados);
}

/**
 * Limpa os dados temporários do usuário
 * @param {string} sender - ID do usuário
 */
function limparDadosTemporarios(sender) {
  dadosTemporarios.delete(sender);
}

module.exports = {
  obterEstadoUsuario,
  definirEstadoUsuario,
  limparEstadoUsuario,
  obterTodosEstados,
  obterDadosTemporarios,
  definirDadosTemporarios,
  limparDadosTemporarios
};
