const { URLS, CONTATOS, MANUAIS_NFSE, EMOJIS } = require("../config/constants");

/**
 * Gera menu NFSe e ISSQN
 * @param {string} nome - Nome do usuário
 * @returns {string} Menu NFSe
 */
function gerarMenuNFSe(nome) {
  return `🧾 *NFSe e ISSQN*

${nome}, escolha uma das opções abaixo digitando o número:

*3.1* - 🌐 Acesso ao Site para Emissão
*3.2* - ❓ Dúvidas e Reclamações do Sistema
*3.3* - ${EMOJIS.MENU} Manuais de Utilização do Sistema
------------------------------------------------------------
*3.4* - ${EMOJIS.MENU} Alíquota, Deduções e Local de Tributação do ISS

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta para acesso ao site NFSe
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta para acesso NFSe
 */
function gerarRespostaAcessoNFSe(nome) {
  return `🌐 *Acesso ao Site para Emissão*

${nome}, para acessar o site de emissão de NFSe:

🔗 *Link de acesso:*
${URLS.NFSE_PORTAL}

📝 *Orientações ao contribuinte:*
Escolha a opção Login Empresa/Autônomo

Digite *3* para voltar às opções de NFSe, *menu* para o menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta para dúvidas NFSe
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta para dúvidas
 */
function gerarRespostaDuvidasNFSe(nome) {
  return `❓ *Dúvidas e Reclamações*

${nome}, para dúvidas e reclamações sobre NFSe:

📝 *Utilize um dos canais abaixo:*
${EMOJIS.EMAIL} Via e-mail: ${CONTATOS.EMAIL_NFSE_SUPORTE}
${EMOJIS.TELEFONE} Telefone: ${CONTATOS.TELEFONE_NFSE}

Digite *3* para voltar às opções de NFSe, *menu* para o menu principal ou *0* para encerrar.`;
}

/**
 * Gera menu de manuais NFSe
 * @param {string} nome - Nome do usuário
 * @returns {string} Menu de manuais
 */
function gerarMenuManuaisNFSe(nome) {
  return `${EMOJIS.MENU} *Manuais de Utilização do Sistema*

${nome}, escolha um dos manuais abaixo digitando o número:

*3.3.1* - 🎯 Tutorial Primeiro Acesso
*3.3.2* - 👥 Emissão de NFSE para tomadores cadastrados
*3.3.3* - 👤 Emissão de NFSE para tomadores não cadastrados
*3.3.4* - 💳 Emissão de Guias de Pagamento
*3.3.5* - ${EMOJIS.ERRO} Cancelar NFSE Emitidas
*3.3.6* - 🚫 Recusa de Notas Fiscais Eletrônicas de Serviços Recebidas
*3.3.7* - ✏️ Tutorial Carta de Correção
*3.3.8* - 🔄 Substituição de Nota Fiscal
*3.3.9* - 📝 Cadastro no Nota Fiscal Avulsa
*3.3.10* - ${EMOJIS.MENU} Escrituração de Nota Avulsa

Digite *3* para voltar às opções de NFSe, *menu* para o menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta para manual específico
 * @param {string} codigo - Código do manual (3.3.1, 3.3.2, etc.)
 * @param {string} titulo - Título do manual
 * @param {string} link - Link do manual
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta do manual
 */
function gerarRespostaManual(codigo, titulo, link, nome) {
  return `${titulo}

${nome}, para acessar ${titulo.toLowerCase()}:

🔗 *Link de acesso:*
${link}

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
}

/**
 * Gera todas as respostas de manuais
 * @param {string} nome - Nome do usuário
 * @returns {Object} Objeto com todas as respostas de manuais
 */
function gerarRespostasManuais(nome) {
  return {
    "3.3.1": gerarRespostaManual("3.3.1", "🎯 *Tutorial Primeiro Acesso*", MANUAIS_NFSE.PRIMEIRO_ACESSO, nome),
    "3.3.2": gerarRespostaManual("3.3.2", "👥 *Emissão de NFSE para tomadores cadastrados*", MANUAIS_NFSE.TOMADORES_CADASTRADOS, nome),
    "3.3.3": gerarRespostaManual("3.3.3", "👤 *Emissão de NFSE para tomadores não cadastrados*", MANUAIS_NFSE.TOMADORES_NAO_CADASTRADOS, nome),
    "3.3.4": gerarRespostaManual("3.3.4", "💳 *Emissão de Guias de Pagamento*", MANUAIS_NFSE.GUIAS_PAGAMENTO, nome),
    "3.3.5": gerarRespostaManual("3.3.5", "❌ *Cancelar NFSE Emitidas*", MANUAIS_NFSE.CANCELAR_NFSE, nome),
    "3.3.6": gerarRespostaManual("3.3.6", "🚫 *Recusa de Notas Fiscais Eletrônicas de Serviços Recebidas*", MANUAIS_NFSE.RECUSA_NOTAS, nome),
    "3.3.7": gerarRespostaManual("3.3.7", "✏️ *Tutorial Carta de Correção*", MANUAIS_NFSE.CARTA_CORRECAO, nome),
    "3.3.8": gerarRespostaManual("3.3.8", "🔄 *Substituição de Nota Fiscal*", MANUAIS_NFSE.SUBSTITUICAO_NOTA, nome),
    "3.3.9": gerarRespostaManual("3.3.9", "📝 *Cadastro no Nota Fiscal Avulsa*", MANUAIS_NFSE.CADASTRO_AVULSA, nome),
    "3.3.10": gerarRespostaManual("3.3.10", "📋 *Escrituração de Nota Avulsa*", MANUAIS_NFSE.ESCRITURACAO_AVULSA, nome)
  };
}

/**
 * Gera menu de consulta ISS
 * @param {string} nome - Nome do usuário
 * @returns {string} Menu de consulta ISS
 */
function gerarMenuConsultaISS(nome) {
  return `${EMOJIS.MENU} *Alíquota, Deduções e Local de Tributação*

${nome}, para consultar informações sobre alíquotas, deduções e local de tributação:

📝 *Formas de consulta:*

🔢 *Por código do item de serviço:*
• Conforme Lei Complementar 116/2003
• Mínimo 3 dígitos
• Exemplo: 102 (para Programação)
• Exemplo: 1402 (para Assistência técnica)

📝 *Por descrição do serviço:*
• Digite parte da descrição da atividade
• Mínimo 3 caracteres
• Exemplo: "programação" ou "assistência"
• Exemplo: "medicina" ou "engenharia"

Digite *3* para voltar ao menu NFSe e ISSQN, *menu* para o menu principal ou *0* para encerrar.`;
}

module.exports = {
  gerarMenuNFSe,
  gerarRespostaAcessoNFSe,
  gerarRespostaDuvidasNFSe,
  gerarMenuManuaisNFSe,
  gerarRespostasManuais,
  gerarMenuConsultaISS
};
