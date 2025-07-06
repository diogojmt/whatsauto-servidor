const axios = require("axios");

/**
 * Serviço para consulta de BCI (Boletim de Cadastro Imobiliário)
 */
class BciService {
  constructor() {
    this.sessoes = new Map(); // Armazena dados das sessões por usuário
    this.apiUrl =
      "https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidocumento";

    // CPF fake para contornar validação da API (a API não utiliza na prática)
    this.cpfFakeBci = "11111111111";

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
   * Inicia o fluxo de consulta de BCI
   * @param {string} sender - ID do usuário
   * @param {string} nome - Nome do usuário
   * @returns {Object} Resposta para o usuário
   */
  iniciarConsultaBCI(sender, nome) {
    this.limparSessao(sender);
    this.setSessao(sender, { etapa: "inscricao_imobiliaria", nome });
    this.metrics.sessoesCriadas++;

    return {
      type: "text",
      text: `🏠 *Consulta de BCI - Boletim de Cadastro Imobiliário*

${nome}, vou ajudá-lo a consultar e emitir o Boletim de Cadastro Imobiliário (BCI) do seu imóvel de forma *rápida e automática*!

📋 *O que é o BCI?*
O Boletim de Cadastro Imobiliário é um documento emitido pela prefeitura que contém informações detalhadas sobre um imóvel, como:
• Localização e características físicas
• Área construída e do terreno
• Valor venal
• Identificação do proprietário

💡 *Para continuar, preciso apenas da Inscrição Imobiliária:*

📍 *Este número pode ser encontrado:*
• No carnê do IPTU
• Em documentos do imóvel
• Na escritura do imóvel
• Portal do Contribuinte

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345 ou 12345

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
      return this.iniciarConsultaBCI(sender, "usuário");
    }

    console.log("[BciService] Processando etapa:", {
      etapa: sessao.etapa,
      mensagem: msgLimpa,
      sessao: sessao,
    });

    switch (sessao.etapa) {
      case "inscricao_imobiliaria":
        return await this.processarInscricaoImobiliaria(sender, msgLimpa);
      default:
        return this.iniciarConsultaBCI(sender, sessao.nome || "usuário");
    }
  }

  /**
   * Processa a inscrição imobiliária e executa a consulta
   */
  async processarInscricaoImobiliaria(sender, msg) {
    const inicioProcessamento = Date.now();
    const sessao = this.getSessao(sender);

    // Remove caracteres não numéricos
    const inscricaoLimpa = msg.replace(/[^0-9]/g, "");

    console.log("[BciService] Processando inscrição imobiliária:", {
      inscricaoOriginal: msg,
      inscricaoLimpa: inscricaoLimpa,
      usandoCpfFake: true,
    });

    // Validação
    if (inscricaoLimpa.length === 0) {
      return {
        type: "text",
        text: `❌ *Inscrição inválida!*

Por favor, digite apenas números.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345 ou 12345

Ou *0* para voltar ao menu principal.`,
      };
    }

    if (inscricaoLimpa.length < 2) {
      return {
        type: "text",
        text: `❌ *Inscrição muito curta!*

A inscrição imobiliária deve ter pelo menos 2 dígitos.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345 ou 12345

Ou *0* para voltar ao menu principal.`,
      };
    }

    // Salvar a inscrição na sessão
    this.updateSessao(sender, {
      inscricaoImobiliaria: inscricaoLimpa,
    });

    // Executar a consulta diretamente
    this.metrics.tentativasConsulta++;

    const resultado = await this.executarConsulta(sender, inscricaoLimpa);

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
  async executarConsulta(sender, inscricao) {
    const sessao = this.getSessao(sender);

    console.log(
      "[BciService] Executando consulta BCI com inscrição:",
      inscricao,
      "usando CPF fake:",
      this.cpfFakeBci
    );

    // Preparar mensagem de aguardo
    const WaitingMessage = require("../utils/waitingMessage");
    const waitingMsg = WaitingMessage.getMessageForType("bci");

    try {
      // Mostrar mensagem de aguardo
      console.log(`[BciService] 📋 ${waitingMsg}`);
      // Montar parâmetros da API
      const parametros = {
        SSEChave: "@C0sS0_@P1",
        SSETipoContribuinte: "2", // 2 = IMOVEL
        SSEInscricao: inscricao,
        SSEExercicioDebito: "",
        SSETipoConsumo: "",
        SSENossoNumero: "",
        SSECPFCNPJ: this.cpfFakeBci, // Usar CPF fake
        SSEOperacao: "3", // 3 = BCI
        SSEIdentificador: "",
      };

      console.log("[BciService] Parâmetros da API:", {
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

      console.log("[BciService] Resultado da consulta:", {
        codigo: resultado.SSACodigo,
        mensagem: resultado.SSAMensagem,
        temLink: !!resultado.SSALinkDocumento,
        usouCpfFake: true,
      });

      if (resultado.SSACodigo === 0 && resultado.SSALinkDocumento) {
        // Sucesso - BCI encontrado
        this.metrics.sucessos++;
        this.limparSessao(sender);
        const resultadoFormatado = this.formatarSucesso(resultado, sessao.nome);
        return `${waitingMsg}\n\n${resultadoFormatado}`;
      } else if (resultado.SSACodigo === 0) {
        // Sucesso mas sem link do documento
        this.metrics.erros++;
        this.limparSessao(sender);
        const resultadoFormatado = this.formatarSemDocumento(resultado, sessao.nome);
        return `${waitingMsg}\n\n${resultadoFormatado}`;
      } else {
        // Erro na consulta
        this.metrics.erros++;
        this.limparSessao(sender);
        const resultadoFormatado = this.formatarErroConsulta(resultado, sessao.nome);
        return `${waitingMsg}\n\n${resultadoFormatado}`;
      }
    } catch (error) {
      console.error("[BciService] Erro na execução da consulta:", error);

      this.metrics.erros++;
      this.limparSessao(sender);
      return {
        type: "text",
        text: `${waitingMsg}

❌ *Erro interno*

${sessao.nome}, ocorreu um erro inesperado durante a consulta.

🔄 *Tentar novamente?*
Digite *6* para nova consulta de BCI

📧 smfaz@arapiraca.al.gov.br

Ou digite *menu* para voltar ao menu principal.`,
      };
    }
  }

  /**
   * Formata resposta de sucesso
   */
  formatarSucesso(resultado, nome) {
    let resposta = `✅ *BCI encontrado com sucesso!*

${nome}, o Boletim de Cadastro Imobiliário foi localizado e está pronto para download!

📋 *Informações do Imóvel:*
`;

    // Adicionar informações disponíveis
    if (resultado.SSAInscricao) {
      resposta += `• **Inscrição:** ${resultado.SSAInscricao}\n`;
    }
    if (resultado.SSANomeRazao) {
      resposta += `• **Proprietário:** ${resultado.SSANomeRazao}\n`;
    }
    if (resultado.SSACPFCNPJ && resultado.SSACPFCNPJ !== this.cpfFakeBci) {
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
    if (resultado.SSACEP) {
      resposta += `• **CEP:** ${resultado.SSACEP}\n`;
    }
    if (resultado.SSAQuadra) {
      resposta += `• **Quadra:** ${resultado.SSAQuadra}\n`;
    }
    if (resultado.SSALote) {
      resposta += `• **Lote:** ${resultado.SSALote}\n`;
    }
    if (resultado.SSALoteamento) {
      resposta += `• **Loteamento:** ${resultado.SSALoteamento}\n`;
    }

    resposta += `\n📄 *Documento BCI:*
🔗 [Clique aqui para baixar o BCI](${resultado.SSALinkDocumento})

⚠️ *IMPORTANTE:*
• Link temporário - baixe/imprima *AGORA*!
• Válido por tempo limitado
• Salve o arquivo no seu celular

💡 *Sobre o BCI:*
• Contém todas as informações cadastrais do imóvel
• É utilizado para cálculo do IPTU e outros tributos
• Documento oficial da Prefeitura

🔄 *Precisa de outro BCI?*
Digite *6* para nova consulta

📞 *Dúvidas:* smfaz@arapiraca.al.gov.br

Digite *menu* para voltar ao menu principal.`;

    return { type: "text", text: resposta };
  }

  /**
   * Formata resposta quando não há documento disponível
   */
  formatarSemDocumento(resultado, nome) {
    return {
      type: "text",
      text: `⚠️ *Imóvel encontrado, mas documento indisponível*

${nome}, o imóvel foi localizado no sistema, mas o documento BCI não está disponível para download no momento.

📋 *Dados encontrados:*
• Inscrição: ${resultado.SSAInscricao || "Não informado"}
• Proprietário: ${resultado.SSANomeRazao || "Não informado"}

💡 *O que fazer:*
• Entre em contato conosco para obter o BCI
• Compareça pessoalmente à Secretaria da Fazenda
• Tente novamente mais tarde

🔄 *Tentar novamente?*
Digite *6* para nova consulta de BCI

📧 *Contato:* smfaz@arapiraca.al.gov.br
🏛️ *Endereço:* Secretaria da Fazenda Municipal
📞 *Telefone:* (82) 3539-6000

Digite *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Formata resposta de erro da API
   */
  formatarErroConsulta(resultado, nome) {
    return {
      type: "text",
      text: `❌ *Erro na consulta*

${nome}, não foi possível consultar o BCI no momento.

🔍 *Detalhes:* ${resultado.SSAMensagem || "Erro desconhecido"}

💡 *Possíveis motivos:*
• Inscrição imobiliária não encontrada
• Imóvel não cadastrado no sistema
• Sistema temporariamente indisponível
• Dados incorretos

✅ *Dicas para resolver:*
• Verifique a inscrição no carnê do IPTU
• Confirme se digitou apenas números
• Tente sem zeros à esquerda

🔄 *Tentar novamente?*
Digite *6* para nova consulta de BCI

📧 *Contato:* smfaz@arapiraca.al.gov.br
📞 *Telefone:* (82) 3539-6000

Ou digite *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Verifica se uma mensagem indica intenção de consultar BCI
   */
  detectarIntencaoBCI(message) {
    if (!message || typeof message !== "string") {
      return false;
    }

    const msgLimpa = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const palavrasChave = [
      "bci",
      "boletim cadastro",
      "cadastro imobiliario",
      "cadastro do imovel",
      "informacoes do imovel",
      "dados do imovel",
      "cadastro predial",
      "ficha do imovel",
      "boletim cadastral",
      "consulta imovel",
      "documento imovel",
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

    console.log("[BciService] Métricas resetadas", {
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

      console.log("[BciService] Sessão cancelada pelo usuário", {
        sender,
        sessaoAnterior: sessao,
        timestamp: new Date().toISOString(),
      });

      return {
        type: "text",
        text: `✅ *Sessão de BCI cancelada!*

Você voltou ao menu principal.

🏠 *Para consultar BCI novamente:*
Digite *6* ou *bci*

📋 *Outras opções:*
• Digite *menu* para ver todas as opções
• Digite *ajuda* para obter suporte`,
      };
    }

    return {
      type: "text",
      text: `ℹ️ Você não tem nenhuma sessão de BCI ativa no momento.

Digite *menu* para ver as opções disponíveis.`,
    };
  }

  /**
   * Obtém ajuda contextual para BCI
   * @param {string} sender - ID do usuário
   * @returns {Object} Mensagem de ajuda
   */
  obterAjudaContextual(sender) {
    const sessao = this.getSessao(sender);

    if (sessao && sessao.etapa === "inscricao_imobiliaria") {
      return {
        type: "text",
        text: `🆘 *Ajuda - Consulta de BCI*

🏠 *Boletim de Cadastro Imobiliário (BCI)*

📍 *Onde encontrar a Inscrição Imobiliária:*
• Carnê do IPTU
• Escritura do imóvel
• Certidões anteriores do imóvel
• Portal do Contribuinte
• Documentos da Prefeitura

📝 *Formato correto:*
• Digite *apenas números*
• Sem pontos, traços ou espaços
• Exemplo: 000000000012345 ou 12345
• Pode ter zeros à esquerda ou não

❌ *Problemas comuns:*
• Não digite letras ou símbolos
• Verifique se a inscrição está correta
• Confirme no carnê do IPTU

🔄 *Para recomeçar:*
Digite *6* para nova consulta

📞 *Contato:* smfaz@arapiraca.al.gov.br

Digite *0* para voltar ao menu principal.`,
      };
    }

    return {
      type: "text",
      text: `🆘 *Ajuda - BCI (Boletim de Cadastro Imobiliário)*

🏠 *O que é o BCI?*
Documento oficial com informações detalhadas do imóvel:
• Localização e características
• Área construída e do terreno
• Valor venal para IPTU
• Dados do proprietário

🚀 *Para consultar BCI:*
Digite *6* ou *bci*

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
    console.log("[BciService] Definindo sessão:", { sender, dados });
    this.sessoes.set(sender, dados);
  }

  updateSessao(sender, novosDados) {
    const sessaoAtual = this.getSessao(sender) || {};
    const sessaoAtualizada = { ...sessaoAtual, ...novosDados };

    console.log("[BciService] Atualizando sessão:", {
      sender,
      sessaoAnterior: sessaoAtual,
      novosDados,
      sessaoAtualizada,
    });

    this.setSessao(sender, sessaoAtualizada);
  }

  limparSessao(sender) {
    console.log("[BciService] Limpando sessão:", sender);
    this.sessoes.delete(sender);
  }

  /**
   * Método para debug - listar todas as sessões ativas
   */
  listarSessoes() {
    console.log("[BciService] Sessões ativas:", {
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
        console.log("[BciService] Removendo sessão expirada:", sender);
        this.sessoes.delete(sender);
        this.metrics.sessoesCanceladas++;
      }
    }
  }
}

// Configurar limpeza automática de sessões expiradas
const bciServiceInstance = new BciService();

setInterval(() => {
  bciServiceInstance.limparSessoesExpiradas();
}, 5 * 60 * 1000); // A cada 5 minutos

// Configurar reset de métricas diário
setInterval(() => {
  bciServiceInstance.resetarMetricas();
}, 24 * 60 * 60 * 1000); // A cada 24 horas

module.exports = { BciService };
