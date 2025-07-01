const axios = require('axios');

/**
 * Integração com API Ábaco para consulta de débitos
 */
class DebitosApi {
  constructor() {
    this.baseUrl = 'https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidebito';
    this.chaveApi = process.env.ABACO_API_KEY || '@C0sS0_@P1'; // Chave deve ser configurada nas variáveis de ambiente
  }

  /**
   * Consulta lista completa de débitos para um contribuinte
   * @param {Object} params - Parâmetros da consulta
   * @param {string} params.tipoContribuinte - Tipo do contribuinte (1-PF/PJ, 2-IMÓVEL, 3-EMPRESA)
   * @param {string} params.inscricao - Inscrição municipal
   * @param {string} params.exercicio - Ano/exercício do débito
   * @returns {Promise<Object>} Resposta da API
   */
  async consultarDebitos({ tipoContribuinte, inscricao, exercicio }) {
    try {
      const payload = {
        SSEChave: this.chaveApi,
        SSETipoContribuinte: tipoContribuinte,
        SSEInscricao: inscricao,
        SSEExercicioDebito: exercicio,
        SSETipoConsumo: "1", // Lista todos os débitos
        SSENossoNumero: "",
        SSECPFCNPJ: "",
        SSEOperacao: "",
        SSEIdentificador: ""
      };

      console.log(`[DebitosApi] Consultando débitos para: Tipo=${tipoContribuinte}, Inscrição=${inscricao}, Exercício=${exercicio}`);

      const response = await axios.get(this.baseUrl, {
        headers: {
          'DadosAPI': JSON.stringify(payload),
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos de timeout
      });

      console.log(`[DebitosApi] Resposta recebida: Código=${response.data.SSACodigo}`);
      return response.data;

    } catch (error) {
      console.error('[DebitosApi] Erro na consulta:', error.message);
      
      if (error.response) {
        console.error('[DebitosApi] Resposta de erro:', error.response.data);
        return {
          SSACodigo: 99,
          SSAMensagem: `Erro no servidor: ${error.response.status}`,
          SDTSaidaAPIDebito: []
        };
      } else if (error.request) {
        return {
          SSACodigo: 98,
          SSAMensagem: 'Erro de comunicação com o servidor da Prefeitura',
          SDTSaidaAPIDebito: []
        };
      } else {
        return {
          SSACodigo: 97,
          SSAMensagem: 'Erro interno na consulta de débitos',
          SDTSaidaAPIDebito: []
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

    // Validar tipo de contribuinte
    if (!tipoContribuinte || !['1', '2', '3'].includes(tipoContribuinte)) {
      erros.push('Tipo de contribuinte deve ser 1 (PF/PJ), 2 (Imóvel) ou 3 (Empresa)');
    }

    // Validar inscrição
    if (!inscricao || inscricao.trim().length === 0) {
      erros.push('Inscrição municipal é obrigatória');
    } else if (inscricao.replace(/[^0-9]/g, '').length < 6) {
      erros.push('Inscrição municipal deve ter pelo menos 6 dígitos');
    }

    // Validar exercício
    const anoAtual = new Date().getFullYear();
    const exercicioNum = parseInt(exercicio);
    if (!exercicio || isNaN(exercicioNum)) {
      erros.push('Exercício deve ser um ano válido');
    } else if (exercicioNum < 2020 || exercicioNum > anoAtual + 1) {
      erros.push(`Exercício deve estar entre 2020 e ${anoAtual + 1}`);
    }

    return {
      valido: erros.length === 0,
      erros
    };
  }

  /**
   * Formata a inscrição removendo caracteres especiais
   * @param {string} inscricao - Inscrição a ser formatada
   * @returns {string} Inscrição formatada
   */
  formatarInscricao(inscricao) {
    return inscricao.replace(/[^0-9]/g, '').padStart(15, '0');
  }

  /**
   * Obtém o texto descritivo do tipo de contribuinte
   * @param {string} tipo - Código do tipo
   * @returns {string} Descrição do tipo
   */
  obterDescricaoTipoContribuinte(tipo) {
    const tipos = {
      '1': 'Pessoa Física/Jurídica',
      '2': 'Imóvel',
      '3': 'Empresa'
    };
    return tipos[tipo] || 'Tipo não identificado';
  }
}

module.exports = { DebitosApi };
