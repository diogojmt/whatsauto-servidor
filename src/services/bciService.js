const axios = require("axios");

/**
 * Serviço para consulta de BCI (Boletim de Cadastro Imobiliário)
 */
class BciService {
  constructor() {
    this.sessoes = new Map(); // Armazena dados das sessões por usuário
    this.apiUrl =
      "https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidocumento";
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

    return {
      type: "text",
      text: `🏠 *Consulta de BCI - Boletim de Cadastro Imobiliário*

${nome}, vou ajudá-lo a consultar e emitir o Boletim de Cadastro Imobiliário (BCI) do seu imóvel.

📋 *O que é o BCI?*
O Boletim de Cadastro Imobiliário é um documento emitido pela prefeitura que contém informações detalhadas sobre um imóvel, como:
• Localização e características físicas
• Área construída e do terreno
• Valor venal
• Identificação do proprietário

💡 *Para continuar, preciso da Inscrição Imobiliária:*

Este número pode ser encontrado:
• No carnê do IPTU
• Em documentos do imóvel
• Na escritura do imóvel

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345

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
    const sessao = this.getSessao(sender);

    // Remove caracteres não numéricos
    const inscricaoLimpa = msg.replace(/[^0-9]/g, "");

    console.log("[BciService] Processando inscrição imobiliária:", {
      inscricaoOriginal: msg,
      inscricaoLimpa: inscricaoLimpa,
    });

    // Validação
    if (inscricaoLimpa.length === 0) {
      return {
        type: "text",
        text: `❌ Inscrição inválida!

Por favor, digite apenas números.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345

Ou *0* para voltar ao menu principal.`,
      };
    }

    if (inscricaoLimpa.length < 2) {
      return {
        type: "text",
        text: `❌ Inscrição muito curta!

A inscrição imobiliária deve ter pelo menos 2 dígitos.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 000000000012345

Ou *0* para voltar ao menu principal.`,
      };
    }

    // Salvar a inscrição na sessão
    this.updateSessao(sender, {
      inscricaoImobiliaria: inscricaoLimpa,
    });

    // Exibir mensagem de consulta
    await this.enviarMensagemConsultando(sender, inscricaoLimpa);

    // Executar a consulta
    return await this.executarConsulta(sender, inscricaoLimpa);
  }

  /**
   * Envia mensagem informando que está consultando
   */
  async enviarMensagemConsultando(sender, inscricao) {
    const sessao = this.getSessao(sender);

    return {
      type: "text",
      text: `🔍 *Consultando BCI...*

📋 *Dados informados:*
• Inscrição Imobiliária: ${inscricao}

⏳ Aguarde, estou consultando o Boletim de Cadastro Imobiliário...`,
    };
  }

  /**
   * Executa a consulta na API e formata a resposta
   */
  async executarConsulta(sender, inscricao) {
    const sessao = this.getSessao(sender);

    console.log(
      "[BciService] Executando consulta BCI com inscrição:",
      inscricao
    );

    try {
      // Montar parâmetros da API
      const parametros = {
        SSEChave: "@C0sS0_@P1",
        SSETipoContribuinte: "2", // 2 = IMOVEL
        SSEInscricao: inscricao,
        SSEExercicioDebito: "",
        SSETipoConsumo: "",
        SSENossoNumero: "",
        SSECPFCNPJ: "",
        SSEOperacao: "3", // 3 = BCI
        SSEIdentificador: "",
      };

      console.log("[BciService] Parâmetros da API:", parametros);

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
      });

      if (resultado.SSACodigo === 0 && resultado.SSALinkDocumento) {
        // Sucesso - BCI encontrado
        this.limparSessao(sender);
        return this.formatarSucesso(resultado, sessao.nome);
      } else if (resultado.SSACodigo === 0) {
        // Sucesso mas sem link do documento
        this.limparSessao(sender);
        return this.formatarSemDocumento(resultado, sessao.nome);
      } else {
        // Erro na consulta
        this.limparSessao(sender);
        return this.formatarErroConsulta(resultado, sessao.nome);
      }
    } catch (error) {
      console.error("[BciService] Erro na execução da consulta:", error);

      this.limparSessao(sender);
      return {
        type: "text",
        text: `❌ *Erro interno*

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

${nome}, o Boletim de Cadastro Imobiliário foi localizado.

📋 *Informações do Imóvel:*
`;

    // Adicionar informações disponíveis
    if (resultado.SSAInscricao) {
      resposta += `• **Inscrição:** ${resultado.SSAInscricao}\n`;
    }
    if (resultado.SSANomeRazao) {
      resposta += `• **Proprietário:** ${resultado.SSANomeRazao}\n`;
    }
    if (resultado.SSACPFCNPJ) {
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

💡 *Importante:*
• O BCI contém todas as informações cadastrais do imóvel
• É utilizado para cálculo do IPTU e outros tributos
• Guarde o documento em local seguro

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

📧 *Contato:* smfaz@arapiraca.al.gov.br
🏛️ *Endereço:* Secretaria da Fazenda Municipal

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

🔄 *Tentar novamente?*
Digite *6* para nova consulta de BCI

📧 *Contato:* smfaz@arapiraca.al.gov.br

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
    ];

    return palavrasChave.some((palavra) => msgLimpa.includes(palavra));
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
    };
  }
}

module.exports = { BciService };
