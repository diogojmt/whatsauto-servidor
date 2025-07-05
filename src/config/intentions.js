/**
 * Configuração de intenções do chatbot
 * Sistema modular para detecção contextual de intenções
 */

const { ESTADOS } = require("./constants");

/**
 * Definição de intenções com palavras-chave, prioridade e ações
 */
const INTENTIONS = {
  // Intenção: Consulta de Débitos/DAM
  DEBITOS: {
    id: "DEBITOS",
    name: "Consulta de Débitos",
    description: "Consultar débitos, DAM, segunda via de boletos",
    priority: 10,
    keywords: [
      "segunda via",
      "boleto",
      "dam",
      "debito",
      "debitos",
      "imposto",
      "iptu",
      "cosip",
      "tributo",
      "carne",
      "guia",
      "pagamento",
      "pagar",
      "vencimento",
      "atraso",
      "multa",
      "taxa",
      "cobranca",
      "divida",
      "parcelamento",
      "negociacao",
    ],
    phrases: [
      "quero consultar meus débitos",
      "preciso da segunda via",
      "como pagar meu iptu",
      "boleto vencido",
      "débitos em atraso",
      "consultar pendências",
    ],
    action: "initiate_debitos",
    state: ESTADOS.DEBITOS_ATIVO,
    examples: [
      "Quero consultar meus débitos",
      "Preciso da segunda via do IPTU",
      "Boleto vencido",
      "Como pagar minha taxa",
    ],
  },

  // Intenção: Certidões
  CERTIDOES: {
    id: "CERTIDOES",
    name: "Certidões",
    description: "Emitir certidões negativas, positivas, regularidade fiscal",
    priority: 9,
    keywords: [
      "certidao",
      "certidoes",
      "negativa",
      "positiva",
      "regularidade",
      "fiscal",
      "tributos",
      "limpa",
      "nada consta",
      "quitacao",
      "emitir",
      "gerar",
      "baixar",
      "imprimir",
      "documento",
      "comprovante",
    ],
    phrases: [
      "preciso de uma certidão",
      "emitir certidão negativa",
      "certidão de regularidade",
      "documento para licitação",
      "certidão limpa",
      "nada consta",
    ],
    action: "initiate_certidoes",
    state: ESTADOS.AGUARDANDO_TIPO_CONTRIBUINTE,
    examples: [
      "Preciso de uma certidão negativa",
      "Emitir certidão de regularidade",
      "Documento para licitação",
      "Certidão limpa",
    ],
  },

  // Intenção: NFSe
  NFSE: {
    id: "NFSE",
    name: "NFSe",
    description: "Nota Fiscal de Serviços Eletrônica, ISS, ISSQN",
    priority: 8,
    keywords: [
      "nota fiscal",
      "nfse",
      "nfs-e",
      "issqn",
      "iss",
      "servico",
      "servicos",
      "emitir nota",
      "emitir nfse",
      "como emitir",
      "faturamento",
      "receita",
      "codigo servico",
      "aliquota",
      "retencao",
      "substituicao",
      "prestador",
      "tomador",
    ],
    phrases: [
      "como emitir nota fiscal",
      "nfse não funciona",
      "código do serviço",
      "alíquota do iss",
      "sistema de nota fiscal",
      "cadastro prestador",
    ],
    action: "initiate_nfse",
    state: ESTADOS.OPCAO_3_NFSE,
    examples: [
      "Como emitir nota fiscal de serviço",
      "Problema com NFSe",
      "Código do serviço",
      "Alíquota do ISS",
    ],
  },

  // Intenção: BCI - Cadastro Imobiliário
  BCI: {
    id: "BCI",
    name: "Cadastro Imobiliário",
    description: "Boletim de Cadastro Imobiliário, dados do imóvel",
    priority: 7,
    keywords: [
      "bci",
      "boletim",
      "cadastro",
      "imobiliario",
      "imovel",
      "casa",
      "apartamento",
      "terreno",
      "lote",
      "endereco",
      "matricula",
      "inscricao",
      "area",
      "metragem",
      "proprietario",
      "dados imovel",
    ],
    phrases: [
      "consultar dados do imóvel",
      "boletim de cadastro",
      "informações da casa",
      "dados do terreno",
      "cadastro imobiliário",
      "bci do apartamento",
    ],
    action: "initiate_bci",
    state: ESTADOS.BCI_ATIVO,
    examples: [
      "Consultar dados do meu imóvel",
      "Boletim de cadastro imobiliário",
      "Informações da minha casa",
      "BCI do apartamento",
    ],
  },

  // Intenção: Agendamento
  AGENDAMENTO: {
    id: "AGENDAMENTO",
    name: "Agendamento",
    description: "Agendar atendimento presencial, horários disponíveis",
    priority: 6,
    keywords: [
      "agendamento",
      "agendar",
      "atendimento",
      "presencial",
      "horario",
      "data",
      "consulta",
      "reuniao",
      "visita",
      "comparecer",
      "ir na prefeitura",
      "marcar",
      "disponibilidade",
      "calendario",
      "agenda",
    ],
    phrases: [
      "quero agendar atendimento",
      "marcar horário",
      "visita na prefeitura",
      "atendimento presencial",
      "consulta agendada",
      "horários disponíveis",
    ],
    action: "initiate_agendamento",
    state: ESTADOS.AGENDAMENTO_ATIVO,
    examples: [
      "Quero agendar um atendimento",
      "Marcar horário na prefeitura",
      "Atendimento presencial",
      "Horários disponíveis",
    ],
  },

  // Intenção: TFLF
  TFLF: {
    id: "TFLF",
    name: "Taxa de Fiscalização",
    description: "Taxa de Fiscalização de Localização e Funcionamento",
    priority: 5,
    keywords: [
      "tflf",
      "taxa",
      "fiscalizacao",
      "localizacao",
      "funcionamento",
      "cnae",
      "atividade",
      "empresa",
      "comercio",
      "industria",
      "servicos",
      "alvara",
      "licenca",
      "valor",
      "tabela",
      "calculo",
    ],
    phrases: [
      "valor da tflf",
      "taxa de fiscalização",
      "cnae da empresa",
      "atividade econômica",
      "alvará de funcionamento",
      "licença comercial",
    ],
    action: "initiate_tflf",
    state: ESTADOS.OPCAO_5_TFLF,
    examples: [
      "Valor da TFLF",
      "Taxa de fiscalização",
      "CNAE da minha empresa",
      "Alvará de funcionamento",
    ],
  },

  // Intenção: Demonstrativo Financeiro
  DEMONSTRATIVO: {
    id: "DEMONSTRATIVO",
    name: "Demonstrativo Financeiro",
    description: "Demonstrativo financeiro, extrato de pagamentos",
    priority: 4,
    keywords: [
      "demonstrativo",
      "financeiro",
      "extrato",
      "pagamentos",
      "historico",
      "movimentacao",
      "receitas",
      "despesas",
      "balanco",
      "relatorio",
      "comprovante",
      "quitacao",
    ],
    phrases: [
      "demonstrativo financeiro",
      "extrato de pagamentos",
      "histórico de quitação",
      "relatório financeiro",
      "comprovante de pagamento",
      "movimentação financeira",
    ],
    action: "initiate_demonstrativo",
    state: ESTADOS.OPCAO_7_DEMONSTRATIVO,
    examples: [
      "Demonstrativo financeiro",
      "Extrato de pagamentos",
      "Histórico de quitação",
      "Relatório financeiro",
    ],
  },

  // Intenção: Substitutos Tributários
  SUBSTITUTOS: {
    id: "SUBSTITUTOS",
    name: "Substitutos Tributários",
    description: "Lista de substitutos tributários, empresas optantes",
    priority: 3,
    keywords: [
      "substituto",
      "substitutos",
      "tributario",
      "tributarios",
      "lista",
      "empresa",
      "optante",
      "substituicao",
      "regime",
      "especial",
    ],
    phrases: [
      "lista de substitutos",
      "empresas optantes",
      "substitutos tributários",
      "regime especial",
      "substituição tributária",
    ],
    action: "initiate_substitutos",
    state: ESTADOS.MENU_PRINCIPAL,
    examples: [
      "Lista de substitutos tributários",
      "Empresas optantes",
      "Regime especial",
      "Substituição tributária",
    ],
  },

  // Intenção: Atendente Humano
  ATENDENTE: {
    id: "ATENDENTE",
    name: "Atendente Humano",
    description: "Falar com atendente humano, suporte personalizado",
    priority: 2,
    keywords: [
      "atendente",
      "humano",
      "pessoa",
      "funcionario",
      "suporte",
      "help",
      "ajuda",
      "falar com",
      "contato",
      "telefone",
      "email",
      "pessoalmente",
    ],
    phrases: [
      "falar com atendente",
      "preciso de ajuda",
      "atendimento humano",
      "suporte personalizado",
      "contato telefônico",
      "falar com pessoa",
    ],
    action: "initiate_atendente",
    state: ESTADOS.MENU_PRINCIPAL,
    examples: [
      "Falar com atendente",
      "Preciso de ajuda",
      "Atendimento humano",
      "Suporte personalizado",
    ],
  },
};

