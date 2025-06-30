const { emitirCertidao, validarDadosCertidao } = require('../utils/certidaoApi');
const { obterEstadoUsuario, definirEstadoUsuario, obterDadosTemporarios, definirDadosTemporarios, limparDadosTemporarios } = require('./stateService');
const { ESTADOS, EMOJIS } = require('../config/constants');

/**
 * Inicia o fluxo de emissão de certidão
 * @param {string} sender - ID do usuário
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem de início do fluxo
 */
function iniciarFluxoCertidao(sender, nome) {
  definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_TIPO_CONTRIBUINTE);
  limparDadosTemporarios(sender);

  return `${EMOJIS.DOCUMENTO} *Emissão Automática de Certidões*

${nome}, vou te ajudar a emitir sua certidão de forma rápida e automática!

${EMOJIS.INFO} *Se não conseguir automaticamente, você pode:*
🔗 Portal do Contribuinte: https://arapiraca.abaco.com.br/eagata/portal/

📧 *Dúvidas:* smfaz@arapiraca.al.gov.br

---

Para começar, preciso saber o *tipo de contribuinte*:

*1* - Pessoa Física ou Jurídica (PF/PJ)
*2* - Imóvel
*3* - Empresa

Digite o número correspondente:`;
}

/**
 * Processa a escolha do tipo de contribuinte
 * @param {string} sender - ID do usuário
 * @param {string} opcao - Opção escolhida
 * @param {string} nome - Nome do usuário
 * @returns {string} Próxima mensagem do fluxo
 */
function processarTipoContribuinte(sender, opcao, nome) {
  const tiposValidos = {
    '1': 'Pessoa Física/Jurídica',
    '2': 'Imóvel',
    '3': 'Empresa'
  };

  if (!tiposValidos[opcao]) {
    return `${EMOJIS.ERRO} Opção inválida! Por favor, digite:

*1* - Pessoa Física ou Jurídica (PF/PJ)
*2* - Imóvel  
*3* - Empresa

Digite apenas o número:`;
  }

  // Salvar tipo escolhido
  definirDadosTemporarios(sender, { tipoContribuinte: opcao });
  definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_CPF_CNPJ);

  return `${EMOJIS.SUCESSO} Tipo selecionado: *${tiposValidos[opcao]}*

Agora preciso do seu *CPF/CNPJ*:

${EMOJIS.INFO} Digite apenas os números (sem pontos, traços ou barras):`;
}

/**
 * Processa o CPF/CNPJ informado
 * @param {string} sender - ID do usuário
 * @param {string} cpfCnpj - CPF/CNPJ informado
 * @param {string} nome - Nome do usuário
 * @returns {string} Próxima mensagem do fluxo
 */
function processarCpfCnpj(sender, cpfCnpj, nome) {
  const dadosTemp = obterDadosTemporarios(sender);
  
  if (!dadosTemp || !dadosTemp.tipoContribuinte) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    return `${EMOJIS.ERRO} Sessão expirada. Digite *menu* para começar novamente.`;
  }

  // Validação básica de CPF/CNPJ
  const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');
  
  if (cpfCnpjLimpo.length !== 11 && cpfCnpjLimpo.length !== 14) {
    return `${EMOJIS.ERRO} CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.

Digite novamente apenas os números:`;
  }

  // Salvar CPF/CNPJ
  definirDadosTemporarios(sender, { 
    ...dadosTemp, 
    cpfCnpj: cpfCnpjLimpo 
  });
  definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_INSCRICAO);

  return `${EMOJIS.SUCESSO} CPF/CNPJ registrado: *${cpfCnpjLimpo}*

Agora preciso da sua *inscrição municipal*:

${EMOJIS.INFO} Digite apenas os números da sua inscrição (sem pontos, traços ou letras):`;
}

/**
 * Processa a inscrição municipal e emite a certidão
 * @param {string} sender - ID do usuário
 * @param {string} inscricao - Inscrição informada
 * @param {string} nome - Nome do usuário
 * @returns {Promise<string>} Resultado da emissão
 */
async function processarInscricaoEEmitir(sender, inscricao, nome) {
  const dadosTemp = obterDadosTemporarios(sender);
  
  if (!dadosTemp || !dadosTemp.tipoContribuinte || !dadosTemp.cpfCnpj) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    return `${EMOJIS.ERRO} Sessão expirada. Digite *menu* para começar novamente.`;
  }

  // Validar dados
  const validacao = validarDadosCertidao(dadosTemp.tipoContribuinte, inscricao);
  
  if (!validacao.isValid) {
    return `${EMOJIS.ERRO} Dados inválidos:

${validacao.errors.map(erro => `• ${erro}`).join('\n')}

Por favor, digite novamente sua inscrição municipal (apenas números):`;
  }

  // Limpar estado e dados temporários
  definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
  limparDadosTemporarios(sender);

  try {
    // Enviar indicador de processamento
    // (seria implementado no chatbot para mostrar "digitando...")

    // Emitir certidão
    const resultado = await emitirCertidao({
      tipoContribuinte: dadosTemp.tipoContribuinte,
      inscricao: inscricao.trim(),
      cpfCnpj: dadosTemp.cpfCnpj,
      operacao: "2" // Certidão
    });

    if (resultado.SSACodigo === 0 && resultado.SSALinkDocumento) {
      return `${EMOJIS.SUCESSO} *Certidão emitida com sucesso!*

${EMOJIS.DOCUMENTO} *Link da certidão:*
${resultado.SSALinkDocumento}

${EMOJIS.INFO} *Contribuinte:* ${resultado.SSANomeRazao || 'N/A'}
📍 *Inscrição:* ${resultado.SSAInscricao || inscricao}

⚠️ Link temporário - baixe/imprima logo!

Digite *menu* para voltar.`;
    } else {
      return `${EMOJIS.ERRO} *Erro na emissão da certidão*

*Motivo:* ${resultado.SSAMensagem || 'Erro não especificado'}

${EMOJIS.INFO} Tente novamente ou use o Portal do Contribuinte:
🔗 https://arapiraca.abaco.com.br/eagata/portal/

Digite *menu* para voltar.`;
    }

  } catch (error) {
    console.error('Erro ao emitir certidão:', error);
    return `${EMOJIS.ERRO} *Erro no sistema*

Tente novamente em alguns minutos ou use o Portal:
🔗 https://arapiraca.abaco.com.br/eagata/portal/
📧 smfaz@arapiraca.al.gov.br

Digite *menu* para voltar.`;
  }
}

/**
 * Verifica se a mensagem é uma solicitação de emissão de certidão
 * @param {string} msgLimpa - Mensagem normalizada
 * @returns {boolean} True se é solicitação de certidão
 */
function ehSolicitacaoCertidao(msgLimpa) {
  const palavrasChave = [
    'emitir certidao',
    'emitir certidão',
    'certidao automatica',
    'certidão automatica', 
    'certidao automática',
    'certidão automática',
    'gerar certidao',
    'gerar certidão',
    'solicitar certidao',
    'solicitar certidão',
    'nova certidao',
    'nova certidão',
    'certidao negativa',
    'certidão negativa',
    'certidao positiva',
    'certidão positiva',
    'emissao automatica',
    'emissão automatica',
    'emissão automática',
    'emissao automática'
  ];

  return palavrasChave.some(palavra => msgLimpa.includes(palavra));
}

module.exports = {
  iniciarFluxoCertidao,
  processarTipoContribuinte,
  processarCpfCnpj,
  processarInscricaoEEmitir,
  ehSolicitacaoCertidao
};
