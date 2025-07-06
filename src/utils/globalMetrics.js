/**
 * Sistema global para acesso ao MetricsCollector
 * Permite que qualquer serviço acesse o collector sem modificar construtores
 */
class GlobalMetrics {
  constructor() {
    this.collector = null;
  }

  /**
   * Define o collector global
   */
  setCollector(collector) {
    this.collector = collector;
    console.log('📊 Collector global definido');
  }

  /**
   * Obtém o collector global
   */
  getCollector() {
    return this.collector;
  }

  /**
   * Registra evento de forma segura
   */
  async registrarEvento(usuarioId, tipoEvento, detalhes = null) {
    try {
      if (this.collector) {
        await this.collector.registrarEvento(usuarioId, tipoEvento, detalhes);
      }
    } catch (error) {
      console.error('❌ Erro ao registrar evento global:', error);
    }
  }

  /**
   * Registra métrica de sistema de forma segura
   */
  async registrarMetrica(servico, metrica, valor, detalhes = null) {
    try {
      if (this.collector) {
        await this.collector.registrarMetricaSistema(servico, metrica, valor, detalhes);
      }
    } catch (error) {
      console.error('❌ Erro ao registrar métrica global:', error);
    }
  }

  /**
   * Inicia atendimento
   */
  async iniciarAtendimento(usuarioId, tipoAtendimento, dadosConsulta = null) {
    try {
      if (this.collector) {
        return await this.collector.iniciarAtendimento(usuarioId, tipoAtendimento, dadosConsulta);
      }
    } catch (error) {
      console.error('❌ Erro ao iniciar atendimento global:', error);
    }
    return null;
  }

  /**
   * Finaliza atendimento
   */
  async finalizarAtendimento(atendimentoId, sucesso = true, erroDetalhes = null) {
    try {
      if (this.collector) {
        await this.collector.finalizarAtendimento(atendimentoId, sucesso, erroDetalhes);
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar atendimento global:', error);
    }
  }

  /**
   * Registra uso de serviço
   */
  async registrarUsoServico(usuarioId, nomeServico) {
    try {
      if (this.collector) {
        await this.collector.registrarUsoServico(usuarioId, nomeServico);
      }
    } catch (error) {
      console.error('❌ Erro ao registrar uso de serviço global:', error);
    }
  }

  /**
   * Verifica se o collector está disponível
   */
  isAvailable() {
    return this.collector !== null;
  }
}

// Instância global
const globalMetrics = new GlobalMetrics();

module.exports = { globalMetrics };
