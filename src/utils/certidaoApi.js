const axios = require("axios");

// Chave de acesso fornecida pela TI
const API_CHAVE = "@C0sS0_@P1";

/**
 * Emite certidão através da API da Ábaco
 * @param {Object} params - Parâmetros para emissão
 * @param {string} params.tipoContribuinte - Tipo de contribuinte (1=PF/PJ, 2=Imóvel, 3=Empresa)
 * @param {string} params.inscricao - Cadastro Geral
 * @param {string} params.cpfCnpj - CPF ou CNPJ
 * @param {string} params.operacao - Tipo de documento (2=Certidão)
 * @returns {Promise<Object>} Resposta da API
 */
async function emitirCertidao({
  tipoContribuinte,
  inscricao,
  cpfCnpj,
  operacao = "2",
}) {
  const url =
    "https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidocumento";

  const payload = {
    SSEChave: API_CHAVE,
    SSETipoContribuinte: tipoContribuinte,
    SSEInscricao: inscricao,
    SSEExercicioDebito: "",
    SSETipoConsumo: "",
    SSENossoNumero: "",
    SSECPFCNPJ: cpfCnpj || "",
    SSEOperacao: operacao,
    SSEIdentificador: "",
  };

  try {
    console.log("🔗 Enviando requisição para API da Ábaco:", {
      url,
      tipoContribuinte,
      inscricao,
      operacao,
    });

    const response = await axios.get(url, {
      headers: {
        DadosAPIDocumento: JSON.stringify(payload),
      },
      timeout: 15000, // 15 segundos - mais rápido para evitar timeout do WhatsApp
    });

    console.log("✅ Resposta da API recebida:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Erro na requisição à API da Ábaco:", error.message);

    if (error.response) {
      console.error("❌ Status da resposta:", error.response.status);
      console.error("❌ Dados da resposta:", error.response.data);
    }

    return {
      SSACodigo: 99,
      SSAMensagem:
        "Erro na comunicação com o serviço de certidões. Tente novamente em alguns minutos.",
    };
  }
}

/**
 * Valida os dados de entrada para emissão de certidão
 * @param {string} tipoContribuinte - Tipo de contribuinte
 * @param {string} inscricao - Cadastro Geral
 * @returns {Object} Resultado da validação
 */
function validarDadosCertidao(tipoContribuinte, inscricao) {
  const errors = [];

  // Validar tipo de contribuinte
  if (!tipoContribuinte || !["1", "2", "3"].includes(tipoContribuinte)) {
    errors.push(
      "Tipo de contribuinte deve ser 1 (PF/PJ), 2 (Imóvel) ou 3 (Empresa)"
    );
  }

  // Validar inscrição
  if (!inscricao || inscricao.trim().length === 0) {
    errors.push("Cadastro Geral é obrigatória");
  }

  // Validar se inscrição contém apenas números
  if (inscricao && !/^\d+$/.test(inscricao.trim())) {
    errors.push("Cadastro Geral deve conter apenas números");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  emitirCertidao,
  validarDadosCertidao,
};
