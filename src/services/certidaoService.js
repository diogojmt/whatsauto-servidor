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

  return `${EMOJIS.DOCUMENTO} Olá ${nome}! Vou te ajudar a emitir sua certidão.

Para começar, preciso saber o *tipo de contribuinte*:

*1* - Pessoa Física ou Jurídica (PF/PJ)
*2* - Imóvel
*3* - Empresa

Digite o número correspondente ao seu tipo:`;
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
  definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_INSCRICAO);

  return `${EMOJIS.SUCESSO} Tipo selecionado: *${tiposValidos[opcao]}*

Agora preciso da sua *inscrição municipal*.

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
  
  if (!dadosTemp || !dadosTemp.tipoContribuinte) {
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
    // Emitir certidão
    const resultado = await emitirCertidao({
      tipoContribuinte: dadosTemp.tipoContribuinte,
      inscricao: inscricao.trim(),
      operacao: "2" // Certidão
    });

    if (resultado.SSACodigo === 0 && resultado.SSALinkDocumento) {
      return `${EMOJIS.SUCESSO} Certidão emitida com sucesso!

${EMOJIS.INFO} *Dados do contribuinte:*
• Nome/Razão: ${resultado.SSANomeRazao || 'Não informado'}
• CPF/CNPJ: ${resultado.SSACPFCNPJ || 'Não informado'}
• Inscrição: ${resultado.SSAInscricao || inscricao}

${EMOJIS.DOCUMENTO} *Acesse sua certidão através do link:*
${resultado.SSALinkDocumento}

${EMOJIS.INFO} O link ficará disponível por um tempo limitado. Baixe ou imprima o documento o quanto antes.

Digite *menu* para voltar ao menu principal.`;
    } else {
      return `${EMOJIS.ERRO} Não foi possível emitir a certidão.

*Motivo:* ${resultado.SSAMensagem || 'Erro não especificado'}

${EMOJIS.INFO} Verifique os dados informados e tente novamente ou entre em contato conosco.

Digite *menu* para voltar ao menu principal.`;
    }

  } catch (error) {
    console.error('Erro ao emitir certidão:', error);
    return `${EMOJIS.ERRO} Ocorreu um erro interno ao processar sua solicitação.

Por favor, tente novamente em alguns minutos ou entre em contato conosco.

Digite *menu* para voltar ao menu principal.`;
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
    'certidao automatica',
    'gerar certidao',
    'solicitar certidao',
    'nova certidao',
    'certidao negativa',
    'certidao positiva'
  ];

  return palavrasChave.some(palavra => msgLimpa.includes(palavra));
}

module.exports = {
  iniciarFluxoCertidao,
  processarTipoContribuinte,
  processarInscricaoEEmitir,
  ehSolicitacaoCertidao
};
