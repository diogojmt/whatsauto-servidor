// URLs e links do sistema
const URLS = {
  PORTAL_CONTRIBUINTE: "https://arapiraca.abaco.com.br/eagata/portal/",
  NFSE_PORTAL: "https://www.e-nfs.com.br/arapiraca/portal/",
  SUBSTITUTOS_TRIBUTARIOS:
    "https://web.arapiraca.al.gov.br/wp-content/uploads/2021/01/DECRETOSUBSTITUTOTRIBUTARIO2023-2.pdf",
  TFLF_PLANILHA:
    "https://web.arapiraca.al.gov.br/wp-content/uploads/2021/01/TFLF2020a20251.pdf",
  GITHUB_IMAGENS:
    "https://github.com/diogojmt/whatsauto-servidor/blob/main/imagens/",
  GOOGLE_MAPS: "https://maps.google.com/?q=Rua+Samaritana,+1180,+Arapiraca,+AL",
};

// Manuais NFSe
const MANUAIS_NFSE = {
  PRIMEIRO_ACESSO: "https://www.e-nfs.com.br/arapiraca/temp/DOC_291.ZIP",
  TOMADORES_CADASTRADOS: "https://www.e-nfs.com.br/arapiraca/temp/DOC_250.PDF",
  TOMADORES_NAO_CADASTRADOS:
    "https://www.e-nfs.com.br/arapiraca/temp/DOC_251.PDF",
  GUIAS_PAGAMENTO: "https://www.e-nfs.com.br/arapiraca/temp/DOC_252.PDF",
  CANCELAR_NFSE: "https://www.e-nfs.com.br/arapiraca/temp/DOC_259.PDF",
  RECUSA_NOTAS: "https://www.e-nfs.com.br/arapiraca/temp/DOC_284.PDF",
  CARTA_CORRECAO: "https://www.e-nfs.com.br/arapiraca/temp/DOC_288.ZIP",
  SUBSTITUICAO_NOTA: "https://www.e-nfs.com.br/arapiraca/temp/DOC_278.PDF",
  CADASTRO_AVULSA: "https://www.e-nfs.com.br/arapiraca/temp/DOC_279.PDF",
  ESCRITURACAO_AVULSA: "https://www.e-nfs.com.br/arapiraca/temp/DOC_294.PDF",
};

// Links específicos de certidões
const CERTIDOES_LINKS = {
  IMOBILIARIA:
    "https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?18,certidao-imobiliaria",
  GERAL:
    "https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?20,certidao-geral",
  AUTENTICIDADE:
    "https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?21,certidao-autenticacao",
};

// Contatos
const CONTATOS = {
  EMAIL_FAZENDA: "smfaz@arapiraca.al.gov.br",
  EMAIL_NFSE_SUPORTE: "atendimento@abaco.com.br",
  TELEFONE_NFSE: "0800 647 0777",
  TELEFONE_PREFEITURA: "(82) 3539-6000",
  ENDERECO:
    "Rua Samaritana, 1.180 - Bairro Santa Edwiges - Próximo ao Shopping",
  HORARIO: "Segunda a Sexta: 8h às 14h",
};

// Estados de navegação
const ESTADOS = {
  MENU_PRINCIPAL: "menu_principal",
  OPCAO_1_DAM: "opcao_1_dam",
  OPCAO_2_CERTIDAO: "opcao_2_certidao",
  OPCAO_3_NFSE: "opcao_3_nfse",
  OPCAO_4_SUBSTITUTOS: "opcao_4_substitutos",
  OPCAO_5_TFLF: "opcao_5_tflf",
  OPCAO_6_BCI: "opcao_6_bci",
  CONSULTA_ISS: "consulta_iss",
  CONSULTA_CNAE: "consulta_cnae",
  EMISSAO_CERTIDAO: "emissao_certidao",
  AGUARDANDO_TIPO_CONTRIBUINTE: "aguardando_tipo_contribuinte",
  AGUARDANDO_CPF_CNPJ: "aguardando_cpf_cnpj",
  AGUARDANDO_SELECAO_INSCRICAO: "aguardando_selecao_inscricao",
  AGUARDANDO_INSCRICAO: "aguardando_inscricao",
  // Estados para consulta de débitos
  DEBITOS_ATIVO: "debitos_ativo",
  DEBITOS_TIPO_CONTRIBUINTE: "debitos_tipo_contribuinte",
  DEBITOS_INSCRICAO: "debitos_inscricao",
  DEBITOS_EXERCICIO: "debitos_exercicio",
  // Estados para consulta de BCI
  BCI_ATIVO: "bci_ativo",
};

