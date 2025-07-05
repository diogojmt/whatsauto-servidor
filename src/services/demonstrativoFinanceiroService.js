const axios = require("axios");

/**
 * Serviço para consulta de Demonstrativo Financeiro
 */
class DemonstrativoFinanceiroService {
  constructor() {
    this.sessoes = new Map(); // Armazena dados das sessões por usuário
    this.apiUrl =
      "https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidocumento";

    // CPF fake para contornar validação da API (a API não utiliza na prática)
    this.cpfFake = "11111111111";

    // Métricas de monitoramento
    this.metrics = {
      tentativasConsulta: 0,
      sucessos: 0,
      erros: 0,
      sessoesCriadas: 0,
      sessoesCanceladas: 0,
      tempoMedioProcessamento: [],
    };
  }

  /**
   * Inicia o fluxo de consulta de Demonstrativo Financeiro
   * @param {string} sender - ID do usuário
   * @param {string} nome - Nome do usuário
   * @returns {Object} Resposta para o usuário
   */
  iniciarConsultaDemonstrativo(sender, nome) {
    this.limparSessao(sender);
    this.setSessao(sender, { etapa: "tipo_contribuinte", nome });
    this.metrics.sessoesCriadas++;

    return {
      type: "text",
      text: `📊 *Demonstrativo Financeiro*

${nome}, vou ajudá-lo a consultar e emitir o Demonstrativo Financeiro de forma *rápida e automática*!

📋 *O que é o Demonstrativo Financeiro?*
O Demonstrativo Financeiro é um documento que contém informações detalhadas sobre:
• Débitos pendentes
• Histórico de pagamentos
• Situação fiscal atual
• Valores em aberto

💡 *Para continuar, preciso que você escolha o tipo de contribuinte:*

1 - *Pessoa Física/Jurídica* (Código do Contribuinte Geral)
2 - *Imóvel* (Inscrição Imobiliária)
3 - *Empresa* (Inscrição Municipal)

📝 *Digite o número da opção desejada:*

Ou digite *0* para voltar ao menu principal.`,
    };
  }

  /**
   * Processa a entrada do usuário conforme a etapa atual
   * @param {string} sender - ID do usuário
   * @param {string} message - Mensagem do usuário
   * @returns {Object} Resposta para o usuário
   */
  async processarEtapa(sender, message) {
    const msgLimpa = message.trim();

    // Verificar se o usuário quer voltar ao menu principal
    if (msgLimpa === "0" || msgLimpa.toLowerCase() === "menu") {
      this.limparSessao(sender);
      return {
        type: "redirect",
        action: "menu_principal",
      };
    }

    const sessao = this.getSessao(sender);
    if (!sessao) {
      return this.iniciarConsultaDemonstrativo(sender, "usuário");
    }

    console.log("[DemonstrativoFinanceiroService] Processando etapa:", {
      etapa: sessao.etapa,
      mensagem: msgLimpa,
      sessao: sessao,
    });

    switch (sessao.etapa) {
      case "tipo_contribuinte":
        return this.processarTipoContribuinte(sender, msgLimpa);
      case "codigo_contribuinte":
        return await this.processarCodigoContribuinte(sender, msgLimpa);
      default:
        return this.iniciarConsultaDemonstrativo(
          sender,
          sessao.nome || "usuário"
        );
    }
  }

  /**
   * Processa a seleção do tipo de contribuinte
   */
  processarTipoContribuinte(sender, msg) {
    const sessao = this.getSessao(sender);

    if (!["1", "2", "3"].includes(msg)) {
      return {
        type: "text",
        text: `❌ *Opção inválida!*

Por favor, digite uma das opções disponíveis:

1️⃣ *Pessoa Física/Jurídica* (Código do Contribuinte Geral)
2️⃣ *Imóvel* (Inscrição Imobiliária)
3️⃣ *Empresa* (Inscrição Municipal)

📝 *Digite o número da opção desejada:*

Ou digite *0* para voltar ao menu principal.`,
      };
    }

    let tipoTexto = "";
    let campoTexto = "";

    switch (msg) {
      case "1":
        tipoTexto = "Pessoa Física/Jurídica";
        campoTexto = "Código do Contribuinte Geral";
        break;
      case "2":
        tipoTexto = "Imóvel";
        campoTexto = "Inscrição Imobiliária";
        break;
      case "3":
        tipoTexto = "Empresa";
        campoTexto = "Inscrição Municipal";
        break;
    }

    // Atualizar sessão com o tipo selecionado
    this.updateSessao(sender, {
      etapa: "codigo_contribuinte",
      tipoContribuinte: msg,
      tipoTexto: tipoTexto,
      campoTexto: campoTexto,
    });

    return {
      type: "text",
      text: `✅ *Tipo selecionado: ${tipoTexto}*

${sessao.nome}, agora preciso do ${campoTexto}.

📍 *Onde encontrar:*
${
  msg === "1"
    ? "• Documentos da Prefeitura\n• Carnês de tributos\n• Certidões anteriores"
    : msg === "2"
    ? "• Carnê do IPTU\n• Escritura do imóvel\n• Documentos do imóvel\n• Portal do Contribuinte"
    : "• Alvará de funcionamento\n• Documentos da empresa\n• Certidões municipais"
}

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345 ou 12345

Ou digite *0* para voltar ao menu principal.`,
    };
  }

