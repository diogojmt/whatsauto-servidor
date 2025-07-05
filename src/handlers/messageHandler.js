const {
  normalizarTexto,
  extrairNumeros,
  contemLetras,
} = require("../utils/textUtils");
const {
  obterEstadoUsuario,
  definirEstadoUsuario,
} = require("../services/stateService");
const {
  buscarPorCNAE,
  buscarPorCodigoServico,
  buscarPorDescricaoServico,
  buscarPorDescricaoCNAE,
} = require("../services/searchService");
const { DebitosService } = require("../services/debitosService");
const { BciService } = require("../services/bciService");
const { DemonstrativoFinanceiroService } = require("../services/demonstrativoFinanceiroService");
const { AgendamentoFluxoService } = require("../services/agendamentoFluxoService");
const { IntentionService } = require("../services/intentionService");
const { CadastroGeralService } = require("../services/cadastroGeralService");

const {
  ESTADOS,
  PALAVRAS_AGRADECIMENTO,
  PALAVRAS_SAUDACAO,
  LIMITES,
} = require("../config/constants");

// Importar respostas
const {
  gerarMenuPrincipal,
  gerarRespstaEncerramento,
  gerarRespostaAgradecimento,
  gerarRespostaAtendente,
  gerarRespostaPadrao,
} = require("../responses/menuResponses");

const { criarRespostaDAM } = require("../responses/damResponses");
// Certidões agora são processadas diretamente pelo serviço

const {
  gerarMenuNFSe,
  gerarRespostaAcessoNFSe,
  gerarRespostaDuvidasNFSe,
  gerarMenuManuaisNFSe,
  gerarRespostasManuais,
  gerarMenuConsultaISS,
} = require("../responses/nfseResponses");

const {
  gerarRespostaSubstitutos,
  gerarMenuTFLF,
  gerarMenuConsultaCNAE,
  gerarRespostaPlanilhaTFLF,
} = require("../responses/tFLFResponses");

const {
  gerarRespostaUnicaISS,
  gerarRespostaMultiplaISS,
  gerarRespostaUnicaCNAE,
  gerarRespostaMultiplaCNAE,
  gerarRespostaNenhumResultado,
} = require("../responses/searchResponses");

const {
  iniciarFluxoCertidao,
  processarTipoContribuinte,
  processarCpfCnpj,
  processarInscricaoEEmitir,
  ehSolicitacaoCertidao,
} = require("../services/certidaoService");

// Instanciar serviços
const debitosService = new DebitosService();
const bciService = new BciService();
const demonstrativoFinanceiroService = new DemonstrativoFinanceiroService();
const agendamentoFluxoService = new AgendamentoFluxoService();
const intentionService = new IntentionService();
const cadastroGeralService = new CadastroGeralService();

/**
 * Verifica se a mensagem contém palavras de agradecimento
 * @param {string} msgLimpa - Mensagem normalizada
 * @returns {boolean} True se contém agradecimento
 */
function ehMensagemAgradecimento(msgLimpa) {
  return PALAVRAS_AGRADECIMENTO.some((palavra) => msgLimpa.includes(palavra));
}

/**
 * Verifica se a mensagem contém saudações
 * @param {string} msgLimpa - Mensagem normalizada
 * @returns {boolean} True se contém saudação
 */
