const { URLS } = require("../config/constants");

/**
 * Cria resposta com mídia
 * @param {string} texto - Texto da resposta
 * @param {string} imagemPath - Caminho da imagem (opcional)
 * @param {Object} req - Request object (opcional)
 * @returns {Object} Objeto com tipo de resposta
 */
function criarRespostaComMidia(texto, imagemPath = null, req = null) {
  if (imagemPath) {
    let linkImagem = "";

    if (imagemPath === "Portal_2_vias.png") {
      linkImagem = `${URLS.GITHUB_IMAGENS}Portal_2_vias.png?raw=true`;
    }

    if (imagemPath === "Portal_3_vias.png") {
      linkImagem = `${URLS.GITHUB_IMAGENS}Portal_3_vias.png?raw=true`;
    }

    if (linkImagem) {
      return {
        type: "media",
        text: `${texto}

🖼️ *Clique aqui para ver a imagem de apoio*
${linkImagem}`,
        media: linkImagem,
      };
    }
  }
  
  return {
    type: "text",
    text: texto,
  };
}

/**
 * Verifica se a mensagem é do próprio sistema (para evitar loop)
 * @param {string} message - Mensagem a verificar
 * @returns {boolean} True se é mensagem do sistema
 */
function ehMensagemDoSistema(message) {
  return (
    message.includes("Escolha uma das opções abaixo digitando o número:") &&
    message.includes("1 - 📄 Segunda via de DAM's") &&
    message.includes("Digite o número da opção desejada")
  );
}

module.exports = {
  criarRespostaComMidia,
  ehMensagemDoSistema
};
