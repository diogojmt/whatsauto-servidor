const { DebitosApi } = require("../utils/debitosApi");

/**
 * Serviço para gerenciar consultas de débitos e fluxo de coleta de dados
 */
class DebitosService {
  constructor() {
    this.debitosApi = new DebitosApi();
    this.sessoes = new Map(); // Armazena dados das sessões por usuário
  }

  /**
   * Inicia o fluxo de consulta de débitos
   * @param {string} sender - ID do usuário
   * @param {string} nome - Nome do usuário
   * @returns {Object} Resposta para o usuário
   */
  iniciarConsultaDebitos(sender, nome) {
    this.limparSessao(sender);
    this.setSessao(sender, { etapa: "tipo_contribuinte", nome });

    return {
      type: "text",
      text: `📄 *Segunda via de DAM's*

${nome}, vou ajudá-lo a consultar e emitir a segunda via de todos os seus débitos disponíveis para pagamento.

Para começar, preciso de algumas informações:

*1️⃣ Tipo de Contribuinte:*

Digite o número correspondente:

*1* - 👤 Pessoa Física/Jurídica
*2* - 🏠 Imóvel (IPTU, COSIP)
*3* - 🏢 Empresa (taxas empresariais)

Digite o número da opção ou *0* para voltar ao menu principal.`,
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
      return this.iniciarConsultaDebitos(sender, "usuário");
    }

    console.log("[DebitosService] Processando etapa:", {
      etapa: sessao.etapa,
      mensagem: msgLimpa,
      sessao: sessao,
    });

    switch (sessao.etapa) {
      case "tipo_contribuinte":
        return this.processarTipoContribuinte(sender, msgLimpa);
      case "documento":
        return this.processarDocumento(sender, msgLimpa);
      case "exercicio":
        return await this.processarExercicio(sender, msgLimpa);
      default:
        return this.iniciarConsultaDebitos(sender, sessao.nome || "usuário");
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
        text: `❌ Opção inválida!

Por favor, digite apenas o número correspondente ao tipo:

*1* - 👤 Pessoa Física/Jurídica
*2* - 🏠 Imóvel (IPTU, COSIP)
*3* - 🏢 Empresa (taxas empresariais)

Ou *0* para voltar ao menu principal.`,
      };
    }

    const tipos = {
      1: "Pessoa Física/Jurídica",
      2: "Imóvel",
      3: "Empresa",
    };

    this.updateSessao(sender, {
      tipoContribuinte: msg,
      tipoDescricao: tipos[msg],
      etapa: "documento",
    });

    let orientacao = "";
    let tipoDocumento = "";

    if (msg === "1") {
      tipoDocumento = "Código de Constribuinte Geral";
      orientacao =
        "Este número pode ser encontrado na Certidão de Regularidade Fiscal.";
    } else if (msg === "2") {
      tipoDocumento = "Inscrição Municipal do Imóvel";
      orientacao =
        "Este número pode ser encontrado no carnê do IPTU ou documentos do imóvel.";
    } else if (msg === "3") {
      tipoDocumento = "Inscrição Municipal da Empresa";
      orientacao =
        "Este número pode ser encontrado no alvará de funcionamento ou documentos da empresa.";
    }

