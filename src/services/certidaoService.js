const {
  emitirCertidao,
  validarDadosCertidao,
} = require("../utils/certidaoApi");
const {
  obterEstadoUsuario,
  definirEstadoUsuario,
  obterDadosTemporarios,
  definirDadosTemporarios,
  limparDadosTemporarios,
} = require("./stateService");
const { ESTADOS, EMOJIS } = require("../config/constants");
const logger = require("../utils/logger");

// Constantes para tipos de contribuinte
const TIPOS_CONTRIBUINTE = {
  GERAL: "1",
  IMOVEL: "2",
};

const TIPOS_CONTRIBUINTE_LABELS = {
  [TIPOS_CONTRIBUINTE.GERAL]: "Pessoa Física/Jurídica",
  [TIPOS_CONTRIBUINTE.IMOVEL]: "Imóvel",
};

// Métricas de monitoramento
const metrics = {
  tentativasEmissao: 0,
  sucessos: 0,
  erros: 0,
  sessoesCriadas: 0,
  sessoesCanceladas: 0,
  tempoMedioProcessamento: [],
};

// Cache simples para dados de contribuintes (TTL: 5 minutos)
const cacheContribuintes = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Rate limiting simples (máximo 5 tentativas por usuário por hora)
const rateLimiting = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora

/**
 * Valida CPF usando algoritmo de dígitos verificadores
 * @param {string} cpf - CPF limpo (apenas números)
 * @returns {boolean} True se CPF é válido
 */
function validarCPF(cpf) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto < 2 ? 0 : resto;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto < 2 ? 0 : resto;

  return (
    digito1 === parseInt(cpf.charAt(9)) && digito2 === parseInt(cpf.charAt(10))
  );
}

/**
 * Valida CNPJ usando algoritmo de dígitos verificadores
 * @param {string} cnpj - CNPJ limpo (apenas números)
 * @returns {boolean} True se CNPJ é válido
 */
