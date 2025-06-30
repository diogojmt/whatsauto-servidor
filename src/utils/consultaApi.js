const axios = require('axios');

// Chave de acesso fornecida pela TI
const API_CHAVE = "@C0sS0_@P1";

/**
 * Consulta inscrições por CPF/CNPJ na API da Ábaco
 * @param {string} cpfCnpj - CPF ou CNPJ para consulta
 * @returns {Promise<Object>} Lista de inscrições ou erro
 */
async function consultarInscricoesPorCpf(cpfCnpj) {
  const url = 'https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidocumento';

  // Tentativa 1: Usar operação de consulta (se existir)
  const payloadConsulta = {
    SSEChave: API_CHAVE,
    SSETipoContribuinte: "1", // Começar com PF/PJ
    SSEInscricao: "", // Vazio para buscar por CPF
    SSEExercicioDebito: "",
    SSETipoConsumo: "",
    SSENossoNumero: "",
    SSECPFCNPJ: cpfCnpj,
    SSEOperacao: "0", // Operação de consulta (tentativa)
    SSEIdentificador: ""
  };

  console.log('🔍 Tentando consultar inscrições por CPF/CNPJ:', cpfCnpj);

  try {
    const response = await axios.get(url, {
      headers: {
        DadosAPIDocumento: JSON.stringify(payloadConsulta)
      },
      timeout: 10000
    });

    console.log('✅ Resposta da consulta por CPF:', response.data);
    return {
      sucesso: true,
      dados: response.data,
      inscricoes: extrairInscricoes(response.data)
    };

  } catch (error) {
    console.error('❌ Erro na consulta por CPF:', error.message);
    
    // Tentar abordagem alternativa
    return await tentarConsultaAlternativa(cpfCnpj);
  }
}

/**
 * Tenta métodos alternativos de consulta
 * @param {string} cpfCnpj - CPF/CNPJ
 * @returns {Promise<Object>} Resultado da consulta
 */
async function tentarConsultaAlternativa(cpfCnpj) {
  const url = 'https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidocumento';
  
  // Lista de operações para tentar
  const operacoes = ["1", "7", "8", "9"]; // Possíveis operações de consulta
  
  for (const operacao of operacoes) {
    try {
      console.log(`🔍 Tentando operação ${operacao} para consulta...`);
      
      const payload = {
        SSEChave: API_CHAVE,
        SSETipoContribuinte: "1",
        SSEInscricao: "",
        SSEExercicioDebito: "",
        SSETipoConsumo: "",
        SSENossoNumero: "",
        SSECPFCNPJ: cpfCnpj,
        SSEOperacao: operacao,
        SSEIdentificador: ""
      };

      const response = await axios.get(url, {
        headers: {
          DadosAPIDocumento: JSON.stringify(payload)
        },
        timeout: 8000
      });

      if (response.data && response.data.SSACodigo === 0) {
        console.log(`✅ Sucesso com operação ${operacao}:`, response.data);
        return {
          sucesso: true,
          dados: response.data,
          inscricoes: extrairInscricoes(response.data),
          operacaoUsada: operacao
        };
      }

    } catch (error) {
      console.log(`❌ Operação ${operacao} falhou:`, error.message);
      continue;
    }
  }

  return {
    sucesso: false,
    erro: 'API não suporta consulta por CPF/CNPJ ou múltiplas inscrições',
    inscricoes: []
  };
}

/**
 * Extrai inscrições do retorno da API
 * @param {Object} dados - Dados retornados pela API
 * @returns {Array} Lista de inscrições
 */
function extrairInscricoes(dados) {
  if (!dados) return [];

  // Se retornou uma única inscrição
  if (dados.SSAInscricao) {
    return [{
      inscricao: dados.SSAInscricao,
      nome: dados.SSANomeRazao || 'N/A',
      tipo: dados.SSATipoContribuinte || 'N/A',
      endereco: construirEndereco(dados)
    }];
  }

  // Se retornou múltiplas inscrições (formato a ser descoberto)
  if (Array.isArray(dados.inscricoes)) {
    return dados.inscricoes.map(item => ({
      inscricao: item.SSAInscricao || item.inscricao,
      nome: item.SSANomeRazao || item.nome || 'N/A',
      tipo: item.SSATipoContribuinte || item.tipo || 'N/A',
      endereco: construirEndereco(item)
    }));
  }

  return [];
}

/**
 * Constrói endereço a partir dos dados
 * @param {Object} dados - Dados do contribuinte
 * @returns {string} Endereço formatado
 */
function construirEndereco(dados) {
  if (!dados) return 'N/A';
  
  const partes = [
    dados.SSALogradouro,
    dados.SSANumero,
    dados.SSABairro,
    dados.SSACidade
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(', ') : 'N/A';
}

/**
 * Testa se a API suporta consulta por CPF/CNPJ
 * @param {string} cpfCnpjTeste - CPF/CNPJ para teste
 * @returns {Promise<boolean>} Se suporta consulta
 */
async function testarSuporteConsulta(cpfCnpjTeste = "12345678901") {
  const resultado = await consultarInscricoesPorCpf(cpfCnpjTeste);
  return resultado.sucesso;
}

module.exports = {
  consultarInscricoesPorCpf,
  testarSuporteConsulta,
  extrairInscricoes
};
