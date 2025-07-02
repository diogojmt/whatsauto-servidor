const { URLS, CONTATOS, EMOJIS } = require("../config/constants");

/**
 * Gera o menu principal
 * @param {string} nome - Nome do usuário
 * @returns {string} Texto do menu principal
 */
function gerarMenuPrincipal(nome) {
  return `Olá ${nome}! ${EMOJIS.SAUDACAO} Seja bem-vindo ao meu atendimento virtual!

Escolha uma das opções abaixo digitando o número:

*1* - ${EMOJIS.DOCUMENTO} Segunda via de DAM's
*2* - ${EMOJIS.DOCUMENTO} Certidões de Regularidade Fiscal
*3* - 🧾 NFSe e ISSQN
*4* - ${EMOJIS.MENU} Lista de Substitutos Tributários
*5* - ${EMOJIS.DINHEIRO} TFLF 2025
*6* - 🏠 Consulta de BCI (Boletim de Cadastro Imobiliário)
*0* - ${EMOJIS.SAUDACAO} Encerrar Atendimento

Digite o número da opção desejada ou descreva sua dúvida.`;
}

/**
 * Gera resposta de encerramento
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem de encerramento
 */
function gerarRespstaEncerramento(nome) {
  return `${EMOJIS.SAUDACAO} *Encerrando Atendimento*

${nome}, agradecemos por utilizar nossos serviços digitais!

🏛️ *Prefeitura de Arapiraca - Secretaria da Fazenda*

Para um novo atendimento, digite *menu* ou inicie uma nova conversa.

Tenha um ótimo dia! ${EMOJIS.FELIZ}`;
}

/**
 * Gera resposta de agradecimento
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem de agradecimento
 */
function gerarRespostaAgradecimento(nome) {
  return `${EMOJIS.FELIZ} *Atendimento Finalizado*

${nome}, foi um prazer ajudá-lo(a) hoje! 

${EMOJIS.SUCESSO} Sua consulta foi atendida com sucesso.

Caso precise de mais informações sobre tributos municipais, estarei sempre aqui para ajudar.

${EMOJIS.INFO} *Lembre-se:*
• Portal do Contribuinte: ${URLS.PORTAL_CONTRIBUINTE}
• NFSe: ${URLS.NFSE_PORTAL}

Tenha um excelente dia! ${EMOJIS.SAUDACAO}

*Atendimento encerrado automaticamente*`;
}

/**
 * Gera resposta para solicitação de atendente humano
 * @param {string} nome - Nome do usuário
 * @returns {string} Informações para contato humano
 */
function gerarRespostaAtendente(nome) {
  return `👨‍💼 *Solicitação de Atendimento Humano*

${nome}, para falar com um atendente, procure diretamente:

${EMOJIS.ENDERECO} *Secretaria da Fazenda Municipal*
${CONTATOS.ENDERECO}
🗺️ ${URLS.GOOGLE_MAPS}

${EMOJIS.RELOGIO} *Horário de atendimento:*
${CONTATOS.HORARIO}
${EMOJIS.EMAIL} ${CONTATOS.EMAIL_FAZENDA}

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta padrão para mensagens não reconhecidas
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem padrão
 */
function gerarRespostaPadrao(nome) {
  return `${nome}, não consegui entender sua mensagem. 

${EMOJIS.ROBÔ} *Para continuar, você pode:*

• Digite *menu* para ver todas as opções disponíveis
• Digite *1* para Segunda via de DAM's
• Digite *2* para Certidões de Regularidade Fiscal
• Digite *3* para NFSe
• Digite *4* para Lista de Substitutos Tributários
• Digite *5* para TFLF 2025
• Digite *6* para Consulta de BCI
• Digite *0* para encerrar o atendimento

🏛️ *Ou compareça pessoalmente:*
Secretaria da Fazenda Municipal
${EMOJIS.ENDERECO} ${CONTATOS.ENDERECO}
🗺️ ${URLS.GOOGLE_MAPS}
${EMOJIS.EMAIL} ${CONTATOS.EMAIL_FAZENDA}
${EMOJIS.RELOGIO} ${CONTATOS.HORARIO}`;
}

module.exports = {
  gerarMenuPrincipal,
  gerarRespstaEncerramento,
  gerarRespostaAgradecimento,
  gerarRespostaAtendente,
  gerarRespostaPadrao
};