    return {
      type: "text",
      text: `✅ *Tipo selecionado:* ${tipos[msg]}

*2️⃣ ${tipoDocumento}:*

${sessao.nome}, agora preciso do seu ${tipoDocumento.toLowerCase()}.

${orientacao}

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

${
  msg === "1"
    ? "Exemplo: 12345678901 (CPF) ou 12345678000195 (CNPJ)"
    : "Exemplo: 123456789"
}

Ou *0* para voltar ao menu principal.`,
    };
  }

  /**
   * Processa o documento (Contribuinte geral)
   */
  processarDocumento(sender, msg) {
    const sessao = this.getSessao(sender);

    // Remove caracteres não numéricos
    const documentoLimpo = msg.replace(/[^0-9]/g, "");

    console.log("[DebitosService] Processando documento:", {
      documentoOriginal: msg,
      documentoLimpo: documentoLimpo,
      tipoContribuinte: sessao.tipoContribuinte,
    });

    // Validação geral - apenas verifica se contém números
    if (documentoLimpo.length === 0) {
      return {
        type: "text",
        text: `❌ Documento inválido!

Por favor, digite apenas números.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 12345678901

Ou *0* para voltar ao menu principal.`,
      };
    }

    if (documentoLimpo.length < 1) {
      return {
        type: "text",
        text: `❌ Documento muito curto!

O documento deve ter pelo menos 1 dígitos.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 1234

Ou *0* para voltar ao menu principal.`,
      };
    }

    // Salvar o documento na sessão
    this.updateSessao(sender, {
      inscricao: documentoLimpo,
      etapa: "exercicio",
    });

    const anoAtual = new Date().getFullYear();

    return {
      type: "text",
      text: `✅ *Documento registrado:* ${documentoLimpo}

*3️⃣ Ano/Exercício:*

${sessao.nome}, para qual ano deseja consultar os débitos?

💡 O "exercício" é o ano de referência do débito.

📅 *Anos disponíveis:* 2020 a ${anoAtual + 1}

Digite o ano desejado:

Exemplo: *${anoAtual}* (para débitos de ${anoAtual})

Ou *0* para voltar ao menu principal.`,
    };
  }

  /**
   * Processa o exercício e executa a consulta
   */
  async processarExercicio(sender, msg) {
    const sessao = this.getSessao(sender);

    const exercicio = msg.trim();
    const anoAtual = new Date().getFullYear();
    const exercicioNum = parseInt(exercicio);

    console.log("[DebitosService] Processando exercício:", {
      exercicioOriginal: msg,
      exercicioTrimmed: exercicio,
      exercicioNum: exercicioNum,
      anoAtual: anoAtual,
      sessaoAtual: sessao,
    });

    // Validação inicial do exercício
    if (
      isNaN(exercicioNum) ||
      exercicioNum < 2020 ||
      exercicioNum > anoAtual + 1
    ) {
      return {
        type: "text",
        text: `❌ Ano inválido!

Digite um ano entre 2020 e ${anoAtual + 1}.

Exemplo: *${anoAtual}*

Ou *0* para voltar ao menu principal.`,
      };
    }

    // Atualizar a sessão com o exercício
    this.updateSessao(sender, { exercicio: exercicio });

    // Verificar se a sessão foi atualizada corretamente
    const sessaoAtualizada = this.getSessao(sender);
    console.log("[DebitosService] Sessão após update:", sessaoAtualizada);

    // Preparar parâmetros para validação
    const parametros = {
      tipoContribuinte: sessaoAtualizada.tipoContribuinte,
      inscricao: sessaoAtualizada.inscricao,
      exercicio: exercicio, // Usar a variável local
    };

    console.log("[DebitosService] Parâmetros para validação:", parametros);

    // Validar parâmetros antes da consulta
    const validacao = this.debitosApi.validarParametros(parametros);

    if (!validacao.valido) {
      return {
        type: "text",
        text: `❌ Dados inválidos:

${validacao.erros.join("\n")}

Digite *1* para tentar novamente ou *0* para voltar ao menu principal.`,
      };
    }

    // Exibir dados coletados e iniciar consulta
    await this.enviarMensagemConsultando(sender, parametros);

    // Realizar a consulta
    return await this.executarConsulta(sender, parametros);
  }

  /**
   * Envia mensagem informando que está consultando
   */
  async enviarMensagemConsultando(sender, parametros = null) {
    const sessao = this.getSessao(sender);
    const params = parametros || {
      tipoContribuinte: sessao.tipoContribuinte,
      inscricao: sessao.inscricao,
      exercicio: sessao.exercicio,
    };

    return {
      type: "text",
      text: `🔍 *Consultando débitos...*

📋 *Dados informados:*
• Tipo: ${sessao.tipoDescricao}
• Documento: ${params.inscricao}
• Exercício: ${params.exercicio}

⏳ Aguarde, estou consultando todos os seus débitos disponíveis...`,
    };
  }

  /**
   * Executa a consulta na API e formata a resposta
   */
  async executarConsulta(sender, parametros = null) {
    const sessao = this.getSessao(sender);

    // Usar parâmetros passados ou da sessão
    const params = parametros || {
      tipoContribuinte: sessao.tipoContribuinte,
      inscricao: sessao.inscricao,
      exercicio: sessao.exercicio,
    };

    console.log("[DebitosService] Executando consulta com parâmetros:", params);

    try {
      const resultado = await this.debitosApi.consultarDebitos(params);

      console.log("[DebitosService] Resultado da consulta:", {
        codigo: resultado.SSACodigo,
        temDebitos: resultado.SDTSaidaAPIDebito?.length > 0,
      });

      // Limpar sessão após consulta
      this.limparSessao(sender);

      if (
        resultado.SSACodigo === 0 &&
        resultado.SDTSaidaAPIDebito &&
        resultado.SDTSaidaAPIDebito.length > 0
      ) {
        return this.formatarListaDebitos(resultado, sessao.nome);
      } else if (resultado.SSACodigo === 0) {
        return this.formatarNenhumDebito({ ...sessao, ...params });
      } else {
        return this.formatarErroConsulta(resultado, { ...sessao, ...params });
      }
    } catch (error) {
      console.error("[DebitosService] Erro na execução da consulta:", error);
      this.limparSessao(sender);

      return {
        type: "text",
        text: `❌ *Erro interno*

${sessao.nome}, ocorreu um erro inesperado durante a consulta.

🔄 Tente novamente em alguns minutos ou entre em contato conosco:

📧 smfaz@arapiraca.al.gov.br

Digite *1* para tentar novamente ou *menu* para voltar ao menu principal.`,
      };
    }
  }

  /**
   * Formata a lista de débitos encontrados
   */
  formatarListaDebitos(resultado, nome) {
    const debitos = resultado.SDTSaidaAPIDebito;
    let resposta = `✅ *Débitos encontrados*

${nome}, foram encontrados *${debitos.length}* débito(s) em aberto para sua inscrição:

`;

    // Formatar cada débito
    debitos.forEach((debito, index) => {
      const numero = index + 1;
      const valorFormatado = this.formatarMoeda(debito.SSAValorTotal);
      const vencimento = this.formatarData(debito.SSAVencimento);

      resposta += `*${numero}️⃣ ${debito.SSATributo}*
💰 Valor: ${valorFormatado}
📅 Vencimento: ${vencimento}
🔗 [Segunda via (DAM)](${debito.SSALinkkDAM || debito.SSALinkDAM})
📋 Linha digitável:
\`${debito.SSALinhaDigitavel}\`

`;

      // Informações adicionais se disponíveis
      if (debito.SSAReferencia) {
        resposta += `📌 Referência: ${debito.SSAReferencia}\n`;
      }

      if (
        debito.SSAValorOriginal &&
        debito.SSAValorOriginal !== debito.SSAValorTotal
      ) {
        resposta += `💵 Valor original: ${this.formatarMoeda(
          debito.SSAValorOriginal
        )}\n`;
      }

      resposta += "\n";
    });

    resposta += `💡 *Para pagamento:*
• Clique no link "Segunda via (DAM)" para baixar o boleto
• Use a linha digitável para pagamento via app bancário
• Guarde o comprovante de pagamento

📞 *Dúvidas:* smfaz@arapiraca.al.gov.br

Digite *1* para nova consulta ou *menu* para voltar ao menu principal.`;

    return { type: "text", text: resposta };
  }

  /**
   * Formata resposta quando não há débitos
   */
  formatarNenhumDebito(sessaoComParams) {
    return {
      type: "text",
      text: `✅ *Nenhum débito encontrado*

${sessaoComParams.nome}, não foram localizados débitos em aberto para:

📋 *Dados consultados:*
• Tipo: ${sessaoComParams.tipoDescricao}
• Documento: ${sessaoComParams.inscricao}
• Exercício: ${sessaoComParams.exercicio}

💡 *Possíveis motivos:*
• Todos os débitos já foram pagos
• Não há débitos lançados para este exercício
• Dados informados podem estar incorretos

🔄 Deseja consultar outro exercício/documento?

Digite *1* para nova consulta ou *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Formata resposta de erro da API
   */
  formatarErroConsulta(resultado, sessaoComParams) {
    return {
      type: "text",
      text: `❌ *Erro na consulta*

${sessaoComParams.nome}, não foi possível consultar os débitos no momento.

🔍 *Detalhes:* ${resultado.SSAMensagem || "Erro desconhecido"}

📋 *Dados informados:*
• Tipo: ${sessaoComParams.tipoDescricao}
• Documento: ${sessaoComParams.inscricao}
• Exercício: ${sessaoComParams.exercicio}

💡 *Sugestões:*
• Verifique se os dados estão corretos
• Tente novamente em alguns minutos
• Entre em contato para suporte

📧 *Contato:* smfaz@arapiraca.al.gov.br

Digite *1* para tentar novamente ou *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Verifica se uma mensagem indica intenção de consultar débitos
   */
  detectarIntencaoConsultaDebitos(message) {
    const msgLimpa = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const palavrasChave = [
      "segunda via",
      "boleto",
      "dam",
      "debito",
      "debitos",
      "imposto",
      "iptu",
      "cosip",
      "tributo",
      "carne",
      "guia",
      "pagamento",
      "pagar",
      "vencimento",
      "atraso",
      "multa",
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
    console.log("[DebitosService] Definindo sessão:", { sender, dados });
    this.sessoes.set(sender, dados);
  }

  updateSessao(sender, novosDados) {
    const sessaoAtual = this.getSessao(sender) || {};
    const sessaoAtualizada = { ...sessaoAtual, ...novosDados };

    console.log("[DebitosService] Atualizando sessão:", {
      sender,
      sessaoAnterior: sessaoAtual,
      novosDados,
      sessaoAtualizada,
    });

    this.setSessao(sender, sessaoAtualizada);
  }

  limparSessao(sender) {
    console.log("[DebitosService] Limpando sessão:", sender);
    this.sessoes.delete(sender);
  }

  /**
   * Funções auxiliares de formatação
   */
  formatarMoeda(valor) {
    if (!valor) return "R$ 0,00";

    const num =
      typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : valor;
    return `R$ ${num.toFixed(2).replace(".", ",")}`;
  }

  formatarData(data) {
    if (!data) return "Não informado";

    // Se a data está no formato YYYY-MM-DD, converter para DD/MM/YYYY
    if (data.includes("-")) {
      const [ano, mes, dia] = data.split("-");
      return `${dia}/${mes}/${ano}`;
    }

    return data;
  }

  /**
   * Método para debug - listar todas as sessões ativas
   */
  listarSessoes() {
    console.log("[DebitosService] Sessões ativas:", {
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

module.exports = { DebitosService };
