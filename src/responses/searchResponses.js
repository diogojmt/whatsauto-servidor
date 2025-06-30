const { formatarValorMonetario, formatarPorcentagem } = require("../utils/textUtils");
const { EMOJIS, LIMITES } = require("../config/constants");

/**
 * Gera resposta única para serviço ISS
 * @param {Object} item - Item do ISS
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta formatada
 */
function gerarRespostaUnicaISS(item, nome) {
  return `${EMOJIS.MENU} *Informações do ISS - Item ${item.codigoSubitem}*

${nome}, aqui estão as informações para o serviço:

🏷️ *Item:* ${item.codigoItem} - ${item.descricaoItem}
📝 *Subitem:* ${item.codigoSubitem} - ${item.descricaoSubitem}

${EMOJIS.DINHEIRO} *Informações Tributárias:*
• Alíquota: ${formatarPorcentagem(item.aliquota)}%
• Dedução da base de cálculo: ${item.percentualDeducao}
• Tributação fora de Arapiraca: ${item.tributacaoForaArapiraca}

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN, *menu* para menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta múltipla para serviços ISS
 * @param {Array} resultados - Array de resultados
 * @param {string} termoBusca - Termo usado na busca
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta formatada
 */
function gerarRespostaMultiplaISS(resultados, termoBusca, nome) {
  let resposta = `${EMOJIS.BUSCA} *Resultados da busca por "${termoBusca}"*

${nome}, encontrei ${resultados.length} serviços relacionados:

`;

  const max = Math.min(resultados.length, LIMITES.MAX_RESULTADOS_ISS);
  for (let i = 0; i < max; i++) {
    const item = resultados[i];
    resposta += `*${i + 1}.* Item ${item.codigoSubitem} - ${item.descricaoSubitem}
${EMOJIS.DINHEIRO} Alíquota: ${formatarPorcentagem(item.aliquota)}%

`;
  }

  if (resultados.length > LIMITES.MAX_RESULTADOS_ISS) {
    resposta += `... e mais ${resultados.length - LIMITES.MAX_RESULTADOS_ISS} serviços.

`;
  }

  resposta += `Para ver as informações completas de um serviço específico, digite o código do item (ex: ${resultados[0].codigoSubitem}).

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN, *menu* para menu principal ou *0* para encerrar.`;

  return resposta;
}

/**
 * Gera resposta única para CNAE
 * @param {Object} item - Item da TFLF
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta formatada
 */
function gerarRespostaUnicaCNAE(item, nome) {
  return `${EMOJIS.MENU} *Valores da TFLF - CNAE ${item.cnae}*

${nome}, aqui estão os valores para a atividade:

🏷️ *Descrição:* ${item.descricao}

${EMOJIS.DINHEIRO} *Valores da TFLF:*
• 2020: R$ ${formatarValorMonetario(item.tflf2020)}
• 2021: R$ ${formatarValorMonetario(item.tflf2021)}
• 2022: R$ ${formatarValorMonetario(item.tflf2022)}
• 2023: R$ ${formatarValorMonetario(item.tflf2023)}
• 2024: R$ ${formatarValorMonetario(item.tflf2024)}
• 2025: R$ ${formatarValorMonetario(item.tflf2025)}

Digite *5.1* para nova consulta, *5* para menu TFLF, *menu* para menu principal ou *0* para encerrar.`;
}

/**
 * Gera resposta múltipla para CNAEs
 * @param {Array} resultados - Array de resultados
 * @param {string} termoBusca - Termo usado na busca
 * @param {string} nome - Nome do usuário
 * @returns {string} Resposta formatada
 */
function gerarRespostaMultiplaCNAE(resultados, termoBusca, nome) {
  let resposta = `${EMOJIS.BUSCA} *Resultados da busca por "${termoBusca}"*

${nome}, encontrei ${resultados.length} atividades relacionadas:

`;

  const max = Math.min(resultados.length, LIMITES.MAX_RESULTADOS);
  for (let i = 0; i < max; i++) {
    const item = resultados[i];
    resposta += `*${i + 1}.* CNAE ${item.cnae}
${item.descricao}
${EMOJIS.DINHEIRO} TFLF 2025: R$ ${formatarValorMonetario(item.tflf2025)}

`;
  }

  if (resultados.length > LIMITES.MAX_RESULTADOS) {
    resposta += `... e mais ${resultados.length - LIMITES.MAX_RESULTADOS} atividades.

`;
  }

  resposta += `Para ver os valores completos de uma atividade específica, digite o código CNAE completo.

Digite *5.1* para nova consulta, *5* para menu TFLF, *menu* para menu principal ou *0* para encerrar.`;

  return resposta;
}

/**
 * Gera resposta de nenhum resultado encontrado
 * @param {string} termoBusca - Termo usado na busca
 * @param {string} nome - Nome do usuário
 * @param {string} tipo - Tipo de busca ('iss' ou 'cnae')
 * @returns {string} Resposta formatada
 */
function gerarRespostaNenhumResultado(termoBusca, nome, tipo) {
  const voltarOpcao = tipo === "iss" ? "*3.4*" : "*5.1*";
  const voltarMenu = tipo === "iss" ? "*3* para menu NFSe e ISSQN" : "*5* para menu TFLF";
  
  const dicas = tipo === "iss" ? 
    `${EMOJIS.INFO} *Dicas:*
• Tente usar termos mais gerais (ex: "medicina" em vez de "médico")
• Verifique a grafia das palavras
• Use pelo menos 3 caracteres` :
    `${EMOJIS.INFO} *Dicas:*
• Tente usar termos mais gerais (ex: "comercio" em vez de "comercial")
• Verifique a grafia das palavras
• Use pelo menos 3 caracteres`;

  return `${EMOJIS.ERRO} *Nenhum${tipo === "iss" ? " serviço" : "a atividade"} encontrado${tipo === "iss" ? "" : "a"}*

${nome}, não encontrei nenhum${tipo === "iss" ? " serviço" : "a atividade"} com ${tipo === "iss" ? "a descrição" : "a descrição"} "${termoBusca}".

${dicas}

Digite ${voltarOpcao} para nova consulta, ${voltarMenu} ou *menu* para o menu principal.`;
}

module.exports = {
  gerarRespostaUnicaISS,
  gerarRespostaMultiplaISS,
  gerarRespostaUnicaCNAE,
  gerarRespostaMultiplaCNAE,
  gerarRespostaNenhumResultado
};
