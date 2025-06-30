const { normalizarTexto, extrairNumeros, contemLetras } = require("../utils/textUtils");
const { obterEstadoUsuario, definirEstadoUsuario } = require("../services/stateService");
const { 
  buscarPorCNAE, 
  buscarPorCodigoServico, 
  buscarPorDescricaoServico, 
  buscarPorDescricaoCNAE 
} = require("../services/searchService");

const { 
  ESTADOS, 
  PALAVRAS_AGRADECIMENTO, 
  PALAVRAS_SAUDACAO, 
  LIMITES 
} = require("../config/constants");

// Importar respostas
const { 
  gerarMenuPrincipal, 
  gerarRespstaEncerramento, 
  gerarRespostaAgradecimento, 
  gerarRespostaAtendente, 
  gerarRespostaPadrao 
} = require("../responses/menuResponses");

const { criarRespostaDAM } = require("../responses/damResponses");
// Certidões agora são processadas diretamente pelo serviço

const { 
  gerarMenuNFSe, 
  gerarRespostaAcessoNFSe, 
  gerarRespostaDuvidasNFSe, 
  gerarMenuManuaisNFSe, 
  gerarRespostasManuais, 
  gerarMenuConsultaISS 
} = require("../responses/nfseResponses");

const { 
  gerarRespostaSubstitutos, 
  gerarMenuTFLF, 
  gerarMenuConsultaCNAE, 
  gerarRespostaPlanilhaTFLF 
} = require("../responses/tFLFResponses");

const { 
  gerarRespostaUnicaISS, 
  gerarRespostaMultiplaISS, 
  gerarRespostaUnicaCNAE, 
  gerarRespostaMultiplaCNAE, 
  gerarRespostaNenhumResultado 
} = require("../responses/searchResponses");

const { 
  iniciarFluxoCertidao, 
  processarTipoContribuinte, 
  processarCpfCnpj,
  processarInscricaoEEmitir, 
  ehSolicitacaoCertidao 
} = require("../services/certidaoService");

/**
 * Verifica se a mensagem contém palavras de agradecimento
 * @param {string} msgLimpa - Mensagem normalizada
 * @returns {boolean} True se contém agradecimento
 */
function ehMensagemAgradecimento(msgLimpa) {
  return PALAVRAS_AGRADECIMENTO.some(palavra => msgLimpa.includes(palavra));
}

/**
 * Verifica se a mensagem contém saudações
 * @param {string} msgLimpa - Mensagem normalizada
 * @returns {boolean} True se contém saudação
 */
function ehMensagemSaudacao(msgLimpa) {
  return PALAVRAS_SAUDACAO.some(palavra => msgLimpa.includes(palavra)) ||
         msgLimpa.includes("opcoes") || msgLimpa.includes("ajuda") ||
         msgLimpa.trim() === "hi" || msgLimpa.trim() === "hello";
}

/**
 * Processa busca por ISS
 * @param {string} msgLimpa - Mensagem normalizada
 * @param {Array} dadosISS - Dados do ISS
 * @param {string} nome - Nome do usuário
 * @returns {string|null} Resposta ou null se não encontrou
 */
function processarBuscaISS(msgLimpa, dadosISS, nome) {
  const codigoNumeros = extrairNumeros(msgLimpa);
  const temLetras = contemLetras(msgLimpa);

  // Busca por descrição (se tem letras e pelo menos 3 caracteres)
  if (temLetras && msgLimpa.length >= LIMITES.MIN_DESCRICAO && dadosISS.length > 0) {
    const resultados = buscarPorDescricaoServico(dadosISS, msgLimpa);
    
    if (resultados && resultados.length > 0) {
      if (resultados.length === 1) {
        return gerarRespostaUnicaISS(resultados[0], nome);
      } else {
        return gerarRespostaMultiplaISS(resultados, msgLimpa, nome);
      }
    } else {
      return gerarRespostaNenhumResultado(msgLimpa, nome, "iss");
    }
  }

  // Busca por código (números com 3 ou 4 dígitos)
  if (codigoNumeros.length >= LIMITES.MIN_SERVICO && dadosISS.length > 0) {
    // Primeiro tenta busca exata
    let resultados = buscarPorCodigoServico(dadosISS, codigoNumeros, true);

    if (resultados && resultados.length > 0) {
      return gerarRespostaUnicaISS(resultados[0], nome);
    } else {
      // Se não encontrou busca exata, tenta busca que contém
      resultados = buscarPorCodigoServico(dadosISS, codigoNumeros, false);

      if (resultados && resultados.length > 0) {
        return gerarRespostaMultiplaISS(resultados, codigoNumeros, nome);
      } else {
        return gerarRespostaNenhumResultado(codigoNumeros, nome, "iss");
      }
    }
  }

  return null;
}

