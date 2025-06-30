const { emitirCertidao, validarDadosCertidao } = require('../utils/certidaoApi');
const { consultarInscricoesPorCpf } = require('../utils/consultaApi');
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
 * Processa o CPF/CNPJ informado e busca inscrições vinculadas
 * @param {string} sender - ID do usuário
 * @param {string} cpfCnpj - CPF/CNPJ informado
 * @param {string} nome - Nome do usuário
 * @returns {Promise<string>} Próxima mensagem do fluxo
 */
async function processarCpfCnpj(sender, cpfCnpj, nome) {
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

  // Tentar buscar inscrições vinculadas ao CPF/CNPJ
  try {
    console.log(`🔍 Buscando inscrições para CPF/CNPJ: ${cpfCnpjLimpo}`);
    
    const resultadoConsulta = await consultarInscricoesPorCpf(cpfCnpjLimpo);
    
    if (resultadoConsulta.sucesso && resultadoConsulta.inscricoes.length > 1) {
      // Múltiplas inscrições encontradas - permitir seleção
      definirDadosTemporarios(sender, {
        ...dadosTemp,
        cpfCnpj: cpfCnpjLimpo,
        inscricoesDisponiveis: resultadoConsulta.inscricoes
      });
      definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_SELECAO_INSCRICAO);

      return gerarMenuSelecaoInscricao(resultadoConsulta.inscricoes, nome);
      
    } else if (resultadoConsulta.sucesso && resultadoConsulta.inscricoes.length === 1) {
      // Uma única inscrição encontrada - usar automaticamente
      const inscricao = resultadoConsulta.inscricoes[0];
      definirDadosTemporarios(sender, {
        ...dadosTemp,
        cpfCnpj: cpfCnpjLimpo,
        inscricaoSelecionada: inscricao.inscricao
      });
      
      return await emitirCertidaoAutomatica(sender, nome);
      
    } else {
      // Nenhuma inscrição encontrada ou API não suporta - continuar com fluxo manual
      console.log('ℹ️ Consulta não retornou inscrições, continuando com fluxo manual');
      definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_INSCRICAO);
      
      return `${EMOJIS.SUCESSO} CPF/CNPJ registrado: *${cpfCnpjLimpo}*

Agora preciso da sua *inscrição municipal*:

${EMOJIS.INFO} Digite apenas os números da sua inscrição (sem pontos, traços ou letras):`;
    }
    
  } catch (error) {
    console.error('❌ Erro ao consultar inscrições:', error);
    
    // Em caso de erro, continuar com fluxo manual
    definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_INSCRICAO);
    
    return `${EMOJIS.SUCESSO} CPF/CNPJ registrado: *${cpfCnpjLimpo}*

Agora preciso da sua *inscrição municipal*:

${EMOJIS.INFO} Digite apenas os números da sua inscrição (sem pontos, traços ou letras):`;
  }
}

/**
 * Gera menu de seleção de inscrições
 * @param {Array} inscricoes - Lista de inscrições disponíveis
 * @param {string} nome - Nome do usuário
 * @returns {string} Menu de seleção
 */
function gerarMenuSelecaoInscricao(inscricoes, nome) {
  let menu = `${EMOJIS.SUCESSO} *Encontrei ${inscricoes.length} inscrições para este CPF/CNPJ!*

${nome}, selecione qual inscrição deseja usar:

`;

  inscricoes.forEach((inscricao, index) => {
    const numero = index + 1;
    menu += `*${numero}* - Inscrição: ${inscricao.inscricao}
   ${EMOJIS.INFO} ${inscricao.nome}
   📍 ${inscricao.endereco}

`;
  });

  menu += `Digite o número da inscrição desejada (1-${inscricoes.length}):`;
  
  return menu;
}

/**
 * Processa seleção de inscrição pelo usuário
 * @param {string} sender - ID do usuário
 * @param {string} opcao - Opção selecionada
 * @param {string} nome - Nome do usuário
 * @returns {Promise<string>} Resultado da seleção
 */
async function processarSelecaoInscricao(sender, opcao, nome) {
  const dadosTemp = obterDadosTemporarios(sender);
  
  if (!dadosTemp || !dadosTemp.inscricoesDisponiveis) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    return `${EMOJIS.ERRO} Sessão expirada. Digite *menu* para começar novamente.`;
  }

  const numeroSelecionado = parseInt(opcao);
  const inscricoes = dadosTemp.inscricoesDisponiveis;
  
  if (isNaN(numeroSelecionado) || numeroSelecionado < 1 || numeroSelecionado > inscricoes.length) {
    return `${EMOJIS.ERRO} Opção inválida! Digite um número de 1 a ${inscricoes.length}:`;
  }

  const inscricaoSelecionada = inscricoes[numeroSelecionado - 1];
  
  // Salvar inscrição selecionada
  definirDadosTemporarios(sender, {
    ...dadosTemp,
    inscricaoSelecionada: inscricaoSelecionada.inscricao
  });

  return await emitirCertidaoAutomatica(sender, nome);
}

/**
 * Emite certidão automaticamente com dados já coletados
 * @param {string} sender - ID do usuário
 * @param {string} nome - Nome do usuário
 * @returns {Promise<string>} Resultado da emissão
 */
async function emitirCertidaoAutomatica(sender, nome) {
  const dadosTemp = obterDadosTemporarios(sender);
  
  if (!dadosTemp || !dadosTemp.tipoContribuinte || !dadosTemp.cpfCnpj || !dadosTemp.inscricaoSelecionada) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    return `${EMOJIS.ERRO} Dados insuficientes. Digite *menu* para começar novamente.`;
  }

  // Limpar estado e dados temporários
  definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
  limparDadosTemporarios(sender);

  try {
    // Emitir certidão
    const resultado = await emitirCertidao({
      tipoContribuinte: dadosTemp.tipoContribuinte,
      inscricao: dadosTemp.inscricaoSelecionada,
      cpfCnpj: dadosTemp.cpfCnpj,
      operacao: "2" // Certidão
    });

    if (resultado.SSACodigo === 0 && resultado.SSALinkDocumento) {
      return `${EMOJIS.SUCESSO} *Certidão emitida com sucesso!*

${EMOJIS.DOCUMENTO} *Link da certidão:*
${resultado.SSALinkDocumento}

${EMOJIS.INFO} *Contribuinte:* ${resultado.SSANomeRazao || 'N/A'}
📍 *Inscrição:* ${resultado.SSAInscricao || dadosTemp.inscricaoSelecionada}

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
  processarSelecaoInscricao,
  processarInscricaoEEmitir,
  ehSolicitacaoCertidao
};
