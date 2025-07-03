const { URLS, CONTATOS, EMOJIS, MENSAGENS } = require("../config/constants");

/**
 * Gera o menu principal
 * @param {string} nome - Nome do usuário
 * @returns {string} Texto do menu principal
 */
function gerarMenuPrincipal(nome) {
  return MENSAGENS.MENU_PRINCIPAL(nome);
}

/**
 * Gera resposta de encerramento
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem de encerramento
 */
function gerarRespstaEncerramento(nome) {
  return MENSAGENS.DESPEDIDA;
}

/**
 * Gera resposta de agradecimento
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem de agradecimento
 */
function gerarRespostaAgradecimento(nome) {
  return MENSAGENS.AGRADECIMENTO;
}

/**
 * Gera resposta para solicitação de atendente humano
 * @param {string} nome - Nome do usuário
 * @returns {string} Informações para contato humano
 */
function gerarRespostaAtendente(nome) {
  return MENSAGENS.ATENDENTE_HUMANO;
}

/**
 * Gera resposta padrão para mensagens não reconhecidas
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem padrão
 */
function gerarRespostaPadrao(nome) {
  return MENSAGENS.RESPOSTA_PADRAO(nome);
}

module.exports = {
  gerarMenuPrincipal,
  gerarRespstaEncerramento,
  gerarRespostaAgradecimento,
  gerarRespostaAtendente,
  gerarRespostaPadrao,
};