// Emojis - TODOS DEFINIDOS para evitar undefined
const EMOJIS = {
  // Principais
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
  FELIZ: "😊",

  // Adicionais para certidões
  ALERTA: "⚠️",
  PERGUNTA: "❓",
  SETA: "👉",
  AJUDA: "🆘",
  PESSOA: "👤",
  CASA: "🏠",
  VERIFICADO: "✔️",
  CONFUSO: "🤔",
  TRISTE: "😔",
  FESTA: "🎉",
  DESCULPA: "😅",
  RAIO: "⚡",
  FERRAMENTA: "🔧",
  CANCELAR: "❌",
  EXEMPLO: "📝",
  AVALIACAO: "⭐",
  SOLUCAO: "💡",

  // Específicos do sistema
  DAM: "📄",
  CERTIDAO: "📜",
  NFSE: "🧾",
  SUBSTITUTOS: "📋",
  TFLF: "💰",
  BCI: "🏠",
  ENCERRAR: "👋",

  // Novos emojis para melhor UX
  LOADING: "⏳",
  ATENCAO: "🚨",
  DICA: "💭",
  LINK: "🔗",
  DOWNLOAD: "⬇️",
  UPLOAD: "⬆️",
  CALENDARIO: "📅",
  HORARIO: "🕐",
  LOCALIZACAO: "🗺️",
  WHATSAPP: "💬",
  INTERNET: "🌐",
  ARQUIVO: "📁",
  PDF: "📋",
  IMPRESSORA: "🖨️",
  CELULAR: "📱",
  COMPUTADOR: "💻",
  SEGURANCA: "🔒",
  CHAVE: "🔑",
  USUARIO: "👥",
  EMPRESA: "🏢",
  RESIDENCIA: "🏡",
  NUMERO: "🔢",
  TEXTO: "📝",
  LISTA: "📄",
  OPCAO: "⚪",
  SELECIONADO: "🔘",
  VOLTAR: "↩️",
  AVANCAR: "➡️",
  CIMA: "⬆️",
  BAIXO: "⬇️",
};

// Palavras de agradecimento
const PALAVRAS_AGRADECIMENTO = [
  "obrigado",
  "obrigada",
  "valeu",
  "muito obrigado",
  "muito obrigada",
  "grato",
  "grata",
  "agradeco",
  "brigado",
  "brigada",
  "thanks",
  "thx",
  "vlw",
  "obg",
];

// Palavras de saudação
const PALAVRAS_SAUDACAO = [
  "ola",
  "oi",
  "bom dia",
  "boa tarde",
  "boa noite",
  "opcoes",
  "ajuda",
  "hi",
  "hello",
];

// Palavras para cancelar
const PALAVRAS_CANCELAR = [
  "cancelar",
  "sair",
  "parar",
  "voltar",
  "menu",
  "inicio",
  "cancel",
  "stop",
  "quit",
  "exit",
];

// Palavras para ajuda
const PALAVRAS_AJUDA = [
  "ajuda",
  "help",
  "socorro",
  "duvida",
  "dúvida",
  "como",
  "tutorial",
  "instrucao",
  "instrução",
];

// Limites de busca
const LIMITES = {
  MIN_CNAE: 4,
  MIN_SERVICO: 3,
  MIN_DESCRICAO: 3,
  MAX_RESULTADOS: 10,
  MAX_RESULTADOS_ISS: 8,
  TIMEOUT_SESSAO: 10 * 60 * 1000, // 10 minutos
  MAX_TENTATIVAS_EMISSAO: 3,
  DELAY_RETRY: 2000, // 2 segundos
  CACHE_TTL: 5 * 60 * 1000, // 5 minutos
  RATE_LIMIT_MAX: 5,
  RATE_LIMIT_WINDOW: 60 * 60 * 1000, // 1 hora
};

