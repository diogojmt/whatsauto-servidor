/**
 * Testes para o sistema de detecção de intenções
 * 
 * Para executar: node src/tests/intentionService.test.js
 */

const { IntentionService } = require("../services/intentionService");
const { ESTADOS } = require("../config/constants");

class IntentionTester {
  constructor() {
    this.intentionService = new IntentionService();
    this.passedTests = 0;
    this.totalTests = 0;
  }

  /**
   * Executa um teste
   */
  test(name, testFunction) {
    this.totalTests++;
    console.log(`\n🧪 Teste: ${name}`);
    
    try {
      const result = testFunction();
      if (result) {
        this.passedTests++;
        console.log("   ✅ PASSOU");
      } else {
        console.log("   ❌ FALHOU");
      }
    } catch (error) {
      console.log("   ❌ ERRO:", error.message);
    }
  }

  /**
   * Testa detecção de intenção única
   */
  testSingleIntentionDetection() {
    return this.test("Detecção de intenção única - débitos", () => {
      const result = this.intentionService.detectIntentions(
        "Preciso da segunda via do meu IPTU",
        "test_user_1",
        ESTADOS.MENU_PRINCIPAL
      );

      const hasDebitosIntention = result.intentions.some(i => i.id === "DEBITOS");
      const highConfidence = result.confidence > 50;

      console.log(`     Confiança: ${result.confidence}%`);
      console.log(`     Intenções: ${result.intentions.map(i => i.id).join(", ")}`);

      return hasDebitosIntention && highConfidence;
    });
  }

  /**
   * Testa detecção de múltiplas intenções
   */
  testMultipleIntentionsDetection() {
    return this.test("Detecção de múltiplas intenções", () => {
      const result = this.intentionService.detectIntentions(
        "Quero consultar débitos ou emitir certidão",
        "test_user_2",
        ESTADOS.MENU_PRINCIPAL
      );

      const hasMultipleIntentions = result.intentions.length > 1;
      const hasDebitos = result.intentions.some(i => i.id === "DEBITOS");
      const hasCertidoes = result.intentions.some(i => i.id === "CERTIDOES");

      console.log(`     Intenções detectadas: ${result.intentions.length}`);
      console.log(`     IDs: ${result.intentions.map(i => i.id).slice(0, 3).join(", ")}`);

      return hasMultipleIntentions && hasDebitos && hasCertidoes;
    });
  }

  /**
   * Testa detecção contextual
   */
  testContextualDetection() {
    return this.test("Detecção contextual - mudança de assunto", () => {
      const result = this.intentionService.detectIntentions(
        "Na verdade quero agendar um atendimento",
        "test_user_3",
        ESTADOS.DEBITOS_ATIVO
      );

      const context = result.context;
      const hasAgendamento = result.intentions.some(i => i.id === "AGENDAMENTO");

      console.log(`     Mudança de assunto: ${context.isChangingTopic}`);
      console.log(`     Intenção agendamento: ${hasAgendamento}`);

      return context.isChangingTopic && hasAgendamento;
    });
  }

  /**
   * Testa processamento de intenções
   */
  testIntentionProcessing() {
    return this.test("Processamento de intenção única", () => {
      const detectionResult = this.intentionService.detectIntentions(
        "Quero emitir uma certidão negativa",
        "test_user_4",
        ESTADOS.MENU_PRINCIPAL
      );

      const response = this.intentionService.processIntentions(
        detectionResult,
        "test_user_4",
        "João"
      );

      const hasResponse = response !== null;
      const correctAction = response?.action === "initiate_certidoes";

      console.log(`     Tem resposta: ${hasResponse}`);
      console.log(`     Ação: ${response?.action}`);
      console.log(`     Tipo: ${response?.type}`);

      return hasResponse && correctAction;
    });
  }

  /**
   * Testa adição de nova intenção
   */
  testAddNewIntention() {
    return this.test("Adicionar nova intenção", () => {
      const novaIntencao = {
        id: "TESTE",
        name: "Teste",
        description: "Intenção de teste",
        priority: 5,
        keywords: ["teste", "testing"],
        phrases: ["quero testar"],
        action: "test_action",
        state: "TEST_STATE",
        examples: ["Testar sistema"],
      };

      this.intentionService.addIntention("TESTE", novaIntencao);

      const result = this.intentionService.detectIntentions(
        "Quero testar o sistema",
        "test_user_5",
        ESTADOS.MENU_PRINCIPAL
      );

      const hasTestIntention = result.intentions.some(i => i.id === "TESTE");

      console.log(`     Intenção teste detectada: ${hasTestIntention}`);

      // Limpar
      this.intentionService.removeIntention("TESTE");

      return hasTestIntention;
    });
  }

  /**
   * Testa histórico de usuário
   */
  testUserHistory() {
    return this.test("Histórico de usuário", () => {
      const userId = "test_user_6";

      // Primeira interação
      this.intentionService.updateUserHistory(userId, "DEBITOS");
      this.intentionService.updateUserHistory(userId, "CERTIDOES");

      const history = this.intentionService.getUserHistory(userId);
      const hasHistory = history.length > 0;
      const correctOrder = history[0] === "CERTIDOES"; // Último deve ser primeiro

      console.log(`     Histórico: ${history.join(", ")}`);

      // Limpar
      this.intentionService.clearUserHistory(userId);

      return hasHistory && correctOrder;
    });
  }

