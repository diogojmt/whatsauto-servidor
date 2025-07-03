const axios = require("axios");

/**
 * Integração com API Ábaco para consulta de débitos
 */
class DebitosApi {
  constructor() {
    this.baseUrl =
      "https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidebito";
    this.chaveApi = process.env.ABACO_API_KEY || "@C0sS0_@P1"; // Chave deve ser configurada nas variáveis de ambiente
  }

  /**
   * Consulta lista completa de débitos para um contribuinte
   * @param {Object} params - Parâmetros da consulta
   * @param {string} params.tipoContribuinte - Tipo do contribuinte (1-PF/PJ, 2-IMÓVEL, 3-EMPRESA)
   * @param {string} params.inscricao - Inscrição municipal ou CPF/CNPJ
   * @param {string} params.exercicio - Ano/exercício do débito
   * @returns {Promise<Object>} Resposta da API
   */
  async consultarDebitos({ tipoContribuinte, inscricao, exercicio }) {
    try {
      // Garantir que os parâmetros estão no formato correto
      const inscricaoFormatada = this.formatarInscricao(String(inscricao));
      const exercicioStr = String(exercicio).trim();

      const payload = {
        SSEChave: this.chaveApi,
        SSETipoContribuinte: String(tipoContribuinte),
        SSEInscricao: inscricaoFormatada,
        SSEExercicioDebito: exercicioStr,
        SSETipoConsumo: "1", // Lista todos os débitos
        SSENossoNumero: "",
        SSECPFCNPJ: "",
        SSEOperacao: "",
        SSEIdentificador: "",
      };

      console.log(
        `[DebitosApi] Consultando débitos para: Tipo=${tipoContribuinte}, Inscrição=${inscricaoFormatada}, Exercício=${exercicioStr}`
      );

      const response = await axios.get(this.baseUrl, {
        headers: {
          DadosAPI: JSON.stringify(payload),
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 segundos de timeout
      });

      console.log(
        `[DebitosApi] Resposta recebida: Código=${response.data.SSACodigo}`
      );
      return response.data;
    } catch (error) {
      console.error("[DebitosApi] Erro na consulta:", error.message);

      if (error.response) {
        console.error("[DebitosApi] Resposta de erro:", error.response.data);
        return {
          SSACodigo: 99,
          SSAMensagem: `Erro no servidor: ${error.response.status}`,
          SDTSaidaAPIDebito: [],
        };
      } else if (error.request) {
        return {
          SSACodigo: 98,
          SSAMensagem: "Erro de comunicação com o servidor da Prefeitura",
          SDTSaidaAPIDebito: [],
        };
      } else {
        return {
          SSACodigo: 97,
          SSAMensagem: "Erro interno na consulta de débitos",
          SDTSaidaAPIDebito: [],
        };
      }
    }
  }

  /**
   * Valida os parâmetros de entrada
   * @param {Object} params - Parâmetros a validar
   * @returns {Object} Resultado da validação
   */
  validarParametros({ tipoContribuinte, inscricao, exercicio }) {
    const erros = [];

    console.log("[DebitosApi] Validando parâmetros:", {
      tipoContribuinte: tipoContribuinte,
      tipoContribuinteType: typeof tipoContribuinte,
      inscricao: inscricao,
      inscricaoType: typeof inscricao,
      exercicio: exercicio,
      exercicioType: typeof exercicio,
    });

    // Validar tipo de contribuinte
    const tipoStr = String(tipoContribuinte || "").trim();
    if (!tipoStr || !["1", "2", "3"].includes(tipoStr)) {
      erros.push(
        "Tipo de contribuinte deve ser 1 (PF/PJ), 2 (Imóvel) ou 3 (Empresa)"
      );
    }

    // Validar inscrição/documento
    const inscricaoStr = String(inscricao || "").trim();
    if (!inscricaoStr || inscricaoStr.length === 0) {
      erros.push("Documento (CPF/CNPJ ou Inscrição Municipal) é obrigatório");
    } else {
      const apenasNumeros = inscricaoStr.replace(/[^0-9]/g, "");

      if (tipoStr === "1") {
        // Contribuinte geral - aceitar qualquer código numérico válido
        if (apenasNumeros.length < 1) {
          erros.push("Informe o código do Contribuinte geral");
        }
        // Remover validação restritiva de CPF/CNPJ para permitir códigos de contribuinte
      } else if (tipoStr === "2" || tipoStr === "3") {
        // Imóvel ou Empresa - validar inscrição municipal
        if (apenasNumeros.length < 2) {
          erros.push("Inscrição municipal deve ter pelo menos 2 dígitos");
        }
      }
    }

    // Validar exercício
    const exercicioStr = String(exercicio || "").trim();
    const anoAtual = new Date().getFullYear();

    console.log("[DebitosApi] Validando exercício:", {
      exercicioOriginal: exercicio,
      exercicioStr: exercicioStr,
      anoAtual: anoAtual,
    });

    if (!exercicioStr || exercicioStr === "") {
      erros.push("Exercício é obrigatório");
    } else {
      const exercicioNum = parseInt(exercicioStr);

      if (isNaN(exercicioNum)) {
        erros.push("Exercício deve ser um ano válido (apenas números)");
      } else if (exercicioNum < 2020 || exercicioNum > anoAtual + 1) {
        erros.push(`Exercício deve estar entre 2020 e ${anoAtual + 1}`);
      }
    }

    const resultado = {
      valido: erros.length === 0,
      erros,
    };

    console.log("[DebitosApi] Resultado da validação:", resultado);
    return resultado;
  }

  /**
   * Formata a inscrição/documento removendo caracteres especiais
   * @param {string} inscricao - Inscrição a ser formatada
   * @returns {string} Inscrição formatada
   */
  formatarInscricao(inscricao) {
    if (!inscricao) return "";

    const apenasNumeros = String(inscricao).replace(/[^0-9]/g, "");

    // Para tipo 1 (Contribuinte geral), não fazer padding - enviar como está
    // Para CPF/CNPJ, não fazer padding
    if (apenasNumeros.length === 11 || apenasNumeros.length === 14) {
      return apenasNumeros;
    }

    // Para códigos de contribuinte geral menores, não fazer padding
    // A API deve aceitar o código como fornecido
    if (apenasNumeros.length < 11) {
      return apenasNumeros;
    }

    // Para inscrição municipal, fazer padding até 15 dígitos
    return apenasNumeros.padStart(15, "0");
  }

  /**
   * Obtém o texto descritivo do tipo de contribuinte
   * @param {string} tipo - Código do tipo
   * @returns {string} Descrição do tipo
   */
  obterDescricaoTipoContribuinte(tipo) {
    const tipos = {
      1: "Contribuinte geral",
      2: "Imóvel",
      3: "Empresa",
    };
    return tipos[String(tipo)] || "Tipo não identificado";
  }

  /**
   * Valida CPF (algoritmo básico)
   * @param {string} cpf - CPF a ser validado
   * @returns {boolean} True se válido
   */
  validarCPF(cpf) {
    const apenasNumeros = String(cpf).replace(/[^0-9]/g, "");

    if (apenasNumeros.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(apenasNumeros)) return false; // Todos os dígitos iguais

    // Validação básica dos dígitos verificadores
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(apenasNumeros.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(apenasNumeros.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(apenasNumeros.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(apenasNumeros.charAt(10))) return false;

    return true;
  }

  /**
   * Valida CNPJ (algoritmo básico)
   * @param {string} cnpj - CNPJ a ser validado
   * @returns {boolean} True se válido
   */
  validarCNPJ(cnpj) {
    const apenasNumeros = String(cnpj).replace(/[^0-9]/g, "");

    if (apenasNumeros.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(apenasNumeros)) return false; // Todos os dígitos iguais

    // Validação básica dos dígitos verificadores
    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let soma = 0;
    for (let i = 0; i < 12; i++) {
      soma += parseInt(apenasNumeros.charAt(i)) * pesos1[i];
    }
    let resto = soma % 11;
    const digito1 = resto < 2 ? 0 : 11 - resto;
    if (digito1 !== parseInt(apenasNumeros.charAt(12))) return false;

    soma = 0;
    for (let i = 0; i < 13; i++) {
      soma += parseInt(apenasNumeros.charAt(i)) * pesos2[i];
    }
    resto = soma % 11;
    const digito2 = resto < 2 ? 0 : 11 - resto;
    if (digito2 !== parseInt(apenasNumeros.charAt(13))) return false;

    return true;
  }

  /**
   * Valida documento baseado no tipo de contribuinte
   * @param {string} documento - Documento a ser validado
   * @param {string} tipoContribuinte - Tipo do contribuinte
   * @returns {Object} Resultado da validação
   */
  validarDocumento(documento, tipoContribuinte) {
    const apenasNumeros = String(documento).replace(/[^0-9]/g, "");
    const tipo = String(tipoContribuinte);

    if (tipo === "1") {
      // Contribuinte geral - pode ser CPF, CNPJ ou código de contribuinte
      if (apenasNumeros.length === 11) {
        return {
          valido: this.validarCPF(apenasNumeros),
          tipo: "CPF",
          documento: apenasNumeros,
        };
      } else if (apenasNumeros.length === 14) {
        return {
          valido: this.validarCNPJ(apenasNumeros),
          tipo: "CNPJ",
          documento: apenasNumeros,
        };
      } else {
        // Código de contribuinte geral - aceitar qualquer código numérico
        return {
          valido: apenasNumeros.length >= 1,
          tipo: "Código de Contribuinte",
          documento: apenasNumeros,
          erro:
            apenasNumeros.length < 1
              ? "Código deve ter pelo menos 1 dígito"
              : null,
        };
      }
    } else {
      // Imóvel ou Empresa - inscrição municipal
      return {
        valido: apenasNumeros.length >= 2,
        tipo: "Inscrição Municipal",
        documento: apenasNumeros,
        erro:
          apenasNumeros.length < 2
            ? "Inscrição municipal deve ter pelo menos 2 dígitos"
            : null,
      };
    }
  }
}

module.exports = { DebitosApi };