// Mensagens padrão do sistema
const MENSAGENS = {
  MENU_PRINCIPAL: (
    nome
  ) => `Olá ${nome}! ${EMOJIS.SAUDACAO} Seja bem-vindo ao meu atendimento virtual!

Escolha uma das opções abaixo digitando o número:

*1* - ${EMOJIS.DAM} Segunda via de DAM's
*2* - ${EMOJIS.CERTIDAO} Certidões de Regularidade Fiscal
*3* - ${EMOJIS.NFSE} NFSe e ISSQN
*4* - ${EMOJIS.SUBSTITUTOS} Lista de Substitutos Tributários
*5* - ${EMOJIS.TFLF} TFLF 2025
*6* - ${EMOJIS.BCI} Consulta de BCI (Boletim de Cadastro Imobiliário)
*0* - ${EMOJIS.ENCERRAR} Encerrar Atendimento

Digite o número da opção desejada ou descreva sua dúvida.`,

  OPCAO_INVALIDA: `${EMOJIS.ERRO} Opção inválida! 

Por favor, digite um número de 0 a 6 ou descreva sua dúvida.`,

  SESSAO_EXPIRADA: `${EMOJIS.RELOGIO} Sua sessão expirou por inatividade.

Digite *menu* para começar novamente.`,

  ERRO_SISTEMA: `${EMOJIS.FERRAMENTA} Ops! Ocorreu um erro no sistema.

Tente novamente em alguns minutos ou entre em contato:
${EMOJIS.EMAIL} smfaz@arapiraca.al.gov.br
${EMOJIS.TELEFONE} (82) 3539-6000`,

  AGRADECIMENTO: `${EMOJIS.FELIZ} *Atendimento Finalizado*

De nada! Foi um prazer ajudá-lo(a) hoje! 

${EMOJIS.SUCESSO} Sua consulta foi atendida com sucesso.

Caso precise de mais informações sobre tributos municipais, estarei sempre aqui para ajudar.

${EMOJIS.INFO} *Lembre-se:*
• Portal do Contribuinte: ${URLS.PORTAL_CONTRIBUINTE}
• NFSe: ${URLS.NFSE_PORTAL}

Tenha um excelente dia! ${EMOJIS.SAUDACAO}

*Atendimento encerrado automaticamente*`,

  DESPEDIDA: `${EMOJIS.SAUDACAO} *Encerrando Atendimento*

Agradecemos por utilizar nossos serviços digitais!

🏛️ *Prefeitura de Arapiraca - Secretaria da Fazenda*

Para um novo atendimento, digite *menu* ou inicie uma nova conversa.

Tenha um ótimo dia! ${EMOJIS.FELIZ}`,

  ATENDENTE_HUMANO: `👨‍💼 *Solicitação de Atendimento Humano*

Para falar com um atendente, procure diretamente:

${EMOJIS.ENDERECO} *Secretaria da Fazenda Municipal*
${CONTATOS.ENDERECO}
🗺️ ${URLS.GOOGLE_MAPS}

${EMOJIS.RELOGIO} *Horário de atendimento:*
${CONTATOS.HORARIO}
${EMOJIS.EMAIL} ${CONTATOS.EMAIL_FAZENDA}

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`,

  RESPOSTA_PADRAO: (nome) => `${nome}, não consegui entender sua mensagem. 

${EMOJIS.ROBÔ} *Para continuar, você pode:*

• Digite *menu* para ver todas as opções disponíveis
• Digite *1* para Segunda via de DAM's
• Digite *2* para Certidões de Regularidade Fiscal
• Digite *3* para NFSe
• Digite *4* para Lista de Substitutos Tributários
• Digite *5* para TFLF 2025
• Digite *6* para Consulta de BCI
• Digite *0* para encerrar o atendimento

🏛️ *Ou compareça pessoalmente:*
Secretaria da Fazenda Municipal
${EMOJIS.ENDERECO} ${CONTATOS.ENDERECO}
🗺️ ${URLS.GOOGLE_MAPS}
${EMOJIS.EMAIL} ${CONTATOS.EMAIL_FAZENDA}
${CONTATOS.HORARIO}`,

  RATE_LIMIT: `${EMOJIS.ALERTA} Muitas tentativas em pouco tempo!

Por segurança, aguarde 1 hora antes de tentar novamente.

${EMOJIS.INFO} Enquanto isso, você pode usar:
${EMOJIS.INTERNET} Portal: https://arapiraca.abaco.com.br/eagata/portal/
${EMOJIS.EMAIL} Email: smfaz@arapiraca.al.gov.br`,
};

// Tipos de contribuinte para certidões
const TIPOS_CONTRIBUINTE = {
  GERAL: "1",
  IMOVEL: "2",
};

const TIPOS_CONTRIBUINTE_LABELS = {
  [TIPOS_CONTRIBUINTE.GERAL]: "Contribuinte geral",
  [TIPOS_CONTRIBUINTE.IMOVEL]: "Imóvel",
};

// Configurações do sistema
const CONFIG = {
  TIMEOUT_SESSAO: 10 * 60 * 1000, // 10 minutos
  MAX_TENTATIVAS: 3,
  DELAY_RETRY: 2000, // 2 segundos
  CACHE_TTL: 5 * 60 * 1000, // 5 minutos
  RATE_LIMIT: {
    MAX_REQUESTS: 5,
    WINDOW: 60 * 60 * 1000, // 1 hora
  },
  LOG_LEVEL: process.env.LOG_LEVEL || "INFO",
  NODE_ENV: process.env.NODE_ENV || "development",
};

// Validações
const VALIDACOES = {
  CPF_LENGTH: 11,
  CNPJ_LENGTH: 14,
  MIN_INSCRICAO_LENGTH: 3,
  MAX_INSCRICAO_LENGTH: 20,
  REGEX_APENAS_NUMEROS: /^\d+$/,
  REGEX_CPF_INVALIDOS: /^(\d)\1{10}$/,
  REGEX_CNPJ_INVALIDOS: /^(\d)\1{13}$/,
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
  PALAVRAS_CANCELAR,
  PALAVRAS_AJUDA,
  LIMITES,
  MENSAGENS,
  TIPOS_CONTRIBUINTE,
  TIPOS_CONTRIBUINTE_LABELS,
  CONFIG,
  VALIDACOES,
};
