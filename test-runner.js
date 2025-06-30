#!/usr/bin/env node

/**
 * Script automatizado para executar testes do WhatsAuto Servidor
 * Execute: node test-runner.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class TestRunner {
  constructor() {
    this.results = [];
    this.currentUser = 0;
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 ${name}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await testFn();
      this.results.push({ name, status: 'PASS', result });
      console.log(`✅ PASSOU: ${name}`);
      return result;
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ FALHOU: ${name}`);
      console.log(`   Erro: ${error.message}`);
      return null;
    }
  }

  getUniqueUser() {
    return `TestUser${++this.currentUser}`;
  }

  async sendMessage(sender, message) {
    const response = await axios.post(BASE_URL, 
      `sender=${encodeURIComponent(sender)}&message=${encodeURIComponent(message)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data;
  }

  async testHealthCheck() {
    const response = await axios.get(`${BASE_URL}/`);
    if (!response.data.includes('ativo')) {
      throw new Error('Health check falhou');
    }
    return 'Servidor ativo';
  }

  async testStatus() {
    const response = await axios.get(`${BASE_URL}/status`);
    const data = response.data;
    
    if (!data.features?.emissaoCertidoes) {
      throw new Error('Feature emissaoCertidoes não encontrada');
    }
    
    return `Status OK - ${data.dadosTFLF} TFLF, ${data.dadosISS} ISS`;
  }

  async testMenuPrincipal() {
    const user = this.getUniqueUser();
    const response = await this.sendMessage(user, 'menu');
    
    if (!response.reply.includes('1') || !response.reply.includes('2')) {
      throw new Error('Menu principal não exibiu opções');
    }
    
    return 'Menu principal OK';
  }

  async testFluxoCertidao() {
    const user = this.getUniqueUser();
    
    // 1. Menu
    await this.sendMessage(user, 'menu');
    
    // 2. Opção 2 (Certidões)
    const resp2 = await this.sendMessage(user, '2');
    
    if (!resp2.reply.includes('tipo de contribuinte')) {
      throw new Error('Fluxo de certidão não iniciou');
    }
    
    return 'Fluxo de certidão iniciado';
  }

  async testTipoContribuinte() {
    const user = this.getUniqueUser();
    
    // Preparar estado
    await this.sendMessage(user, 'menu');
    await this.sendMessage(user, '2');
    
    // Testar tipo
    const resp = await this.sendMessage(user, '1');
    
    if (!resp.reply.includes('CPF/CNPJ')) {
      throw new Error('Seleção de tipo não funcionou');
    }
    
    return 'Tipo contribuinte OK';
  }

  async testCpfValidacao() {
    const user = this.getUniqueUser();
    
    // Preparar estado
    await this.sendMessage(user, 'menu');
    await this.sendMessage(user, '2');
    await this.sendMessage(user, '1');
    
    // Testar CPF inválido
    const resp = await this.sendMessage(user, '123');
    
    if (!resp.reply.includes('11 dígitos') && !resp.reply.includes('14 dígitos')) {
      throw new Error('Validação de CPF não funcionou');
    }
    
    return 'Validação CPF OK';
  }

  async testConsultaApi() {
    try {
      const response = await axios.get(`${BASE_URL}/test-cpf/12345678901`);
      const data = response.data;
      
      if (data.resultado.sucesso) {
        return `API consulta OK - ${data.resultado.inscricoes.length} inscrições`;
      } else {
        return `API consulta LIMITADA - ${data.resultado.erro}`;
      }
    } catch (error) {
      return `API consulta ERRO - ${error.message}`;
    }
  }

  async testFluxoCompleto() {
    const user = this.getUniqueUser();
    
    try {
      // Fluxo completo
      await this.sendMessage(user, 'menu');
      await this.sendMessage(user, '2');
      await this.sendMessage(user, '1');
      const respCpf = await this.sendMessage(user, '03718472490');
      
      // Verificar se emitiu automaticamente ou pediu inscrição
      if (respCpf.reply.includes('Certidão emitida')) {
        return 'Emissão automática funcionou!';
      } else if (respCpf.reply.includes('inscrição municipal')) {
        // Continuar com inscrição manual
        const respInsc = await this.sendMessage(user, '113436');
        
        if (respInsc.reply.includes('Certidão emitida') || respInsc.reply.includes('https://')) {
          return 'Emissão manual funcionou!';
        } else {
          throw new Error('Emissão falhou');
        }
      } else if (respCpf.reply.includes('selecione qual inscrição')) {
        // Múltiplas inscrições - selecionar a primeira
        const respSel = await this.sendMessage(user, '1');
        
        if (respSel.reply.includes('Certidão emitida')) {
          return 'Seleção múltiplas inscrições funcionou!';
        } else {
          throw new Error('Seleção de inscrição falhou');
        }
      } else {
        throw new Error(`Resposta inesperada: ${respCpf.reply.substring(0, 100)}...`);
      }
    } catch (error) {
      throw new Error(`Fluxo completo falhou: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🚀 INICIANDO TESTES DO WHATSAUTO SERVIDOR');
    console.log('='.repeat(50));

    // Testes básicos
    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Status Endpoint', () => this.testStatus());
    await this.runTest('Menu Principal', () => this.testMenuPrincipal());
    
    await delay(500);
    
    // Testes de fluxo
    await this.runTest('Fluxo Certidão', () => this.testFluxoCertidao());
    await this.runTest('Tipo Contribuinte', () => this.testTipoContribuinte());
    await this.runTest('Validação CPF', () => this.testCpfValidacao());
    
    await delay(500);
    
    // Testes avançados
    await this.runTest('Consulta API Ábaco', () => this.testConsultaApi());
    await this.runTest('Fluxo Completo', () => this.testFluxoCompleto());

    // Relatório final
    this.printReport();
  }

  printReport() {
    console.log('\n📊 RELATÓRIO DE TESTES');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    console.log(`📈 Taxa de sucesso: ${(passed / this.results.length * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ TESTES QUE FALHARAM:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • ${r.name}: ${r.error}`));
    }
    
    console.log('\n🎯 FUNCIONALIDADES TESTADAS:');
    this.results.forEach(r => {
      const status = r.status === 'PASS' ? '✅' : '❌';
      const result = r.result || r.error;
      console.log(`   ${status} ${r.name}: ${result}`);
    });
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;