  /**
   * Processa o código do contribuinte e executa a consulta
   */
  async processarCodigoContribuinte(sender, msg) {
    const inicioProcessamento = Date.now();
    const sessao = this.getSessao(sender);

    // Remove caracteres não numéricos
    const codigoLimpo = msg.replace(/[^0-9]/g, "");

    console.log("[DemonstrativoFinanceiroService] Processando código:", {
      codigoOriginal: msg,
      codigoLimpo: codigoLimpo,
      tipoContribuinte: sessao.tipoContribuinte,
      usandoCpfFake: true,
    });

    // Validação
    if (codigoLimpo.length === 0) {
      return {
        type: "text",
        text: `❌ *Código inválido!*

Por favor, digite apenas números.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345 ou 12345

Ou *0* para voltar ao menu principal.`,
      };
    }

    if (codigoLimpo.length < 2) {
      return {
        type: "text",
        text: `❌ *Código muito curto!*

O ${sessao.campoTexto} deve ter pelo menos 2 dígitos.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345 ou 12345

Ou *0* para voltar ao menu principal.`,
      };
    }

    // Salvar o código na sessão
    this.updateSessao(sender, {
      codigo: codigoLimpo,
    });

    // Executar a consulta diretamente
    this.metrics.tentativasConsulta++;

    const resultado = await this.executarConsulta(sender, codigoLimpo);

    // Calcular tempo de processamento
    const tempoProcessamento = Date.now() - inicioProcessamento;
    this.metrics.tempoMedioProcessamento.push(tempoProcessamento);

    // Manter apenas os últimos 100 tempos para cálculo da média
    if (this.metrics.tempoMedioProcessamento.length > 100) {
      this.metrics.tempoMedioProcessamento.shift();
    }

    return resultado;
  }

