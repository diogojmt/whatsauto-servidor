/**
 * Utilitários de validação de documentos
 */

/**
 * Valida um CPF
 * @param {string} cpf - CPF apenas com números
 * @returns {boolean} True se válido
 */
function validarCPF(cpf) {
  // Remove formatação
  cpf = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) {
    resto = 0;
  }
  if (resto !== parseInt(cpf.charAt(9))) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) {
    resto = 0;
  }
  if (resto !== parseInt(cpf.charAt(10))) {
    return false;
  }
  
  return true;
}

/**
 * Valida um CNPJ
 * @param {string} cnpj - CNPJ apenas com números
 * @returns {boolean} True se válido
 */
function validarCNPJ(cnpj) {
  // Remove formatação
  cnpj = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) {
    return false;
  }
  
  return true;
}

/**
 * Valida se uma string contém apenas números
 * @param {string} str - String a ser validada
 * @returns {boolean} True se contém apenas números
 */
function validarApenasNumeros(str) {
  return /^\d+$/.test(str);
}

/**
 * Valida se uma inscrição tem formato válido
 * @param {string} inscricao - Inscrição a ser validada
 * @returns {boolean} True se válida
 */
function validarInscricao(inscricao) {
  // Remove formatação
  inscricao = inscricao.replace(/\D/g, '');
  
  // Verifica se tem entre 3 e 20 dígitos
  return inscricao.length >= 3 && inscricao.length <= 20;
}

/**
 * Formata um CPF para exibição
 * @param {string} cpf - CPF apenas com números
 * @returns {string} CPF formatado
 */
function formatarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) {
    return cpf;
  }
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata um CNPJ para exibição
 * @param {string} cnpj - CNPJ apenas com números
 * @returns {string} CNPJ formatado
 */
function formatarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) {
    return cnpj;
  }
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Detecta o tipo de documento (CPF ou CNPJ)
 * @param {string} documento - Documento apenas com números
 * @returns {string} 'CPF', 'CNPJ' ou 'INVALIDO'
 */
function detectarTipoDocumento(documento) {
  documento = documento.replace(/\D/g, '');
  
  if (documento.length === 11) {
    return 'CPF';
  } else if (documento.length === 14) {
    return 'CNPJ';
  }
  
  return 'INVALIDO';
}

module.exports = {
  validarCPF,
  validarCNPJ,
  validarApenasNumeros,
  validarInscricao,
  formatarCPF,
  formatarCNPJ,
  detectarTipoDocumento
};
