const { ESTADOS } = require("../config/constants");

// Controle de Estados do Atendimento
const estadosUsuario = new Map();

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

module.exports = {
  obterEstadoUsuario,
  definirEstadoUsuario,
  limparEstadoUsuario,
  obterTodosEstados
};