  /**
   * Executa a consulta na API e formata a resposta
   */
  async executarConsulta(sender, codigo) {
    const sessao = this.getSessao(sender);

    console.log(
      "[DemonstrativoFinanceiroService] Executando consulta com código:",
      codigo,
      "tipo:",
      sessao.tipoContribuinte,
      "usando CPF fake:",
      this.cpfFake
    );

    try {
      // Montar parâmetros da API
      const parametros = {
        SSEChave: "@C0sS0_@P1",
        SSETipoContribuinte: sessao.tipoContribuinte, // 1, 2 ou 3
        SSEInscricao: codigo,
        SSEExercicioDebito: "",
        SSETipoConsumo: "",
        SSENossoNumero: "",
        SSECPFCNPJ: this.cpfFake, // Usar CPF fake
        SSEOperacao: "1", // 1 = Demonstrativo Financeiro
        SSEIdentificador: "",
      };

      console.log("[DemonstrativoFinanceiroService] Parâmetros da API:", {
        ...parametros,
        SSECPFCNPJ: "***FAKE***", // Mascarar nos logs
      });

      const response = await axios.get(this.apiUrl, {
        headers: {
          DadosAPIDocumento: JSON.stringify(parametros),
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 segundos
      });

      const resultado = response.data;

      console.log("[DemonstrativoFinanceiroService] Resultado da consulta:", {
        codigo: resultado.SSACodigo,
        mensagem: resultado.SSAMensagem,
        temLink: !!resultado.SSALinkDocumento,
        usouCpfFake: true,
      });

      if (resultado.SSACodigo === 0 && resultado.SSALinkDocumento) {
        // Sucesso - Demonstrativo encontrado
        this.metrics.sucessos++;
        this.limparSessao(sender);
        return this.formatarSucesso(resultado, sessao);
      } else if (resultado.SSACodigo === 0) {
        // Sucesso mas sem link do documento
        this.metrics.erros++;
        this.limparSessao(sender);
        return this.formatarSemDocumento(resultado, sessao);
      } else {
        // Erro na consulta
        this.metrics.erros++;
        this.limparSessao(sender);
        return this.formatarErroConsulta(resultado, sessao);
      }
    } catch (error) {
      console.error(
        "[DemonstrativoFinanceiroService] Erro na execução da consulta:",
        error
      );

      this.metrics.erros++;
      this.limparSessao(sender);
      return {
        type: "text",
        text: `❌ *Erro interno*

${sessao.nome}, ocorreu um erro inesperado durante a consulta.

🔄 *Tentar novamente?*
Digite *7* para nova consulta de Demonstrativo Financeiro

📧 smfaz@arapiraca.al.gov.br

Ou digite *menu* para voltar ao menu principal.`,
      };
    }
  }

  /**
   * Formata resposta de sucesso
   */
  formatarSucesso(resultado, sessao) {
    let resposta = `✅ *Demonstrativo Financeiro encontrado!*

${sessao.nome}, documento referente ao ${sessao.campoTexto}: ${sessao.codigo}

📊 *Informações Encontradas:*
`;

    // Adicionar informações disponíveis
    if (resultado.SSAInscricao) {
      resposta += `• **${sessao.campoTexto}:** ${resultado.SSAInscricao}\n`;
    }
    if (resultado.SSANomeRazao) {
      resposta += `• **Nome/Razão Social:** ${resultado.SSANomeRazao}\n`;
    }
    if (resultado.SSACPFCNPJ && resultado.SSACPFCNPJ !== this.cpfFake) {
      resposta += `• **CPF/CNPJ:** ${resultado.SSACPFCNPJ}\n`;
    }
    if (resultado.SSALogradouro) {
      let endereco = resultado.SSALogradouro;
      if (resultado.SSANumero) endereco += `, ${resultado.SSANumero}`;
      if (resultado.SSAComplemento) endereco += `, ${resultado.SSAComplemento}`;
      resposta += `• **Endereço:** ${endereco}\n`;
    }
    if (resultado.SSABairro) {
      resposta += `• **Bairro:** ${resultado.SSABairro}\n`;
    }

    resposta += `\n📄 *Documento Demonstrativo Financeiro:*
🔗 [Clique aqui para baixar o Demonstrativo](${resultado.SSALinkDocumento})

⚠️ *IMPORTANTE:*
• Link temporário - baixe/imprima *AGORA*!
• Válido por tempo limitado
• Salve o arquivo no seu celular

💡 *Sobre o Demonstrativo Financeiro:*
• Contém informações sobre débitos pendentes
• Mostra histórico de pagamentos
• Documento oficial da Prefeitura
• Útil para regularização fiscal

🔄 *Precisa de outro Demonstrativo?*
Digite *7* para nova consulta

📞 *Dúvidas:* smfaz@arapiraca.al.gov.br

Digite *menu* para voltar ao menu principal.`;

    return { type: "text", text: resposta };
  }

  /**
   * Formata resposta quando não há documento disponível
   */
  formatarSemDocumento(resultado, sessao) {
    return {
      type: "text",
      text: `⚠️ *Contribuinte encontrado, mas documento indisponível*

${sessao.nome}, o ${
        sessao.tipoTexto
      } foi localizado no sistema, mas o Demonstrativo Financeiro não está disponível para download no momento.

📋 *Dados encontrados:*
• ${sessao.campoTexto}: ${resultado.SSAInscricao || "Não informado"}
• Nome/Razão Social: ${resultado.SSANomeRazao || "Não informado"}

💡 *O que fazer:*
• Entre em contato conosco para obter o documento
• Compareça pessoalmente à Secretaria da Fazenda
• Tente novamente mais tarde

🔄 *Tentar novamente?*
Digite *7* para nova consulta de Demonstrativo Financeiro

📧 *Contato:* smfaz@arapiraca.al.gov.br
🏛️ *Endereço:* Secretaria da Fazenda Municipal
📞 *Telefone:* (82) 3539-6000

Digite *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Formata resposta de erro da API
   */
  formatarErroConsulta(resultado, sessao) {
    return {
      type: "text",
      text: `❌ *Erro na consulta*

${
  sessao.nome
}, não foi possível consultar o Demonstrativo Financeiro no momento.

🔍 *Detalhes:* ${resultado.SSAMensagem || "Erro desconhecido"}

💡 *Possíveis motivos:*
• ${sessao.campoTexto} não encontrado
• ${sessao.tipoTexto} não cadastrado no sistema
• Sistema temporariamente indisponível
• Dados incorretos

✅ *Dicas para resolver:*
• Verifique o código nos documentos oficiais
• Confirme se digitou apenas números
• Tente sem zeros à esquerda

🔄 *Tentar novamente?*
Digite *7* para nova consulta de Demonstrativo Financeiro

📧 *Contato:* smfaz@arapiraca.al.gov.br
📞 *Telefone:* (82) 3539-6000

Ou digite *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Verifica se uma mensagem indica intenção de consultar Demonstrativo Financeiro
   */
  detectarIntencaoDemonstrativo(message) {
    if (!message || typeof message !== "string") {
      return false;
    }

    const msgLimpa = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const palavrasChave = [
      "demonstrativo financeiro",
      "demonstrativo",
      "financeiro",
      "debitos",
      "situacao fiscal",
      "historico pagamentos",
      "regularizacao",
      "situacao contribuinte",
      "extrato fiscal",
      "posicao fiscal",
    ];

    return palavrasChave.some((palavra) => msgLimpa.includes(palavra));
  }

  /**
   * Obtém métricas do serviço
   * @returns {object} Métricas atuais
   */
  obterMetricas() {
    const tempoMedio =
      this.metrics.tempoMedioProcessamento.length > 0
        ? this.metrics.tempoMedioProcessamento.reduce((a, b) => a + b, 0) /
          this.metrics.tempoMedioProcessamento.length
        : 0;

    return {
      ...this.metrics,
      tempoMedioProcessamento: Math.round(tempoMedio),
      taxaSucesso:
        this.metrics.tentativasConsulta > 0
          ? Math.round(
              (this.metrics.sucessos / this.metrics.tentativasConsulta) * 100
            )
          : 0,
      sessoesAtivas: this.sessoes.size,
    };
  }

  /**
   * Reseta métricas (executar periodicamente)
   */
  resetarMetricas() {
    this.metrics.tentativasConsulta = 0;
    this.metrics.sucessos = 0;
    this.metrics.erros = 0;
    this.metrics.sessoesCriadas = 0;
    this.metrics.sessoesCanceladas = 0;
    this.metrics.tempoMedioProcessamento = [];

    console.log("[DemonstrativoFinanceiroService] Métricas resetadas", {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Cancela sessão do usuário
   * @param {string} sender - ID do usuário
   * @returns {Object} Mensagem de cancelamento
   */
  cancelarSessao(sender) {
    const sessao = this.getSessao(sender);

    if (sessao) {
      this.limparSessao(sender);
      this.metrics.sessoesCanceladas++;

      console.log(
        "[DemonstrativoFinanceiroService] Sessão cancelada pelo usuário",
        {
          sender,
          sessaoAnterior: sessao,
          timestamp: new Date().toISOString(),
        }
      );

      return {
        type: "text",
        text: `✅ *Sessão de Demonstrativo Financeiro cancelada!*

Você voltou ao menu principal.

📊 *Para consultar Demonstrativo Financeiro novamente:*
Digite *7* ou *demonstrativo*

📋 *Outras opções:*
• Digite *menu* para ver todas as opções
• Digite *ajuda* para obter suporte`,
      };
    }

    return {
      type: "text",
      text: `ℹ️ Você não tem nenhuma sessão de Demonstrativo Financeiro ativa no momento.

Digite *menu* para ver as opções disponíveis.`,
    };
  }

  /**
   * Obtém ajuda contextual para Demonstrativo Financeiro
   * @param {string} sender - ID do usuário
   * @returns {Object} Mensagem de ajuda
   */
  obterAjudaContextual(sender) {
    const sessao = this.getSessao(sender);

    if (sessao) {
      if (sessao.etapa === "tipo_contribuinte") {
        return {
          type: "text",
          text: `🆘 *Ajuda - Demonstrativo Financeiro*

📊 *Tipos de Contribuinte:*

1️⃣ *Pessoa Física/Jurídica*
• Para cidadãos e empresas em geral
• Código do Contribuinte Geral

2️⃣ *Imóvel*
• Para consultas relacionadas a imóveis
• Inscrição Imobiliária (carnê IPTU)

3️⃣ *Empresa*
• Para empresas com inscrição municipal
• Inscrição Municipal (alvará)

📝 *Digite o número da opção desejada*

📞 *Contato:* smfaz@arapiraca.al.gov.br

Digite *0* para voltar ao menu principal.`,
        };
      } else if (sessao.etapa === "codigo_contribuinte") {
        return {
          type: "text",
          text: `🆘 *Ajuda - ${sessao.campoTexto}*

📍 *Onde encontrar o ${sessao.campoTexto}:*
${
  sessao.tipoContribuinte === "1"
    ? "• Documentos da Prefeitura\n• Carnês de tributos\n• Certidões anteriores"
    : sessao.tipoContribuinte === "2"
    ? "• Carnê do IPTU\n• Escritura do imóvel\n• Documentos do imóvel\n• Portal do Contribuinte"
    : "• Alvará de funcionamento\n• Documentos da empresa\n• Certidões municipais"
}

📝 *Formato correto:*
• Digite *apenas números*
• Sem pontos, traços ou espaços
• Exemplo: 000000000012345 ou 12345
• Pode ter zeros à esquerda ou não

❌ *Problemas comuns:*
• Não digite letras ou símbolos
• Verifique se o código está correto
• Confirme nos documentos oficiais

📞 *Contato:* smfaz@arapiraca.al.gov.br

Digite *0* para voltar ao menu principal.`,
        };
      }
    }

    return {
      type: "text",
      text: `🆘 *Ajuda - Demonstrativo Financeiro*

📊 *O que é o Demonstrativo Financeiro?*
Documento oficial com informações sobre:
• Débitos pendentes
• Histórico de pagamentos
• Situação fiscal atual
• Valores em aberto

🚀 *Para consultar Demonstrativo Financeiro:*
Digite *7* ou *demonstrativo*

📞 *Outros canais:*
🌐 Portal: https://arapiraca.abaco.com.br/eagata/portal/
📧 Email: smfaz@arapiraca.al.gov.br
📞 Telefone: (82) 3539-6000

⏰ *Horário de atendimento:*
Segunda a Sexta: 7h às 13h

📋 Digite *menu* para ver todas as opções`,
    };
  }

  /**
   * Funções auxiliares para gerenciar sessões
   */
  getSessao(sender) {
    return this.sessoes.get(sender);
  }

  setSessao(sender, dados) {
    dados.timestamp = Date.now(); // Adicionar timestamp para expiração
    console.log("[DemonstrativoFinanceiroService] Definindo sessão:", {
      sender,
      dados,
    });
    this.sessoes.set(sender, dados);
  }

  updateSessao(sender, novosDados) {
    const sessaoAtual = this.getSessao(sender) || {};
    const sessaoAtualizada = {
      ...sessaoAtual,
      ...novosDados,
      timestamp: Date.now(),
    };

    console.log("[DemonstrativoFinanceiroService] Atualizando sessão:", {
      sender,
      sessaoAnterior: sessaoAtual,
      novosDados,
      sessaoAtualizada,
    });

    this.setSessao(sender, sessaoAtualizada);
  }

  limparSessao(sender) {
    console.log("[DemonstrativoFinanceiroService] Limpando sessão:", sender);
    this.sessoes.delete(sender);
  }

  /**
   * Método para debug - listar todas as sessões ativas
   */
  listarSessoes() {
    console.log("[DemonstrativoFinanceiroService] Sessões ativas:", {
      total: this.sessoes.size,
      sessoes: Array.from(this.sessoes.entries()),
    });
  }

  /**
   * Método para obter estatísticas do serviço
   */
  obterEstatisticas() {
    return {
      sessoesAtivas: this.sessoes.size,
      usuarios: Array.from(this.sessoes.keys()),
      metricas: this.obterMetricas(),
    };
  }

  /**
   * Limpa sessões expiradas (executar periodicamente)
   */
  limparSessoesExpiradas() {
    const agora = Date.now();
    const TEMPO_EXPIRACAO = 10 * 60 * 1000; // 10 minutos

    for (const [sender, sessao] of this.sessoes.entries()) {
      if (sessao.timestamp && agora - sessao.timestamp > TEMPO_EXPIRACAO) {
        console.log(
          "[DemonstrativoFinanceiroService] Removendo sessão expirada:",
          sender
        );
        this.sessoes.delete(sender);
        this.metrics.sessoesCanceladas++;
      }
    }
  }
}

// Configurar limpeza automática de sessões expiradas
const demonstrativoFinanceiroServiceInstance =
  new DemonstrativoFinanceiroService();

setInterval(() => {
  demonstrativoFinanceiroServiceInstance.limparSessoesExpiradas();
}, 5 * 60 * 1000); // A cada 5 minutos

// Configurar reset de métricas diário
setInterval(() => {
  demonstrativoFinanceiroServiceInstance.resetarMetricas();
}, 24 * 60 * 60 * 1000); // A cada 24 horas

module.exports = { DemonstrativoFinanceiroService };
