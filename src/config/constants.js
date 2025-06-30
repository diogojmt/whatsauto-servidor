// URLs e links do sistema
const URLS = {
  PORTAL_CONTRIBUINTE: "https://arapiraca.abaco.com.br/eagata/portal/",
  NFSE_PORTAL: "https://www.e-nfs.com.br/arapiraca/portal/",
  SUBSTITUTOS_TRIBUTARIOS: "https://web.arapiraca.al.gov.br/wp-content/uploads/2021/01/DECRETOSUBSTITUTOTRIBUTARIO2023-2.pdf",
  TFLF_PLANILHA: "https://web.arapiraca.al.gov.br/wp-content/uploads/2021/01/TFLF2020a20251.pdf",
  GITHUB_IMAGENS: "https://github.com/diogojmt/whatsauto-servidor/blob/main/imagens/",
  GOOGLE_MAPS: "https://maps.google.com/?q=Rua+Samaritana,+1180,+Arapiraca,+AL"
};

// Manuais NFSe
const MANUAIS_NFSE = {
  PRIMEIRO_ACESSO: "https://www.e-nfs.com.br/arapiraca/temp/DOC_291.ZIP",
  TOMADORES_CADASTRADOS: "https://www.e-nfs.com.br/arapiraca/temp/DOC_250.PDF",
  TOMADORES_NAO_CADASTRADOS: "https://www.e-nfs.com.br/arapiraca/temp/DOC_251.PDF",
  GUIAS_PAGAMENTO: "https://www.e-nfs.com.br/arapiraca/temp/DOC_252.PDF",
  CANCELAR_NFSE: "https://www.e-nfs.com.br/arapiraca/temp/DOC_259.PDF",
  RECUSA_NOTAS: "https://www.e-nfs.com.br/arapiraca/temp/DOC_284.PDF",
  CARTA_CORRECAO: "https://www.e-nfs.com.br/arapiraca/temp/DOC_288.ZIP",
  SUBSTITUICAO_NOTA: "https://www.e-nfs.com.br/arapiraca/temp/DOC_278.PDF",
  CADASTRO_AVULSA: "https://www.e-nfs.com.br/arapiraca/temp/DOC_279.PDF",
  ESCRITURACAO_AVULSA: "https://www.e-nfs.com.br/arapiraca/temp/DOC_294.PDF"
};

// Links específicos de certidões
const CERTIDOES_LINKS = {
  IMOBILIARIA: "https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?18,certidao-imobiliaria",
  GERAL: "https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?20,certidao-geral",
  AUTENTICIDADE: "https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?21,certidao-autenticacao"
};

// Contatos
const CONTATOS = {
  EMAIL_FAZENDA: "smfaz@arapiraca.al.gov.br",
  EMAIL_NFSE_SUPORTE: "atendimento@abaco.com.br",
  TELEFONE_NFSE: "0800 647 0777",
  ENDERECO: "Rua Samaritana, 1.180 - Bairro Santa Edwiges - Próximo ao Shopping",
  HORARIO: "Segunda a Sexta: 8h às 14h"
};

// Estados de navegação
const ESTADOS = {
  MENU_PRINCIPAL: "menu_principal",
  OPCAO_3_NFSE: "opcao_3_nfse",
  OPCAO_5_TFLF: "opcao_5_tflf",
  CONSULTA_ISS: "consulta_iss",
  CONSULTA_CNAE: "consulta_cnae",
  EMISSAO_CERTIDAO: "emissao_certidao",
  AGUARDANDO_TIPO_CONTRIBUINTE: "aguardando_tipo_contribuinte",
  AGUARDANDO_INSCRICAO: "aguardando_inscricao"
};

// Emojis
const EMOJIS = {
  SUCESSO: "✅",
  ERRO: "❌",
  BUSCA: "🔍",
  INFO: "💡",
  DINHEIRO: "💰",
  DOCUMENTO: "📄",
  MENU: "📋",
  TELEFONE: "📞",
  EMAIL: "📧",
  ENDERECO: "📍",
  RELOGIO: "⏱️",
  SAUDACAO: "👋",
  ROBÔ: "🤖",
  FELIZ: "😊"
};

// Palavras de agradecimento
const PALAVRAS_AGRADECIMENTO = [
  "obrigado", "obrigada", "valeu", "muito obrigado", "muito obrigada",
  "grato", "grata", "agradeco", "brigado", "brigada", "thanks", "thx", "vlw", "obg"
];

// Palavras de saudação
const PALAVRAS_SAUDACAO = [
  "ola", "oi", "bom dia", "boa tarde", "boa noite", "opcoes", "ajuda", "hi", "hello"
];

// Limites de busca
const LIMITES = {
  MIN_CNAE: 4,
  MIN_SERVICO: 3,
  MIN_DESCRICAO: 3,
  MAX_RESULTADOS: 10,
  MAX_RESULTADOS_ISS: 8
};

module.exports = {
  URLS,
  MANUAIS_NFSE,
  CERTIDOES_LINKS,
  CONTATOS,
  ESTADOS,
  EMOJIS,
  PALAVRAS_AGRADECIMENTO,
  PALAVRAS_SAUDACAO,
  LIMITES
};
