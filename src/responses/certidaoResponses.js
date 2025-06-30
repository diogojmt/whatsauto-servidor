const { URLS, CONTATOS, CERTIDOES_LINKS, EMOJIS } = require("../config/constants");

/**
 * Cria resposta com mídia para certidões
 * @param {string} nome - Nome do usuário
 * @returns {Object} Objeto com tipo de resposta e conteúdo
 */
function criarRespostaCertidoes(nome) {
  const texto = `${EMOJIS.DOCUMENTO} *Certidões de Regularidade Fiscal e Autenticações*

${nome}, escolha uma das opções:

${EMOJIS.MENU} *NOVAS OPÇÕES AUTOMATIZADAS:*
*2.0* - Emitir certidão automaticamente (via chatbot)

${EMOJIS.MENU} *OPÇÕES TRADICIONAIS:*
*2.1* - Certidão Imobiliária
*2.2* - Certidão Geral
*2.3* - Verificar autenticidade

🔗 *Ou acesse o Portal do Contribuinte:*
${URLS.PORTAL_CONTRIBUINTE}

${EMOJIS.EMAIL} *Dúvidas ou informações:*
${CONTATOS.EMAIL_FAZENDA}

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;

  return {
    type: "media",
    text: `${texto}

🖼️ *Clique aqui para ver a imagem de apoio*
${URLS.GITHUB_IMAGENS}Portal_3_vias.png?raw=true`,
    media: `${URLS.GITHUB_IMAGENS}Portal_3_vias.png?raw=true`
  };
}

/**
 * Gera resposta para certidão imobiliária
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta para certidão imobiliária
 */
function gerarRespostaCertidaoImobiliaria(nome) {
  return `🏘️ *Certidão Imobiliária*

${nome}, para emitir sua certidão imobiliária:

🔗 *Link de acesso:*
${CERTIDOES_LINKS.IMOBILIARIA}

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número da Inscrição do Imóvel

Digite *2* para voltar às opções de certidões, *menu* para o menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta para certidão geral
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta para certidão geral
 */
function gerarRespostaCertidaoGeral(nome) {
  return `${EMOJIS.MENU} *Certidão Geral*

${nome}, para emitir sua certidão geral:

🔗 *Link de acesso:*
${CERTIDOES_LINKS.GERAL}

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número do CPF/CNPJ do Cidadão

Digite *2* para voltar às opções de certidões, *menu* para o menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta para verificação de autenticidade
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta para autenticidade
 */
function gerarRespostaAutenticidade(nome) {
  return `${EMOJIS.SUCESSO} *Autenticidade*

${nome}, para verificar a autenticidade de uma certidão:

🔗 *Link de acesso:*
${CERTIDOES_LINKS.AUTENTICIDADE}

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o código de autenticidade da certidão.

Digite *2* para voltar às opções de certidões, *menu* para o menu principal ou *0* para encerrar.`;
}

module.exports = {
  criarRespostaCertidoes,
  gerarRespostaCertidaoImobiliaria,
  gerarRespostaCertidaoGeral,
  gerarRespostaAutenticidade
};