/**
 * Processa busca por CNAE
 * @param {string} msgLimpa - Mensagem normalizada
 * @param {Array} dadosTFLF - Dados da TFLF
 * @param {string} nome - Nome do usuário
 * @returns {string|null} Resposta ou null se não encontrou
 */
function processarBuscaCNAE(msgLimpa, dadosTFLF, nome) {
  const codigoCNAE = extrairNumeros(msgLimpa);
  const temLetras = contemLetras(msgLimpa);

  // Busca por descrição (se tem letras e pelo menos 3 caracteres)
  if (temLetras && msgLimpa.length >= LIMITES.MIN_DESCRICAO && dadosTFLF.length > 0) {
    const resultados = buscarPorDescricaoCNAE(dadosTFLF, msgLimpa);

    if (resultados && resultados.length > 0) {
      if (resultados.length === 1) {
        return gerarRespostaUnicaCNAE(resultados[0], nome);
      } else {
        return gerarRespostaMultiplaCNAE(resultados, msgLimpa, nome);
      }
    } else {
      return gerarRespostaNenhumResultado(msgLimpa, nome, "cnae");
    }
  }

  // Busca por código (números com pelo menos 4 dígitos)
  if (codigoCNAE.length >= LIMITES.MIN_CNAE && dadosTFLF.length > 0) {
    const resultados = buscarPorCNAE(dadosTFLF, codigoCNAE);

    if (resultados && resultados.length > 0) {
      if (resultados.length === 1) {
        return gerarRespostaUnicaCNAE(resultados[0], nome);
      } else {
        return gerarRespostaMultiplaCNAE(resultados, codigoCNAE, nome);
      }
    } else {
      return gerarRespostaNenhumResultado(codigoCNAE, nome, "cnae");
    }
  }

  return null;
}

/**
 * Processa mensagem principal
 * @param {string} message - Mensagem original
 * @param {string} sender - ID do remetente
 * @param {Array} dadosTFLF - Dados da TFLF
 * @param {Array} dadosISS - Dados do ISS
 * @param {Object} req - Request object (opcional)
 * @returns {string|Object} Resposta processada
 */
