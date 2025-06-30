const { URLS, CONTATOS, EMOJIS } = require("../config/constants");

/**
 * Cria resposta com mídia para DAM's
 * @param {string} nome - Nome do usuário
 * @returns {Object} Objeto com tipo de resposta e conteúdo
 */
function criarRespostaDAM(nome) {
  const texto = `${EMOJIS.DOCUMENTO} *Segunda via de DAM's*

${nome}, para emitir a segunda via de DAMs, siga as instruções:

🔗 *Acesse o link:*
${URLS.PORTAL_CONTRIBUINTE}

${EMOJIS.MENU} *Instruções:*
• No portal, escolha uma das opções disponíveis para emissão de segunda via de DAMs
• Para facilitar a consulta tenha em mãos o CPF/CNPJ, Cadastro Geral ou Inscrição Imobiliária do contribuinte

${EMOJIS.EMAIL} *Dúvidas ou informações:*
${CONTATOS.EMAIL_FAZENDA}

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;

  return {
    type: "media",
    text: `${texto}

🖼️ *Clique aqui para ver a imagem de apoio*
${URLS.GITHUB_IMAGENS}Portal_2_vias.png?raw=true`,
    media: `${URLS.GITHUB_IMAGENS}Portal_2_vias.png?raw=true`,
  };
}

module.exports = {
  criarRespostaDAM,
};
