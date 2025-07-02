/**
 * Utilitários para manipulação de texto
 */

/**
 * Normaliza texto removendo acentos e convertendo para minúsculas
 * @param {string} texto - Texto a ser normalizado
 * @returns {string} Texto normalizado
 */
function normalizarTexto(texto) {
  if (!texto || typeof texto !== 'string') {
    return '';
  }
  
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Extrai apenas números de uma string
 * @param {string} texto - Texto de entrada
 * @returns {string} Apenas os números
 */
function extrairNumeros(texto) {
  if (!texto || typeof texto !== 'string') {
    return '';
  }
  return texto.replace(/[^0-9]/g, "");
}

/**
 * Verifica se o texto contém letras
 * @param {string} texto - Texto a ser verificado
 * @returns {boolean} True se contém letras
 */
function contemLetras(texto) {
  if (!texto || typeof texto !== 'string') {
    return false;
  }
  return /[a-zA-Z]/.test(texto);
}

/**
 * Formata valor monetário
 * @param {string} valor - Valor em string com vírgula
 * @returns {string} Valor formatado para exibição
 */
function formatarValorMonetario(valor) {
  return parseFloat(valor.replace(",", "."))
    .toFixed(2)
    .replace(".", ",");
}

/**
 * Formata porcentagem
 * @param {string} valor - Valor em string com vírgula
 * @returns {string} Valor formatado como porcentagem
 */
function formatarPorcentagem(valor) {
  return (parseFloat(valor.replace(",", ".")) * 100).toFixed(1);
}

module.exports = {
  normalizarTexto,
  extrairNumeros,
  contemLetras,
  formatarValorMonetario,
  formatarPorcentagem
};
