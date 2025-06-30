const { URLS, CONTATOS, CERTIDOES_LINKS, EMOJIS } = require("../config/constants");

/**
 * Cria resposta com mídia para certidões - Inicia emissão automática
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem de início do fluxo automático
 */
function criarRespostaCertidoes(nome) {
  return `${EMOJIS.DOCUMENTO} *Emissão Automática de Certidões*

${nome}, vou te ajudar a emitir sua certidão de forma rápida e automática!

${EMOJIS.INFO} *Se não conseguir automaticamente, você pode:*
🔗 Acessar o Portal do Contribuinte: ${URLS.PORTAL_CONTRIBUINTE}

📧 *Dúvidas:* ${CONTATOS.EMAIL_FAZENDA}

---

Para começar, preciso saber o *tipo de contribuinte*:

*1* - Pessoa Física ou Jurídica (PF/PJ)
*2* - Imóvel
*3* - Empresa

Digite o número correspondente:`;
}

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