function ehMensagemSaudacao(msgLimpa) {
  return (
    PALAVRAS_SAUDACAO.some((palavra) => msgLimpa.includes(palavra)) ||
    msgLimpa.includes("opcoes") ||
    msgLimpa.includes("ajuda") ||
    msgLimpa.trim() === "hi" ||
    msgLimpa.trim() === "hello"
  );
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
  if (
    temLetras &&
    msgLimpa.length >= LIMITES.MIN_DESCRICAO &&
    dadosISS.length > 0
  ) {
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
  if (
    temLetras &&
    msgLimpa.length >= LIMITES.MIN_DESCRICAO &&
    dadosTFLF.length > 0
  ) {
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
 * @param {string} nomeUsuario - Nome do usuário (NOVO PARÂMETRO)
 * @returns {string|Object} Resposta processada
 */
async function processarMensagem(
  message,
  sender,
  dadosTFLF,
  dadosISS,
  req = null,
  nomeUsuario = null
) {
  // CORREÇÃO PRINCIPAL: Usar nomeUsuario em vez de sender
  const nome = nomeUsuario || "Cidadão";

  // Log para debug (pode remover depois)
  console.log("🔍 [MessageHandler] Processando mensagem:", {
    sender: sender,
    nomeUsuario: nomeUsuario,
    nomeUsado: nome,
    message: message,
  });

  const msgLimpa = normalizarTexto(message);
  const estadoAtual = obterEstadoUsuario(sender);

  // ======= NOVO SISTEMA DE DETECÇÃO DE INTENÇÕES =======
  // Detectar intenções globalmente, exceto em estados críticos
  const estadosCriticos = [
    ESTADOS.AGUARDANDO_CPF_CNPJ,
    ESTADOS.AGUARDANDO_INSCRICAO,
  ];

  if (!estadosCriticos.includes(estadoAtual)) {
    const detectionResult = intentionService.detectIntentions(message, sender, estadoAtual);
    
    // Log para debug
    console.log("🎯 [IntentionService] Detecção:", {
      sender,
      confidence: detectionResult.confidence,
      topIntentions: detectionResult.intentions.slice(0, 3).map(i => ({
        id: i.id,
        name: i.intention.name,
        confidence: i.confidence
      })),
      context: detectionResult.context,
    });

    // Processar intenções se há confiança suficiente
    if (detectionResult.confidence > 30) {
      const intentionResponse = intentionService.processIntentions(detectionResult, sender, nome);
      
      if (intentionResponse) {
        console.log("✅ [IntentionService] Processando intenção:", {
          type: intentionResponse.type,
          action: intentionResponse.action,
          confidence: intentionResponse.confidence,
        });

        // Processar diferentes tipos de resposta de intenção
        if (intentionResponse.type === "redirect") {
          if (intentionResponse.action === "menu_principal") {
            definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
            return gerarMenuPrincipal(nome);
          }
        }

        // Processar ações específicas das intenções
        if (intentionResponse.action) {
          const actionResult = await processarAcaoIntencao(
            intentionResponse.action,
            sender,
            nome,
            intentionResponse.intention
          );
          
          if (actionResult) {
            return actionResult;
          }
        }

        // Retornar resposta da intenção se não foi processada acima
        if (intentionResponse.message) {
          return intentionResponse.message;
        }
      }
    }
  }
  // ======= FIM DO SISTEMA DE DETECÇÃO DE INTENÇÕES =======

  // Verificar se está no fluxo de consulta de débitos
  if (estadoAtual.startsWith("debitos_")) {
    const resultado = await debitosService.processarEtapa(sender, message);

    // Se for redirecionamento, processar conforme a ação
    if (resultado.type === "redirect") {
      if (resultado.action === "menu_principal") {
        definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
        return gerarMenuPrincipal(nome);
      }
    }

    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Verificar se está no fluxo de consulta de BCI
  if (estadoAtual.startsWith("bci_")) {
    const resultado = await bciService.processarEtapa(sender, message);

    // Se for redirecionamento, processar conforme a ação
    if (resultado.type === "redirect") {
      if (resultado.action === "menu_principal") {
        definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
        return gerarMenuPrincipal(nome);
      }
    }

    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Verificar se está no fluxo de Demonstrativo Financeiro
  if (estadoAtual === ESTADOS.OPCAO_7_DEMONSTRATIVO) {
    const resultado = await demonstrativoFinanceiroService.processarEtapa(sender, message);

    // Se for redirecionamento, processar conforme a ação
    if (resultado.type === "redirect") {
      if (resultado.action === "menu_principal") {
        definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
        return gerarMenuPrincipal(nome);
      }
    }

    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Verificar se está no fluxo de agendamento
  if (agendamentoFluxoService.estaNoFluxoAgendamento(sender)) {
    const resultado = await agendamentoFluxoService.processarMensagem(sender, message, nome);
    // Se retornou null, significa que o usuário quer sair do fluxo
    if (resultado === null) {
      // Continuar processamento normal (ex: comando menu)
    } else {
      return resultado;
    }
  }

  // Verificar se está no fluxo de Cadastro Geral
  if (estadoAtual === ESTADOS.OPCAO_9_CADASTRO_GERAL) {
    const resultado = await cadastroGeralService.processarEtapa(sender, message);

    // Se for redirecionamento, processar conforme a ação
    if (resultado.type === "redirect") {
      if (resultado.action === "menu_principal") {
        definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
        return gerarMenuPrincipal(nome);
      }
    }

    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

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

  // Detecção de intenção para consulta de débitos
  if (debitosService.detectarIntencaoConsultaDebitos(message)) {
    definirEstadoUsuario(sender, ESTADOS.DEBITOS_ATIVO);
    const resultado = debitosService.iniciarConsultaDebitos(sender, nome);
    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Detecção de intenção para consulta de BCI
  if (bciService.detectarIntencaoBCI(message)) {
    definirEstadoUsuario(sender, ESTADOS.BCI_ATIVO);
    const resultado = bciService.iniciarConsultaBCI(sender, nome);
    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Detecção de intenção para Demonstrativo Financeiro
  if (demonstrativoFinanceiroService.detectarIntencaoDemonstrativo(message)) {
    definirEstadoUsuario(sender, ESTADOS.OPCAO_7_DEMONSTRATIVO);
    const resultado = demonstrativoFinanceiroService.iniciarConsultaDemonstrativo(sender, nome);
    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Detecção de intenção para Cadastro Geral
  if (cadastroGeralService.detectarIntencaoCadastroGeral(message)) {
    definirEstadoUsuario(sender, ESTADOS.OPCAO_9_CADASTRO_GERAL);
    const resultado = cadastroGeralService.iniciarConsultaCadastroGeral(sender, nome);
    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
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

  // Opção 1 - DAM's (Nova funcionalidade automática)
  if (opcao === "1" || msgLimpa.includes("opcao 1")) {
    definirEstadoUsuario(sender, ESTADOS.DEBITOS_ATIVO);
    const resultado = debitosService.iniciarConsultaDebitos(sender, nome);
    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
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
  if (
    opcao === "3.1" ||
    msgLimpa.includes("opcao 3.1") ||
    msgLimpa.includes("emissao nfse")
  ) {
    return gerarRespostaAcessoNFSe(nome);
  }
  if (
    opcao === "3.2" ||
    msgLimpa.includes("opcao 3.2") ||
    msgLimpa.includes("duvidas nfse")
  ) {
    return gerarRespostaDuvidasNFSe(nome);
  }
  if (
    opcao === "3.3" ||
    msgLimpa.includes("opcao 3.3") ||
    msgLimpa.includes("manuais nfse")
  ) {
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

  // Opção 6 - BCI
  if (opcao === "6" || msgLimpa.includes("opcao 6")) {
    definirEstadoUsuario(sender, ESTADOS.BCI_ATIVO);
    const resultado = bciService.iniciarConsultaBCI(sender, nome);
    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Opção 7 - Demonstrativo Financeiro
  if (opcao === "7" || msgLimpa.includes("opcao 7")) {
    definirEstadoUsuario(sender, ESTADOS.OPCAO_7_DEMONSTRATIVO);
    const resultado = demonstrativoFinanceiroService.iniciarConsultaDemonstrativo(sender, nome);
    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Opção 8 - Agendamento
  if (opcao === "8" || msgLimpa.includes("opcao 8")) {
    definirEstadoUsuario(sender, ESTADOS.AGENDAMENTO_ATIVO);
    return await agendamentoFluxoService.iniciarFluxoAgendamento(sender, nome);
  }

  // Opção 9 - Cadastro Geral
  if (opcao === "9" || msgLimpa.includes("opcao 9")) {
    definirEstadoUsuario(sender, ESTADOS.OPCAO_9_CADASTRO_GERAL);
    const resultado = cadastroGeralService.iniciarConsultaCadastroGeral(sender, nome);
    if (resultado.type === "text") {
      return resultado.text;
    }
    return resultado;
  }

  // Opção 0 - Encerrar
  if (
    opcao === "0" ||
    msgLimpa.includes("opcao 0") ||
    msgLimpa.includes("encerrar")
  ) {
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
  if (
    msgLimpa.includes("nota fiscal") ||
    msgLimpa.includes("nfse") ||
    msgLimpa.includes("nfs-e") ||
    msgLimpa.includes("issqn") ||
    msgLimpa.includes("iss")
  ) {
    return `${nome}, digite *3* para ver todas as opções sobre NFSe e ISSQN.`;
  }
  if (
    msgLimpa.includes("substituto tributario") ||
    msgLimpa.includes("substitutos")
  ) {
    return `${nome}, digite *4* para consultar a Lista de Substitutos Tributários.`;
  }
  if (msgLimpa.includes("valor tflf") || msgLimpa.includes("tflf 2025")) {
    return `${nome}, digite *5* para acessar as opções da TFLF 2025: consultar por CNAE ou baixar planilha completa.`;
  }
  if (
    msgLimpa.includes("bci") ||
    msgLimpa.includes("boletim cadastro") ||
    msgLimpa.includes("cadastro imobiliario")
  ) {
    return `${nome}, digite *6* para consultar o Boletim de Cadastro Imobiliário (BCI) do seu imóvel.`;
  }
  if (
    msgLimpa.includes("agendamento") ||
    msgLimpa.includes("agendar") ||
    msgLimpa.includes("atendimento presencial") ||
    msgLimpa.includes("horario")
  ) {
    return `${nome}, digite *8* para acessar o sistema de agendamento de atendimentos.`;
  }

  // Resposta padrão
  return gerarRespostaPadrao(nome);
}

/**
 * Processa ações específicas das intenções detectadas
 * @param {string} action - Ação da intenção
 * @param {string} sender - ID do usuário
 * @param {string} nome - Nome do usuário
 * @param {Object} intention - Dados da intenção
 * @returns {Object|null} Resultado da ação ou null
 */
async function processarAcaoIntencao(action, sender, nome, intention) {
  console.log("🔧 [MessageHandler] Processando ação de intenção:", {
    action,
    sender,
    intentionId: intention?.id,
  });

  switch (action) {
    case "initiate_debitos":
      definirEstadoUsuario(sender, ESTADOS.DEBITOS_ATIVO);
      const resultadoDebitos = debitosService.iniciarConsultaDebitos(sender, nome);
      return resultadoDebitos.type === "text" ? resultadoDebitos.text : resultadoDebitos;

    case "initiate_certidoes":
      return iniciarFluxoCertidao(sender, nome);

    case "initiate_nfse":
      definirEstadoUsuario(sender, ESTADOS.OPCAO_3_NFSE);
      return gerarMenuNFSe(nome);

    case "initiate_bci":
      definirEstadoUsuario(sender, ESTADOS.BCI_ATIVO);
      const resultadoBci = bciService.iniciarConsultaBCI(sender, nome);
      return resultadoBci.type === "text" ? resultadoBci.text : resultadoBci;

    case "initiate_agendamento":
      definirEstadoUsuario(sender, ESTADOS.AGENDAMENTO_ATIVO);
      return await agendamentoFluxoService.iniciarFluxoAgendamento(sender, nome);

    case "initiate_tflf":
      definirEstadoUsuario(sender, ESTADOS.OPCAO_5_TFLF);
      return gerarMenuTFLF(nome);

    case "initiate_demonstrativo":
      definirEstadoUsuario(sender, ESTADOS.OPCAO_7_DEMONSTRATIVO);
      const resultadoDemonstrativo = demonstrativoFinanceiroService.iniciarConsultaDemonstrativo(sender, nome);
      return resultadoDemonstrativo.type === "text" ? resultadoDemonstrativo.text : resultadoDemonstrativo;

    case "initiate_substitutos":
      return gerarRespostaSubstitutos(nome);

    case "initiate_cadastro_geral":
      definirEstadoUsuario(sender, ESTADOS.OPCAO_9_CADASTRO_GERAL);
      const resultadoCadastro = cadastroGeralService.iniciarConsultaCadastroGeral(sender, nome);
      return resultadoCadastro.type === "text" ? resultadoCadastro.text : resultadoCadastro;

    case "initiate_atendente":
      return gerarRespostaAtendente(nome);

    case "choose_intention":
      // Ação especial para escolha entre múltiplas intenções
      // Será processada pelo usuário digitando o número da opção
      return null;

    default:
      console.warn("⚠️ [MessageHandler] Ação de intenção não reconhecida:", action);
      return null;
  }
}

module.exports = {
  processarMensagem,
  processarAcaoIntencao,
};