/**
 * Configuração de contextos especiais
 */
const CONTEXT_RULES = {
  // Palavras que indicam mudança de assunto
  CHANGE_TOPIC: [
    "quero",
    "preciso",
    "gostaria",
    "desejo",
    "me ajuda",
    "como",
    "onde",
    "quando",
    "qual",
    "quais",
    "pode",
    "consegue",
    "tenho",
    "estou",
    "sou",
    "na verdade",
    "melhor",
    "prefiro",
    "mudei de ideia",
    "esqueci",
    "lembrei",
  ],

  // Palavras que indicam negação/cancelamento
  CANCEL_WORDS: [
    "nao",
    "não",
    "cancelar",
    "parar",
    "sair",
    "voltar",
    "menu",
    "inicio",
    "esquecer",
    "deixa pra la",
    "tanto faz",
    "desistir",
  ],

  // Palavras que indicam confirmação
  CONFIRM_WORDS: [
    "sim",
    "ok",
    "okay",
    "certo",
    "correto",
    "isso",
    "exato",
    "perfeito",
    "concordo",
    "aceito",
    "confirmo",
    "continuar",
    "seguir",
  ],

  // Prioridades por contexto
  PRIORITY_BOOST: {
    // Aumenta prioridade quando o usuário está em um fluxo específico
    SAME_CONTEXT: 5,
    // Aumenta prioridade para intenções relacionadas
    RELATED_CONTEXT: 3,
    // Aumenta prioridade quando usa palavras de mudança de assunto
    CHANGE_TOPIC: 2,
  },
};

/**
 * Configuração de respostas automáticas para intenções
 */
const INTENTION_RESPONSES = {
  // Resposta quando múltiplas intenções são detectadas
  MULTIPLE_INTENTIONS: {
    template: `🎯 *Identifiquei algumas opções para você*

{nome}, percebi que você pode estar interessado em:

{intentions_list}

Digite o número da opção desejada ou me diga o que prefere fazer:`,
    maxIntentions: 3,
  },

  // Resposta quando uma intenção é detectada
  SINGLE_INTENTION: {
    template: `🎯 *Detectei sua intenção*

{nome}, você quer {intention_name}?

{examples}

Digite *sim* para continuar ou me diga o que realmente precisa:`,
  },

  // Resposta quando intenção é detectada durante outro fluxo
  CONTEXT_CHANGE: {
    template: `🔄 *Mudança de assunto detectada*

{nome}, você estava {current_context} mas agora parece querer {new_intention}.

Deseja:
*1* - Continuar com {new_intention}
*2* - Voltar para {current_context}
*3* - Ir para menu principal

Digite sua opção:`,
  },
};

module.exports = {
  INTENTIONS,
  CONTEXT_RULES,
  INTENTION_RESPONSES,
};