  /**
   * Testa detecção de cancelamento
   */
  testCancellationDetection() {
    return this.test("Detecção de cancelamento", () => {
      const result = this.intentionService.detectIntentions(
        "Não, quero voltar ao menu",
        "test_user_7",
        ESTADOS.DEBITOS_ATIVO
      );

      const context = result.context;
      const isCanceling = context.isCanceling;

      console.log(`     Cancelando: ${isCanceling}`);
      console.log(`     Ação sugerida: ${context.suggestedAction}`);

      return isCanceling && context.suggestedAction === "return_to_menu";
    });
  }

  /**
   * Testa confiança baixa
   */
  testLowConfidence() {
    return this.test("Mensagem com confiança baixa", () => {
      const result = this.intentionService.detectIntentions(
        "oi",
        "test_user_8",
        ESTADOS.MENU_PRINCIPAL
      );

      const lowConfidence = result.confidence < 30;

      console.log(`     Confiança: ${result.confidence}%`);

      return lowConfidence;
    });
  }

  /**
   * Testa estatísticas
   */
  testStats() {
    return this.test("Estatísticas do serviço", () => {
      const stats = this.intentionService.getStats();

      const hasIntentions = stats.totalIntentions > 0;
      const hasStructure = stats.hasOwnProperty("activeUsers");

      console.log(`     Total intenções: ${stats.totalIntentions}`);
      console.log(`     Usuários ativos: ${stats.activeUsers}`);

      return hasIntentions && hasStructure;
    });
  }

  /**
   * Executa todos os testes
   */
  runAllTests() {
    console.log("🧪 EXECUTANDO TESTES DO SISTEMA DE INTENÇÕES");
    console.log("=" .repeat(60));

    this.testSingleIntentionDetection();
    this.testMultipleIntentionsDetection();
    this.testContextualDetection();
    this.testIntentionProcessing();
    this.testAddNewIntention();
    this.testUserHistory();
    this.testCancellationDetection();
    this.testLowConfidence();
    this.testStats();

    console.log("\n" + "=" .repeat(60));
    console.log(`📊 RESULTADO: ${this.passedTests}/${this.totalTests} testes passaram`);
    
    if (this.passedTests === this.totalTests) {
      console.log("🎉 TODOS OS TESTES PASSARAM!");
    } else {
      console.log(`⚠️  ${this.totalTests - this.passedTests} teste(s) falharam`);
    }

    return this.passedTests === this.totalTests;
  }
}

/**
 * Testes específicos para casos de uso reais
 */
function testesCasosDeUso() {
  console.log("\n🎯 TESTES DE CASOS DE USO REAIS");
  console.log("=" .repeat(50));

  const intentionService = new IntentionService();

  const casosDeUso = [
    {
      situacao: "Usuário no menu principal pede débitos",
      mensagem: "Preciso pagar IPTU",
      estadoAtual: ESTADOS.MENU_PRINCIPAL,
      esperado: "DEBITOS",
    },
    {
      situacao: "Usuário em débitos quer certidão",
      mensagem: "Na verdade preciso de certidão",
      estadoAtual: ESTADOS.DEBITOS_ATIVO,
      esperado: "CERTIDOES",
    },
    {
      situacao: "Usuário quer falar com atendente",
      mensagem: "Quero falar com uma pessoa",
      estadoAtual: ESTADOS.CONSULTA_ISS,
      esperado: "ATENDENTE",
    },
    {
      situacao: "Usuário quer agendar horário",
      mensagem: "Posso marcar um horário?",
      estadoAtual: ESTADOS.MENU_PRINCIPAL,
      esperado: "AGENDAMENTO",
    },
    {
      situacao: "Usuário com mensagem ambígua",
      mensagem: "Oi, tudo bem?",
      estadoAtual: ESTADOS.MENU_PRINCIPAL,
      esperado: null, // Baixa confiança
    },
  ];

  casosDeUso.forEach((caso, index) => {
    console.log(`\n${index + 1}. ${caso.situacao}`);
    console.log(`   Mensagem: "${caso.mensagem}"`);
    console.log(`   Estado: ${caso.estadoAtual}`);

    const result = intentionService.detectIntentions(
      caso.mensagem,
      `caso_uso_${index}`,
      caso.estadoAtual
    );

    const topIntention = result.intentions[0];
    const detectedId = topIntention?.id;

    if (caso.esperado === null) {
      const lowConfidence = result.confidence < 30;
      console.log(`   ✅ Baixa confiança: ${result.confidence}% ${lowConfidence ? "✓" : "✗"}`);
    } else {
      const match = detectedId === caso.esperado;
      console.log(`   Detectado: ${detectedId} (${result.confidence}%)`);
      console.log(`   Esperado: ${caso.esperado}`);
      console.log(`   ${match ? "✅" : "❌"} ${match ? "CORRETO" : "INCORRETO"}`);
    }
  });
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new IntentionTester();
  const allPassed = tester.runAllTests();
  
  testesCasosDeUso();
  
  console.log("\n🏁 TESTES FINALIZADOS");
  process.exit(allPassed ? 0 : 1);
}

module.exports = { IntentionTester, testesCasosDeUso };