function validarCNPJ(cnpj) {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (cnpj, posicoes) => {
    let soma = 0;
    for (let i = 0; i < posicoes.length; i++) {
      soma += parseInt(cnpj.charAt(i)) * posicoes[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digito1 = calcularDigito(cnpj, pos1);
  const digito2 = calcularDigito(cnpj, pos2);

  return (
    digito1 === parseInt(cnpj.charAt(12)) &&
    digito2 === parseInt(cnpj.charAt(13))
  );
}

/**
 * Valida CPF ou CNPJ
 * @param {string} documento - Documento a ser validado
 * @returns {object} Resultado da validação
 */
function validarCpfCnpj(documento) {
  const limpo = documento.replace(/\D/g, "");

  if (limpo.length === 11) {
    return {
      valido: validarCPF(limpo),
      tipo: "CPF",
      documento: limpo,
    };
  } else if (limpo.length === 14) {
    return {
      valido: validarCNPJ(limpo),
      tipo: "CNPJ",
      documento: limpo,
    };
  }

  return {
    valido: false,
    tipo: null,
    documento: limpo,
  };
}

/**
 * Sanitiza entrada do usuário
 * @param {string} input - Entrada do usuário
 * @returns {string} Entrada sanitizada
 */
function sanitizarEntrada(input) {
  if (!input) return "";
  return input
    .toString()
    .trim()
    .replace(/[<>\"']/g, "");
}

/**
 * Valida sessão do usuário
 * @param {string} sender - ID do usuário
 * @returns {object} Resultado da validação
 */
function validarSessao(sender) {
  const dadosTemp = obterDadosTemporarios(sender);
  if (!dadosTemp) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    metrics.sessoesCanceladas++;
    return {
      valida: false,
      mensagem: `${EMOJIS.ERRO} *Ops! Sua sessão expirou* ${EMOJIS.RELOGIO}

Isso acontece por segurança após alguns minutos de inatividade.

Digite *certidao* para começar novamente ou *menu* para ver outras opções.`,
    };
  }
  return { valida: true, dados: dadosTemp };
}

/**
 * Verifica rate limiting para o usuário
 * @param {string} sender - ID do usuário
 * @returns {boolean} True se usuário pode continuar
 */
function verificarRateLimit(sender) {
  const agora = Date.now();
  const userLimits = rateLimiting.get(sender) || {
    count: 0,
    resetTime: agora + RATE_LIMIT_WINDOW,
  };

  if (agora > userLimits.resetTime) {
    userLimits.count = 0;
    userLimits.resetTime = agora + RATE_LIMIT_WINDOW;
  }

  if (userLimits.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimits.count++;
  rateLimiting.set(sender, userLimits);
  return true;
}

/**
 * Formata CPF/CNPJ para exibição
 * @param {string} documento - Documento limpo
 * @returns {string} Documento formatado
 */
function formatarDocumento(documento) {
  if (documento.length === 11) {
    return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (documento.length === 14) {
    return documento.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }
  return documento;
}

/**
 * Inicia o fluxo de emissão de certidão
 * @param {string} sender - ID do usuário
 * @param {string} nome - Nome do usuário
 * @returns {string} Mensagem de início do fluxo
 */
function iniciarFluxoCertidao(sender, nome) {
  // Verificar rate limiting
  if (!verificarRateLimit(sender)) {
    return `${EMOJIS.ERRO} *Muitas tentativas!* ${EMOJIS.RELOGIO}

Por segurança, você pode tentar novamente em 1 hora.

${EMOJIS.INFO} *Enquanto isso, você pode usar:*
🌐 Portal do Contribuinte: https://arapiraca.abaco.com.br/eagata/portal/
📧 Dúvidas: smfaz@arapiraca.al.gov.br
📞 Telefone: (82) 3539-6000`;
  }

  definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_TIPO_CONTRIBUINTE);
  limparDadosTemporarios(sender);
  metrics.sessoesCriadas++;

  logger.info("Iniciando fluxo de certidão", {
    sender,
    nome,
    timestamp: new Date().toISOString(),
  });

  return `${EMOJIS.DOCUMENTO} *Emissão Rápida de Certidões* ${EMOJIS.RAIO}

Olá ${nome}! ${EMOJIS.SAUDACAO}

Vou te ajudar a emitir sua certidão de forma *automática e gratuita* em poucos passos!

${EMOJIS.INFO} *Caso não consiga pelo WhatsApp:*
🌐 Portal: https://arapiraca.abaco.com.br/eagata/portal/
📧 Suporte: smfaz@arapiraca.al.gov.br
📞 Telefone: (82) 3539-6000

---

${EMOJIS.PERGUNTA} *Primeiro, me diga que tipo de certidão você precisa:*

*1* ${EMOJIS.PESSOA} Pessoa Física ou Jurídica
*2* ${EMOJIS.CASA} Imóvel/Propriedade

${EMOJIS.SETA} *Digite apenas o número (1 ou 2):*`;
}

/**
 * Processa a escolha do tipo de contribuinte
 * @param {string} sender - ID do usuário
 * @param {string} opcao - Opção escolhida
 * @param {string} nome - Nome do usuário
 * @returns {string} Próxima mensagem do fluxo
 */
function processarTipoContribuinte(sender, opcao, nome) {
  const opcaoLimpa = sanitizarEntrada(opcao);

  if (!TIPOS_CONTRIBUINTE_LABELS[opcaoLimpa]) {
    return `${EMOJIS.ERRO} *Opção inválida!* ${EMOJIS.CONFUSO}

Por favor, escolha uma das opções disponíveis:

*1* ${EMOJIS.PESSOA} Pessoa Física ou Jurídica
*2* ${EMOJIS.CASA} Imóvel/Propriedade

${EMOJIS.SETA} *Digite apenas o número 1 ou 2:*`;
  }

  // Salvar tipo escolhido
  definirDadosTemporarios(sender, { tipoContribuinte: opcaoLimpa });
  definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_CPF_CNPJ);

  logger.info("Tipo de contribuinte selecionado", {
    sender,
    tipoContribuinte: opcaoLimpa,
    timestamp: new Date().toISOString(),
  });

  const tipoSelecionado = TIPOS_CONTRIBUINTE_LABELS[opcaoLimpa];
  const emojiTipo =
    opcaoLimpa === TIPOS_CONTRIBUINTE.GERAL ? EMOJIS.PESSOA : EMOJIS.CASA;

  return `${EMOJIS.SUCESSO} *Perfeito!* ${emojiTipo}

Você selecionou: *${tipoSelecionado}*

${EMOJIS.DOCUMENTO} *Agora preciso do seu CPF ou CNPJ:*

${EMOJIS.INFO} *Dicas importantes:*
• Digite *apenas os números* (sem pontos, traços ou barras)
• CPF: 11 números | CNPJ: 14 números
• Exemplo CPF: 12345678901
• Exemplo CNPJ: 12345678000195

${EMOJIS.SETA} *Digite seu CPF ou CNPJ:*`;
}

/**
 * Processa o CPF/CNPJ informado
 * @param {string} sender - ID do usuário
 * @param {string} cpfCnpj - CPF/CNPJ informado
 * @param {string} nome - Nome do usuário
 * @returns {string} Próxima mensagem do fluxo
 */
function processarCpfCnpj(sender, cpfCnpj, nome) {
  const validacaoSessao = validarSessao(sender);
  if (!validacaoSessao.valida) {
    return validacaoSessao.mensagem;
  }

  const dadosTemp = validacaoSessao.dados;
  const cpfCnpjLimpo = sanitizarEntrada(cpfCnpj);

  // Validação avançada de CPF/CNPJ
  const validacaoDoc = validarCpfCnpj(cpfCnpjLimpo);

  if (!validacaoDoc.valido) {
    let mensagemErro = `${EMOJIS.ERRO} *${
      validacaoDoc.tipo || "Documento"
    } inválido!* ${EMOJIS.CONFUSO}

`;

    if (validacaoDoc.documento.length < 11) {
      mensagemErro += `Você digitou apenas ${validacaoDoc.documento.length} números.

${EMOJIS.INFO} *Preciso de:*
• CPF: exatamente 11 números
• CNPJ: exatamente 14 números`;
    } else if (validacaoDoc.documento.length > 14) {
      mensagemErro += `Você digitou ${validacaoDoc.documento.length} números (muito longo).

${EMOJIS.INFO} *Preciso de:*
• CPF: exatamente 11 números  
• CNPJ: exatamente 14 números`;
    } else if (
      validacaoDoc.documento.length === 11 ||
      validacaoDoc.documento.length === 14
    ) {
      mensagemErro += `Os dígitos verificadores não conferem.

${EMOJIS.INFO} *Verifique se digitou corretamente:*
• Todos os números estão corretos?
• Não esqueceu nenhum dígito?`;
    } else {
      mensagemErro += `${EMOJIS.INFO} *Formato correto:*
• CPF: 11 números (ex: 12345678901)
• CNPJ: 14 números (ex: 12345678000195)`;
    }

    mensagemErro += `

${EMOJIS.SETA} *
Digite novamente apenas os números:*`;

    return mensagemErro;
  }

  // Salvar CPF/CNPJ validado
  definirDadosTemporarios(sender, {
    ...dadosTemp,
    cpfCnpj: validacaoDoc.documento,
    tipoDocumento: validacaoDoc.tipo,
  });

  definirEstadoUsuario(sender, ESTADOS.AGUARDANDO_INSCRICAO);

  logger.info("CPF/CNPJ processado", {
    sender,
    tipoDocumento: validacaoDoc.tipo,
    documentoMascarado: formatarDocumento(validacaoDoc.documento).replace(
      /\d(?=\d{4})/g,
      "*"
    ),
    timestamp: new Date().toISOString(),
  });

  const documentoFormatado = formatarDocumento(validacaoDoc.documento);
  const tipoContribuinte = dadosTemp.tipoContribuinte;

  // Mensagem personalizada baseada no tipo de contribuinte
  let mensagemInscricao = "";
  let exemploInscricao = "";
  let dicasInscricao = "";

  if (tipoContribuinte === TIPOS_CONTRIBUINTE.GERAL) {
    mensagemInscricao = "Agora preciso do número do *Cadastro Geral*:";
    exemploInscricao = "• Exemplo: 123456 ou 1234567890";
    dicasInscricao = `${EMOJIS.INFO} *Onde encontrar seu Cadastro Geral:*
• Certidões anteriores
• Cadastro na Prefeitura
• Portal do Contribuinte`;
  } else {
    mensagemInscricao = "Agora preciso do número da *Matrícula do Imóvel*:";
    exemploInscricao = "• Exemplo: 987654 ou 9876543210";
    dicasInscricao = `${EMOJIS.INFO} *Onde encontrar a Matrícula do Imóvel:*
• Carnê do IPTU
• Escritura do imóvel
• Certidões anteriores do imóvel
• Portal do Contribuinte`;
  }

  return `${EMOJIS.SUCESSO} *${validacaoDoc.tipo} confirmado!* ${EMOJIS.VERIFICADO}

*Documento:* ${documentoFormatado}

${EMOJIS.DOCUMENTO} ${mensagemInscricao}

${dicasInscricao}

${EMOJIS.EXEMPLO} *Formato:*
• Digite *apenas os números*
${exemploInscricao}
• Sem pontos, traços ou letras

${EMOJIS.SETA} *Digite o número da inscrição ou do cad. geral::*`;
}

/**
 * Processa a inscrição e emite a certidão com retry automático
 * @param {string} sender - ID do usuário
 * @param {string} inscricao - Inscrição informada
 * @param {string} nome - Nome do usuário
 * @returns {Promise<string>} Resultado da emissão
 */
async function processarInscricaoEEmitir(sender, inscricao, nome) {
  const inicioProcessamento = Date.now();

  const validacaoSessao = validarSessao(sender);
  if (!validacaoSessao.valida) {
    return validacaoSessao.mensagem;
  }

  const dadosTemp = validacaoSessao.dados;
  const inscricaoLimpa = sanitizarEntrada(inscricao).replace(/\D/g, "");

  if (!inscricaoLimpa || inscricaoLimpa.length < 3) {
    return `${EMOJIS.ERRO} *Inscrição muito curta!* ${EMOJIS.CONFUSO}

A inscrição deve ter pelo menos 3 números.

${EMOJIS.SETA} *Digite novamente o número da ${
      dadosTemp.tipoContribuinte === TIPOS_CONTRIBUINTE.IMOVEL
        ? "matrícula do imóvel"
        : "inscrição"
    }:*`;
  }

  // Validar dados usando a API
  const validacao = validarDadosCertidao(
    dadosTemp.tipoContribuinte,
    inscricaoLimpa
  );

  if (!validacao.isValid) {
    logger.warn("Dados inválidos para certidão", {
      sender,
      erros: validacao.errors,
      timestamp: new Date().toISOString(),
    });

    return `${EMOJIS.ERRO} *Dados inválidos encontrados:* ${EMOJIS.ALERTA}

${validacao.errors.map((erro) => `• ${erro}`).join("\n")}

${EMOJIS.INFO} *Dicas:*
• Verifique se a inscrição está correta
• Confirme no seu carnê ou documento
• Tente sem pontos, traços ou letras

${EMOJIS.SETA} *Digite novamente a ${
      dadosTemp.tipoContribuinte === TIPOS_CONTRIBUINTE.IMOVEL
        ? "matrícula do imóvel"
        : "inscrição"
    }:*`;
  }

  // Verificar cache primeiro
  const chaveCache = `${dadosTemp.cpfCnpj}_${inscricaoLimpa}_${dadosTemp.tipoContribuinte}`;
  const dadosCache = cacheContribuintes.get(chaveCache);

  if (dadosCache && Date.now() - dadosCache.timestamp < CACHE_TTL) {
    logger.info("Dados obtidos do cache", {
      sender,
      chaveCache: chaveCache.replace(dadosTemp.cpfCnpj, "***"),
      timestamp: new Date().toISOString(),
    });
  }

  // Limpar estado e dados temporários
  definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
  limparDadosTemporarios(sender);
  metrics.tentativasEmissao++;

  try {
    logger.info("Iniciando emissão de certidão", {
      sender,
      tipoContribuinte: dadosTemp.tipoContribuinte,
      inscricao: inscricaoLimpa,
      timestamp: new Date().toISOString(),
    });

    // Função de retry com backoff exponencial
    const emitirComRetry = async (tentativa = 1, maxTentativas = 3) => {
      try {
        const resultado = await emitirCertidao({
          tipoContribuinte: dadosTemp.tipoContribuinte,
          inscricao: inscricaoLimpa,
          cpfCnpj: dadosTemp.cpfCnpj,
          operacao: "2", // Certidão
        });
        return resultado;
      } catch (error) {
        if (tentativa < maxTentativas) {
          const delay = Math.pow(2, tentativa) * 1000; // Backoff exponencial
          logger.warn(
            `Tentativa ${tentativa} falhou, tentando novamente em ${delay}ms`,
            {
              sender,
              error: error.message,
              tentativa,
              timestamp: new Date().toISOString(),
            }
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          return emitirComRetry(tentativa + 1, maxTentativas);
        }
        throw error;
      }
    };

    const resultado = await emitirComRetry();

    // Calcular tempo de processamento
    const tempoProcessamento = Date.now() - inicioProcessamento;
    metrics.tempoMedioProcessamento.push(tempoProcessamento);

    // Manter apenas os últimos 100 tempos para cálculo da média
    if (metrics.tempoMedioProcessamento.length > 100) {
      metrics.tempoMedioProcessamento.shift();
    }

    if (resultado.SSACodigo === 0 && resultado.SSALinkDocumento) {
      metrics.sucessos++;

      // Salvar no cache
      cacheContribuintes.set(chaveCache, {
        dados: resultado,
        timestamp: Date.now(),
      });

      logger.info("Certidão emitida com sucesso", {
        sender,
        nomeContribuinte: resultado.SSANomeRazao,
        inscricao: resultado.SSAInscricao || inscricaoLimpa,
        tempoProcessamento,
        timestamp: new Date().toISOString(),
      });

      const nomeContribuinte = resultado.SSANomeRazao || "Não informado";
      const inscricaoFinal = resultado.SSAInscricao || inscricaoLimpa;
      const documentoFormatado = formatarDocumento(dadosTemp.cpfCnpj);
      const tipoDoc = dadosTemp.tipoDocumento;
      const tipoInscricao =
        dadosTemp.tipoContribuinte === TIPOS_CONTRIBUINTE.IMOVEL
          ? "Matrícula"
          : "Inscrição";

      return `${EMOJIS.SUCESSO} *Certidão emitida com sucesso!* ${EMOJIS.FESTA}

${EMOJIS.DOCUMENTO} *LINK DA CERTIDÃO:*
${resultado.SSALinkDocumento}

${EMOJIS.INFO} *Dados da Certidão:*
👤 *Nome/Razão:* ${nomeContribuinte}
📄 *${tipoDoc}:* ${documentoFormatado}
🏷️ *${tipoInscricao}:* ${inscricaoFinal}
⏱️ *Processado em:* ${Math.round(tempoProcessamento / 1000)}s

${EMOJIS.ALERTA} *IMPORTANTE:*
• Link temporário - baixe/imprima *AGORA*!
• Válido por tempo limitado
• Salve o arquivo no seu celular

${EMOJIS.AJUDA} *Precisa de outra certidão?*
Digite *certidao* ou *menu* para voltar.

${EMOJIS.AVALIACAO} *Gostou do atendimento?* Nos avalie!`;
    } else {
      metrics.erros++;

      logger.error("Erro na emissão da certidão", {
        sender,
        codigoErro: resultado.SSACodigo,
        mensagemErro: resultado.SSAMensagem,
        timestamp: new Date().toISOString(),
      });

      const mensagemErro =
        resultado.SSAMensagem || "Erro não especificado pelo sistema";

      return `${EMOJIS.ERRO} *Não foi possível emitir a certidão* ${EMOJIS.TRISTE}

${EMOJIS.INFO} *Motivo:* ${mensagemErro}

${EMOJIS.SOLUCAO} *O que você pode fazer:*

1️⃣ *Verificar os dados:*
   • CPF/CNPJ está correto?
   • Inscrição está correta?
   • Consulte seu carnê ou documento

2️⃣ *Tentar novamente:*
   Digite *certidao* para nova tentativa

3️⃣ *Usar outros canais:*
   🌐 Portal: https://arapiraca.abaco.com.br/eagata/portal/
   📧 Email: smfaz@arapiraca.al.gov.br
   📞 Telefone: (82) 3539-6000

${EMOJIS.AJUDA} Digite *menu* para ver outras opções.`;
    }
  } catch (error) {
    metrics.erros++;

    logger.error("Erro crítico na emissão de certidão", {
      sender,
      error: error.message,
      stack: error.stack,
      dadosTemp: {
        tipoContribuinte: dadosTemp.tipoContribuinte,
        inscricao: inscricaoLimpa,
      },
      timestamp: new Date().toISOString(),
    });

    return `${EMOJIS.ERRO} *Ops! Problema técnico no sistema* ${EMOJIS.FERRAMENTA}

Nossos servidores estão com instabilidade no momento.

${EMOJIS.SOLUCAO} *Soluções:*

1️⃣ *Tente novamente em 5 minutos:*
   Digite *certidao*

2️⃣ *Use o Portal do Contribuinte:*
   🌐 https://arapiraca.abaco.com.br/eagata/portal/

3️⃣ *Entre em contato:*
   📧 smfaz@arapiraca.al.gov.br
   📞 (82) 3539-6000

${EMOJIS.INFO} *Horário de atendimento:*
Segunda a Sexta: 7h às 13h

Desculpe o transtorno! ${EMOJIS.DESCULPA}`;
  }
}

/**
 * Verifica se a mensagem é uma solicitação de emissão de certidão
 * @param {string} msgLimpa - Mensagem normalizada
 * @returns {boolean} True se é solicitação de certidão
 */
function ehSolicitacaoCertidao(msgLimpa) {
  const palavrasChave = [
    "emitir certidao",
    "emitir certidão",
    "certidao automatica",
    "certidão automatica",
    "certidao automática",
    "certidão automática",
    "gerar certidao",
    "gerar certidão",
    "solicitar certidao",
    "solicitar certidão",
    "nova certidao",
    "nova certidão",
    "certidao negativa",
    "certidão negativa",
    "certidao positiva",
    "certidão positiva",
    "emissao automatica",
    "emissão automatica",
    "emissão automática",
    "emissao automática",
    "certidao",
    "certidão",
    "documento fiscal",
    "comprovante fiscal",
    "regularidade fiscal",
  ];

  return palavrasChave.some((palavra) => msgLimpa.includes(palavra));
}

/**
 * Obtém métricas do serviço
 * @returns {object} Métricas atuais
 */
function obterMetricas() {
  const tempoMedio =
    metrics.tempoMedioProcessamento.length > 0
      ? metrics.tempoMedioProcessamento.reduce((a, b) => a + b, 0) /
        metrics.tempoMedioProcessamento.length
      : 0;

  return {
    ...metrics,
    tempoMedioProcessamento: Math.round(tempoMedio),
    taxaSucesso:
      metrics.tentativasEmissao > 0
        ? Math.round((metrics.sucessos / metrics.tentativasEmissao) * 100)
        : 0,
    cacheSize: cacheContribuintes.size,
    rateLimitingActive: rateLimiting.size,
  };
}

/**
 * Limpa cache expirado (executar periodicamente)
 */
function limparCacheExpirado() {
  const agora = Date.now();
  for (const [chave, dados] of cacheContribuintes.entries()) {
    if (agora - dados.timestamp > CACHE_TTL) {
      cacheContribuintes.delete(chave);
    }
  }
}

/**
 * Limpa rate limiting expirado (executar periodicamente)
 */
function limparRateLimitingExpirado() {
  const agora = Date.now();
  for (const [sender, dados] of rateLimiting.entries()) {
    if (agora > dados.resetTime) {
      rateLimiting.delete(sender);
    }
  }
}

/**
 * Reseta métricas (executar diariamente)
 */
function resetarMetricas() {
  metrics.tentativasEmissao = 0;
  metrics.sucessos = 0;
  metrics.erros = 0;
  metrics.sessoesCriadas = 0;
  metrics.sessoesCanceladas = 0;
  metrics.tempoMedioProcessamento = [];

  logger.info("Métricas resetadas", {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Cancela sessão do usuário
 * @param {string} sender - ID do usuário
 * @returns {string} Mensagem de cancelamento
 */
function cancelarSessao(sender) {
  const estado = obterEstadoUsuario(sender);

  if (estado && estado !== ESTADOS.MENU_PRINCIPAL) {
    definirEstadoUsuario(sender, ESTADOS.MENU_PRINCIPAL);
    limparDadosTemporarios(sender);
    metrics.sessoesCanceladas++;

    logger.info("Sessão cancelada pelo usuário", {
      sender,
      estadoAnterior: estado,
      timestamp: new Date().toISOString(),
    });

    return `${EMOJIS.SUCESSO} *Sessão cancelada!* ${EMOJIS.VERIFICADO}

Você voltou ao menu principal.

${EMOJIS.AJUDA} *O que deseja fazer?*
• Digite *certidao* para emitir certidão
• Digite *menu* para ver todas as opções
• Digite *ajuda* para obter suporte`;
  }

  return `${EMOJIS.INFO} Você não tem nenhuma sessão ativa no momento.

Digite *menu* para ver as opções disponíveis.`;
}

/**
 * Obtém ajuda contextual baseada no estado atual
 * @param {string} sender - ID do usuário
 * @returns {string} Mensagem de ajuda
 */
function obterAjudaContextual(sender) {
  const estado = obterEstadoUsuario(sender);
  const dadosTemp = obterDadosTemporarios(sender);

  switch (estado) {
    case ESTADOS.AGUARDANDO_TIPO_CONTRIBUINTE:
      return `${EMOJIS.AJUDA} *Ajuda - Tipo de Contribuinte*

Você precisa escolher entre:

*1* ${EMOJIS.PESSOA} *Pessoa Física/Jurídica*
   • Para CPF ou CNPJ
   • Certidão de pessoa ou empresa
   
*2* ${EMOJIS.CASA} *Imóvel/Propriedade*  
   • Para propriedades/terrenos
   • Certidão de imóvel

${EMOJIS.SETA} Digite *1* ou *2*
${EMOJIS.CANCELAR} Digite *cancelar* para sair`;

    case ESTADOS.AGUARDANDO_CPF_CNPJ:
      return `${EMOJIS.AJUDA} *Ajuda - CPF/CNPJ*

${EMOJIS.INFO} *Formato correto:*
• *CPF:* 11 números (ex: 12345678901)
• *CNPJ:* 14 números (ex: 12345678000195)
• *Apenas números* - sem pontos, traços ou barras

${EMOJIS.EXEMPLO} *Onde encontrar:*
• RG, CNH, Carteira de Trabalho (CPF)
• Contrato Social, Cartão CNPJ (CNPJ)

${EMOJIS.SETA} Digite seu CPF ou CNPJ
${EMOJIS.CANCELAR} Digite *cancelar* para sair`;

    case ESTADOS.AGUARDANDO_INSCRICAO:
      const tipoInscricao =
        dadosTemp?.tipoContribuinte === TIPOS_CONTRIBUINTE.IMOVEL
          ? "Matrícula do Imóvel"
          : "Cadastro Geral";

      return `${EMOJIS.AJUDA} *Ajuda - ${tipoInscricao}*

${EMOJIS.INFO} *Onde encontrar:*
${
  dadosTemp?.tipoContribuinte === TIPOS_CONTRIBUINTE.IMOVEL
    ? `
• Carnê do IPTU
• Escritura do imóvel  
• Certidões anteriores do imóvel
• Portal do Contribuinte`
    : `
• Certidões anteriores
• Cadastro na Prefeitura
• Portal do Contribuinte`
}

${EMOJIS.EXEMPLO} *Formato:*
• Apenas números
• Sem pontos, traços ou letras
• Exemplo: 123456 ou 1234567890

${EMOJIS.SETA} Digite o número da ${tipoInscricao.toLowerCase()}
${EMOJIS.CANCELAR} Digite *cancelar* para sair`;

    default:
      return `${EMOJIS.AJUDA} *Central de Ajuda*

${EMOJIS.DOCUMENTO} *Para emitir certidão:*
Digite *certidao*

${EMOJIS.INFO} *Outros canais de atendimento:*
🌐 Portal: https://arapiraca.abaco.com.br/eagata/portal/
📧 Email: smfaz@arapiraca.al.gov.br  
📞 Telefone: (82) 3539-6000

${EMOJIS.RELOGIO} *Horário de atendimento:*
Segunda a Sexta: 7h às 13h

${EMOJIS.MENU} Digite *menu* para ver todas as opções`;
  }
}

// Configurar limpeza automática de cache e rate limiting
setInterval(() => {
  limparCacheExpirado();
  limparRateLimitingExpirado();
}, 5 * 60 * 1000); // A cada 5 minutos

// Configurar reset de métricas diário
setInterval(() => {
  resetarMetricas();
}, 24 * 60 * 60 * 1000); // A cada 24 horas

module.exports = {
  iniciarFluxoCertidao,
  processarTipoContribuinte,
  processarCpfCnpj,
  processarInscricaoEEmitir,
  ehSolicitacaoCertidao,
  cancelarSessao,
  obterAjudaContextual,
  obterMetricas,
  limparCacheExpirado,
  limparRateLimitingExpirado,
  resetarMetricas,

  // Constantes exportadas para uso em outros módulos
  TIPOS_CONTRIBUINTE,
  TIPOS_CONTRIBUINTE_LABELS,
};
