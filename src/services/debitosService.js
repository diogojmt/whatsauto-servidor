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

    switch (sessao.etapa) {
      case "tipo_contribuinte":
        return this.processarTipoContribuinte(sender, msgLimpa);
      case "inscricao":
        return this.processarInscricao(sender, msgLimpa);
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
      etapa: "documento", // Mudança aqui
    });

    let orientacao = "";
    let tipoDocumento = "";

    if (msg === "1") {
      tipoDocumento = "CPF ou CNPJ";
      orientacao =
        "Digite seu CPF (para pessoa física) ou CNPJ (para pessoa jurídica).";
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
   * Processa a inscrição municipal
   */
  processarInscricao(sender, msg) {
    const sessao = this.getSessao(sender);

    // Remove caracteres não numéricos
    const inscricaoLimpa = msg.replace(/[^0-9]/g, "");

    if (inscricaoLimpa.length < 6) {
      return {
        type: "text",
        text: `❌ Inscrição inválida!

A inscrição municipal deve ter pelo menos 6 dígitos.

📝 *Digite apenas os números* (sem pontos, traços ou espaços):

Exemplo: 123456789

Ou *0* para voltar ao menu principal.`,
      };
    }

    this.updateSessao(sender, {
      inscricao: this.debitosApi.formatarInscricao(inscricaoLimpa),
      etapa: "exercicio",
    });

    const anoAtual = new Date().getFullYear();

    return {
      type: "text",
      text: `✅ *Inscrição registrada:* ${inscricaoLimpa}

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

    // Atualiza a sessão com o exercício
    this.updateSessao(sender, { exercicio });

    // Validar parâmetros antes da consulta
    const validacao = this.debitosApi.validarParametros({
      tipoContribuinte: sessao.tipoContribuinte,
      inscricao: sessao.inscricao,
      exercicio: sessao.exercicio,
    });

    if (!validacao.valido) {
      return {
        type: "text",
        text: `❌ Dados inválidos:

${validacao.erros.join("\n")}

Digite *1* para tentar novamente ou *0* para voltar ao menu principal.`,
      };
    }

    // Exibir dados coletados e iniciar consulta
    await this.enviarMensagemConsultando(sender);

    // Realizar a consulta
    return await this.executarConsulta(sender);
  }

  /**
   * Envia mensagem informando que está consultando
   */
  async enviarMensagemConsultando(sender) {
    const sessao = this.getSessao(sender);

    return {
      type: "text",
      text: `🔍 *Consultando débitos...*

📋 *Dados informados:*
• Tipo: ${sessao.tipoDescricao}
• Inscrição: ${sessao.inscricao}
• Exercício: ${sessao.exercicio}

⏳ Aguarde, estou consultando todos os seus débitos disponíveis...`,
    };
  }

  /**
   * Executa a consulta na API e formata a resposta
   */
  async executarConsulta(sender) {
    const sessao = this.getSessao(sender);

    try {
      const resultado = await this.debitosApi.consultarDebitos({
        tipoContribuinte: sessao.tipoContribuinte,
        inscricao: sessao.inscricao,
        exercicio: sessao.exercicio,
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
        return this.formatarNenhumDebito(sessao);
      } else {
        return this.formatarErroConsulta(resultado, sessao);
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
  formatarNenhumDebito(sessao) {
    return {
      type: "text",
      text: `✅ *Nenhum débito encontrado*

${sessao.nome}, não foram localizados débitos em aberto para:

📋 *Dados consultados:*
• Tipo: ${sessao.tipoDescricao}
• Inscrição: ${sessao.inscricao}
• Exercício: ${sessao.exercicio}

💡 *Possíveis motivos:*
• Todos os débitos já foram pagos
• Não há débitos lançados para este exercício
• Dados informados podem estar incorretos

🔄 Deseja consultar outro exercício/inscrição?

Digite *1* para nova consulta ou *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Formata resposta de erro da API
   */
  formatarErroConsulta(resultado, sessao) {
    return {
      type: "text",
      text: `❌ *Erro na consulta*

${sessao.nome}, não foi possível consultar os débitos no momento.

🔍 *Detalhes:* ${resultado.SSAMensagem || "Erro desconhecido"}

📋 *Dados informados:*
• Tipo: ${sessao.tipoDescricao}
• Inscrição: ${sessao.inscricao}
• Exercício: ${sessao.exercicio}

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
    this.sessoes.set(sender, dados);
  }

  updateSessao(sender, novosDados) {
    const sessaoAtual = this.getSessao(sender) || {};
    this.setSessao(sender, { ...sessaoAtual, ...novosDados });
  }

  limparSessao(sender) {
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
}

module.exports = { DebitosService };
