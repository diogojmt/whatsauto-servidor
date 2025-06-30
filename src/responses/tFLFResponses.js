const { URLS, EMOJIS } = require("../config/constants");

/**
 * Gera resposta para lista de substitutos tributários
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta para substitutos
 */
function gerarRespostaSubstitutos(nome) {
  return `${EMOJIS.MENU} *Lista de Substitutos Tributários*

${nome}, para consultar a lista de substitutos tributários:

🔗 *Link de acesso:*
${URLS.SUBSTITUTOS_TRIBUTARIOS}

📝 *Orientações ao contribuinte:*
Decreto 2.842/2023 - Dispõe sobre o regíme de responsabilidade supletiva, sobre contribuintes e/ou responsáveis tributários e adota providências correlatas.

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
}

/**
 * Gera menu TFLF 2025
 * @param {string} nome - Nome do usuário
 * @returns {string} Menu TFLF
 */
function gerarMenuTFLF(nome) {
  return `${EMOJIS.DINHEIRO} *TFLF 2025*

${nome}, escolha uma das opções abaixo digitando o número:

*5.1* - ${EMOJIS.BUSCA} Consultar Valores por CNAE
*5.2* - ${EMOJIS.MENU} Baixar Anexo I do CTM (Planilha Geral)

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
}

/**
 * Gera menu de consulta CNAE
 * @param {string} nome - Nome do usuário
 * @returns {string} Menu de consulta CNAE
 */
function gerarMenuConsultaCNAE(nome) {
  return `${EMOJIS.BUSCA} *Consultar Valores por CNAE*

${nome}, para consultar o valor da TFLF por atividade:

📝 *Formas de consulta:*

🔢 *Por código CNAE:*
• Mínimo 4 dígitos
• Exemplo: 4711 (para comércio varejista)
• Apenas números, sem letras

📝 *Por descrição da atividade:*
• Digite parte da descrição da atividade
• Mínimo 3 caracteres
• Exemplo: "comercio" ou "transporte"
• Exemplo: "servicos" ou "industria"

O sistema buscará todas as atividades que contenham os termos digitados.

Digite *5* para voltar ao menu TFLF, *menu* para o menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta para baixar planilha TFLF
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta para planilha
 */
function gerarRespostaPlanilhaTFLF(nome) {
  return `${EMOJIS.MENU} *Baixar Anexo I do CTM (Planilha Geral)*

${nome}, para consultar a planilha completa com todos os valores da TFLF 2025:

🔗 *Link de acesso:*
${URLS.TFLF_PLANILHA}

📝 *Orientações ao contribuinte:*
Este documento contém o Anexo I da Lei 2.342/2003 - CTM de Arapiraca com todos os códigos de atividades e respectivos valores da Taxa de Funcionamento e Localização de Atividades (TFLF) de 2020 a 2025.

Digite *5* para voltar ao menu TFLF, *menu* para o menu principal ou *0* para encerrar.`;
}

module.exports = {
  gerarRespostaSubstitutos,
  gerarMenuTFLF,
  gerarMenuConsultaCNAE,
  gerarRespostaPlanilhaTFLF
};
