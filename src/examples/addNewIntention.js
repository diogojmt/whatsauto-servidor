/**
 * EXEMPLO: Como adicionar novas intenções ao sistema
 * 
 * Este arquivo demonstra como estender o sistema de detecção de intenções
 * para incluir novas funcionalidades sem quebrar o código existente.
 */

const { IntentionService } = require("../services/intentionService");
const { ESTADOS } = require("../config/constants");

// Exemplo: Criar uma nova intenção para "Consulta de Alvarás"
const novaIntencaoAlvara = {
  id: "ALVARA",
  name: "Consulta de Alvarás",
  description: "Consultar alvarás de funcionamento, licenças e autorizações",
  priority: 7,
  keywords: [
    "alvara",
    "alvaras",
    "licenca",
    "licencas",
    "autorizacao",
    "funcionamento",
    "comercial",
    "sanitario",
    "bombeiros",
    "meio ambiente",
    "estabelecimento",
    "negocio",
    "loja",
    "empresa",
    "abertura",
    "renovacao",
  ],
  phrases: [
    "consultar alvará",
    "renovar licença",
    "alvará de funcionamento",
    "licença sanitária",
    "autorização comercial",
    "abertura de empresa",
  ],
  action: "initiate_alvara",
  state: "OPCAO_ALVARA", // Novo estado que seria criado
  examples: [
    "Consultar meu alvará de funcionamento",
    "Renovar licença comercial",
    "Status do alvará sanitário",
    "Autorização para funcionamento",
  ],
};

// Exemplo: Criar uma nova intenção para "Ouvidoria"
const novaIntencaoOuvidoria = {
  id: "OUVIDORIA",
  name: "Ouvidoria",
  description: "Reclamações, sugestões, elogios e denúncias",
  priority: 6,
  keywords: [
    "ouvidoria",
    "reclamacao",
    "reclamacoes",
    "sugestao",
    "sugestoes",
    "elogio",
    "elogios",
    "denuncia",
    "denuncias",
    "protocolo",
    "acompanhar",
    "status",
    "resposta",
    "retorno",
    "insatisfacao",
    "problema",
    "critica",
  ],
  phrases: [
    "fazer uma reclamação",
    "dar uma sugestão",
    "registrar elogio",
    "fazer denúncia",
    "acompanhar protocolo",
    "status da reclamação",
  ],
  action: "initiate_ouvidoria",
  state: "OPCAO_OUVIDORIA", // Novo estado que seria criado
  examples: [
    "Fazer uma reclamação",
    "Sugerir melhoria",
    "Acompanhar protocolo",
    "Registrar denúncia",
  ],
};

/**
 * Exemplo de como adicionar as novas intenções ao sistema
 */
function exemploAdicionarIntencoes() {
  const intentionService = new IntentionService();

  // Adicionar nova intenção de Alvará
  intentionService.addIntention("ALVARA", novaIntencaoAlvara);
  console.log("✅ Intenção ALVARA adicionada com sucesso!");

  // Adicionar nova intenção de Ouvidoria
  intentionService.addIntention("OUVIDORIA", novaIntencaoOuvidoria);
  console.log("✅ Intenção OUVIDORIA adicionada com sucesso!");

  // Verificar estatísticas
  const stats = intentionService.getStats();
  console.log("📊 Estatísticas atualizadas:", stats);

  return intentionService;
}

/**
 * Exemplo de como remover uma intenção
 */
function exemploRemoverIntencao() {
  const intentionService = new IntentionService();

  // Remover uma intenção (caso não seja mais necessária)
  intentionService.removeIntention("ALVARA");
  console.log("❌ Intenção ALVARA removida");

  return intentionService;
}

/**
 * Exemplo de como testar detecção de intenções
 */
function exemploTestarDeteccao() {
  const intentionService = exemploAdicionarIntencoes();

  // Mensagens de teste
  const mensagensTeste = [
    "Preciso consultar meu alvará de funcionamento",
    "Quero fazer uma reclamação",
    "Como renovar minha licença comercial?",
    "Protocolo da ouvidoria",
    "Alvará sanitário vencido",
  ];

  console.log("\n🧪 TESTANDO DETECÇÃO DE INTENÇÕES:");
  console.log("=" .repeat(50));

  mensagensTeste.forEach((mensagem, index) => {
    console.log(`\n${index + 1}. Mensagem: "${mensagem}"`);
    
    const resultado = intentionService.detectIntentions(
      mensagem,
      `teste_user_${index}`,
      "MENU_PRINCIPAL"
    );

    if (resultado.intentions.length > 0) {
      const top3 = resultado.intentions.slice(0, 3);
      console.log("   🎯 Intenções detectadas:");
      top3.forEach((intent, i) => {
        console.log(`      ${i + 1}. ${intent.intention.name} (${intent.confidence}% confiança)`);
      });
    } else {
      console.log("   ❌ Nenhuma intenção detectada");
    }
  });
}

/**
 * INSTRUÇÕES PARA USO EM PRODUÇÃO:
 * 
 * 1. ADICIONAR NOVA INTENÇÃO:
 *    - Copie a estrutura de exemplo acima
 *    - Defina palavras-chave relevantes
 *    - Crie frases de exemplo
 *    - Defina a ação e estado correspondente
 *    - Adicione no arquivo intentions.js ou dinamicamente
 * 
 * 2. INTEGRAR COM messageHandler.js:
 *    - Adicione o case da nova ação em processarAcaoIntencao()
 *    - Implemente a lógica específica da funcionalidade
 *    - Teste a integração
 * 
 * 3. CRIAR NOVOS ESTADOS (se necessário):
 *    - Adicione no constants.js
 *    - Implemente a lógica no messageHandler.js
 * 
 * 4. TESTAR:
 *    - Use este arquivo para testar detecção
 *    - Teste em diferentes contextos
 *    - Verifique se não quebra funcionalidades existentes
 */

// Exemplo de integração com messageHandler.js
const exemploIntegracaoMessageHandler = `
// Em processarAcaoIntencao() adicionar:

case "initiate_alvara":
  definirEstadoUsuario(sender, ESTADOS.OPCAO_ALVARA);
  return gerarMenuAlvara(nome);

case "initiate_ouvidoria":
  definirEstadoUsuario(sender, ESTADOS.OPCAO_OUVIDORIA);
  return gerarMenuOuvidoria(nome);
`;

// Exemplo de configuração em production
const exemploProducao = `
// No início da aplicação (index.js):
const { intentionService } = require('./src/services/intentionService');

// Adicionar intenções customizadas
intentionService.addIntention("ALVARA", configAlvara);
intentionService.addIntention("OUVIDORIA", configOuvidoria);

console.log("✅ Intenções customizadas carregadas");
`;

module.exports = {
  exemploAdicionarIntencoes,
  exemploRemoverIntencao,
  exemploTestarDeteccao,
  novaIntencaoAlvara,
  novaIntencaoOuvidoria,
  exemploIntegracaoMessageHandler,
  exemploProducao,
};

// Para executar os exemplos:
if (require.main === module) {
  console.log("🚀 EXECUTANDO EXEMPLOS DE INTENÇÕES");
  console.log("=" .repeat(50));
  
  exemploTestarDeteccao();
  
  console.log("\n✅ Exemplos executados com sucesso!");
  console.log("📖 Consulte os comentários no código para instruções detalhadas.");
}