async function processarMensagem(message, sender, dadosTFLF, dadosISS, req = null) {
  const nome = sender || "cidadão";
  const msgLimpa = normalizarTexto(message);
  const estadoAtual = obterEstadoUsuario(sender);

  // Verificar mensagens de agradecimento
  if (ehMensagemAgradecimento(msgLimpa)) {
    return gerarRespostaAgradecimento(nome);
  }

  // Retorno ao menu principal
  if (msgLimpa.includes("menu") || msgLimpa.includes("inicio")) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    return gerarMenuPrincipal(nome);
  }

  // Saudações
  if (ehMensagemSaudacao(msgLimpa)) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    return gerarMenuPrincipal(nome);
  }

  // PRIORIDADE 1: Fluxos específicos e estados contextuais
  const opcao = msgLimpa.trim();

  // Fluxo de emissão de certidão (PRIORIDADE MÁXIMA)
  if (estadoAtual === ESTADOS.AGUARDANDO_TIPO_CONTRIBUINTE) {
    return processarTipoContribuinte(sender, opcao, nome);
  }

  if (estadoAtual === ESTADOS.AGUARDANDO_CPF_CNPJ) {
    return processarCpfCnpj(sender, msgLimpa, nome);
  }

  // Estado AGUARDANDO_SELECAO_INSCRICAO removido (API não suporta múltiplas inscrições)

  if (estadoAtual === ESTADOS.AGUARDANDO_INSCRICAO) {
    return await processarInscricaoEEmitir(sender, msgLimpa, nome);
  }

  // Buscas contextuais específicas
  if (estadoAtual === ESTADOS.CONSULTA_ISS) {
    const resultadoISS = processarBuscaISS(msgLimpa, dadosISS, nome);
    if (resultadoISS) return resultadoISS;
  }

  if (estadoAtual === ESTADOS.CONSULTA_CNAE) {
    const resultadoCNAE = processarBuscaCNAE(msgLimpa, dadosTFLF, nome);
    if (resultadoCNAE) return resultadoCNAE;
  }

  // PRIORIDADE 2: Navegação por números do menu
  
  // Opção 1 - DAM's
  if (opcao === "1" || msgLimpa.includes("opcao 1")) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    return criarRespostaDAM(nome);
  }

  // Opção 2 - Certidões (Direto para automático)
  if (opcao === "2" || msgLimpa.includes("opcao 2")) {
    return iniciarFluxoCertidao(sender, nome);
  }

  // Opção 3 - NFSe
  if (opcao === "3" || msgLimpa.includes("opcao 3")) {
    definirEstadoUsuario(sender, ESTADOS.OPCAO_3_NFSE);
    return gerarMenuNFSe(nome);
  }

  // Sub-opções NFSe
  if (opcao === "3.1" || msgLimpa.includes("opcao 3.1") || msgLimpa.includes("emissao nfse")) {
    return gerarRespostaAcessoNFSe(nome);
  }
  if (opcao === "3.2" || msgLimpa.includes("opcao 3.2") || msgLimpa.includes("duvidas nfse")) {
    return gerarRespostaDuvidasNFSe(nome);
  }
  if (opcao === "3.3" || msgLimpa.includes("opcao 3.3") || msgLimpa.includes("manuais nfse")) {
    return gerarMenuManuaisNFSe(nome);
  }

  // Manuais específicos
  const manuais = gerarRespostasManuais(nome);
  for (const [codigo, resposta] of Object.entries(manuais)) {
    if (opcao === codigo || msgLimpa.includes(`opcao ${codigo}`)) {
      return resposta;
    }
  }

  // Opção 3.4 - Consulta ISS
  if (opcao === "3.4" || msgLimpa.includes("opcao 3.4")) {
    definirEstadoUsuario(sender, ESTADOS.CONSULTA_ISS);
    return gerarMenuConsultaISS(nome);
  }

  // Opção 4 - Substitutos
  if (opcao === "4" || msgLimpa.includes("opcao 4")) {
    return gerarRespostaSubstitutos(nome);
  }

  // Opção 5 - TFLF
  if (opcao === "5" || msgLimpa.includes("opcao 5")) {
    definirEstadoUsuario(sender, ESTADOS.OPCAO_5_TFLF);
    return gerarMenuTFLF(nome);
  }

  // Sub-opções TFLF
  if (opcao === "5.1" || msgLimpa.includes("opcao 5.1")) {
    definirEstadoUsuario(sender, ESTADOS.CONSULTA_CNAE);
    return gerarMenuConsultaCNAE(nome);
  }
  if (opcao === "5.2" || msgLimpa.includes("opcao 5.2")) {
    return gerarRespostaPlanilhaTFLF(nome);
  }

  // Opção 0 - Encerrar
  if (opcao === "0" || msgLimpa.includes("opcao 0") || msgLimpa.includes("encerrar")) {
    return gerarRespstaEncerramento(nome);
  }

  // Solicitação de atendente
  if (msgLimpa.includes("atendente")) {
    return gerarRespostaAtendente(nome);
  }

  // Detecção por palavras-chave (compatibilidade)
  if (msgLimpa.includes("iptu")) {
    return `${nome}, digite *1* para ver todas as opções sobre IPTU ou segunda via de DAM's.`;
  }
  if (msgLimpa.includes("certidao") || msgLimpa.includes("negativa")) {
    // Verificar se é solicitação de emissão automática
    if (ehSolicitacaoCertidao(msgLimpa)) {
      return iniciarFluxoCertidao(sender, nome);
    }
    return `${nome}, digite *2* para ver todas as opções sobre certidões. Digite *2.0* para emissão automática.`;
  }
  if (msgLimpa.includes("nota fiscal") || msgLimpa.includes("nfse") || msgLimpa.includes("nfs-e") || 
      msgLimpa.includes("issqn") || msgLimpa.includes("iss")) {
    return `${nome}, digite *3* para ver todas as opções sobre NFSe e ISSQN.`;
  }
  if (msgLimpa.includes("substituto tributario") || msgLimpa.includes("substitutos")) {
    return `${nome}, digite *4* para consultar a Lista de Substitutos Tributários.`;
  }
  if (msgLimpa.includes("valor tflf") || msgLimpa.includes("tflf 2025")) {
    return `${nome}, digite *5* para acessar as opções da TFLF 2025: consultar por CNAE ou baixar planilha completa.`;
  }

  // Resposta padrão
  return gerarRespostaPadrao(nome);
}

module.exports = {
  processarMensagem
};
