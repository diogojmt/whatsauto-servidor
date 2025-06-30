const { normalizarTexto } = require("../utils/textUtils");

/**
 * Busca por CNAE (desconsiderando letras iniciais)
 * @param {Array} dadosTFLF - Array com dados da TFLF
 * @param {string} digitosCNAE - Dígitos do CNAE para buscar
 * @returns {Array|null} Resultados encontrados ou null
 */
function buscarPorCNAE(dadosTFLF, digitosCNAE) {
  if (!digitosCNAE || digitosCNAE.length < 4) {
    return null;
  }

  const resultados = dadosTFLF.filter((item) => {
    // Remove letras do início da CNAE e mantém só números
    const cnaeNumeros = item.cnae.replace(/^[A-Za-z]+/, "");
    return cnaeNumeros.includes(digitosCNAE);
  });

  return resultados;
}

/**
 * Busca por código de serviço (item da Lei Complementar 116/2003)
 * @param {Array} dadosISS - Array com dados do ISS
 * @param {string} digitosServico - Dígitos do serviço
 * @param {boolean} buscaExata - Se true, busca exata; se false, busca que contém
 * @returns {Array|null} Resultados encontrados ou null
 */
function buscarPorCodigoServico(dadosISS, digitosServico, buscaExata = false) {
  if (!digitosServico || digitosServico.length < 3) {
    return null;
  }

  const resultados = dadosISS.filter((item) => {
    if (buscaExata) {
      return item.codigoSubitem === digitosServico;
    } else {
      return item.codigoSubitem.includes(digitosServico);
    }
  });

  return resultados;
}

/**
 * Busca por descrição de serviço
 * @param {Array} dadosISS - Array com dados do ISS
 * @param {string} termoBusca - Termo para buscar na descrição
 * @returns {Array|null} Resultados encontrados ou null
 */
function buscarPorDescricaoServico(dadosISS, termoBusca) {
  if (!termoBusca || termoBusca.length < 3) {
    return null;
  }

  const termo = normalizarTexto(termoBusca);

  const resultados = dadosISS.filter((item) => {
    const descricaoLimpa = normalizarTexto(item.descricaoSubitem);
    return descricaoLimpa.includes(termo);
  });

  return resultados;
}

/**
 * Busca por descrição de CNAE
 * @param {Array} dadosTFLF - Array com dados da TFLF
 * @param {string} termoBusca - Termo para buscar na descrição
 * @returns {Array|null} Resultados encontrados ou null
 */
function buscarPorDescricaoCNAE(dadosTFLF, termoBusca) {
  if (!termoBusca || termoBusca.length < 3) {
    return null;
  }

  const termo = normalizarTexto(termoBusca);

  const resultados = dadosTFLF.filter((item) => {
    const descricaoLimpa = normalizarTexto(item.descricao);
    return descricaoLimpa.includes(termo);
  });

  return resultados;
}

module.exports = {
  buscarPorCNAE,
  buscarPorCodigoServico,
  buscarPorDescricaoServico,
  buscarPorDescricaoCNAE
};
