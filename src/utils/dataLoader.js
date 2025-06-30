const fs = require("fs");

/**
 * Carrega e processa dados de arquivo de texto separado por pipes
 * @param {string} nomeArquivo - Nome do arquivo
 * @param {Array} campos - Array com nomes dos campos
 * @returns {Array} Array de objetos com os dados
 */
function carregarDados(nomeArquivo, campos) {
  try {
    const conteudo = fs.readFileSync(nomeArquivo, "utf8");
    const linhas = conteudo.split("\n");
    
    const dados = [];

    // Pula a primeira linha (cabeçalho)
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (linha) {
        const colunas = linha.split("|");
        if (colunas.length >= campos.length) {
          const item = {};
          campos.forEach((campo, index) => {
            item[campo] = colunas[index];
          });
          dados.push(item);
        }
      }
    }
    
    console.log(`✅ Carregados ${dados.length} registros de ${nomeArquivo}`);
    return dados;
  } catch (error) {
    console.error(`❌ Erro ao carregar dados de ${nomeArquivo}:`, error);
    return [];
  }
}

/**
 * Carrega dados da TFLF
 * @returns {Array} Array com dados da TFLF
 */
function carregarDadosTFLF() {
  const campos = [
    "codigo", "cnae", "descricao", "tflf2020", "tflf2021", 
    "tflf2022", "tflf2023", "tflf2024", "tflf2025"
  ];
  return carregarDados("vlr_tlf_20_25.txt", campos);
}

/**
 * Carrega dados do ISS
 * @returns {Array} Array com dados do ISS
 */
function carregarDadosISS() {
  const campos = [
    "codigoItem", "descricaoItem", "codigoSubitem", "descricaoSubitem",
    "aliquota", "percentualDeducao", "tributacaoForaArapiraca"
  ];
  return carregarDados("ISS_Arapiraca.txt", campos);
}

module.exports = {
  carregarDadosTFLF,
  carregarDadosISS
};
