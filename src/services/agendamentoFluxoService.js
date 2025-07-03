const { AgendamentoService } = require('./agendamentoService');
const { obterEstadoUsuario, definirEstadoUsuario } = require('./stateService');

// Estados específicos do agendamento
const ESTADOS_AGENDAMENTO = {
  MENU_AGENDAMENTO: 'agendamento_menu',
  AGUARDANDO_SERVICO: 'agendamento_servico',
  AGUARDANDO_NOME: 'agendamento_nome',
  AGUARDANDO_TELEFONE: 'agendamento_telefone',
  AGUARDANDO_CONFIRMACAO: 'agendamento_confirmacao',
  AGUARDANDO_SELECAO_HORARIO: 'agendamento_selecao_horario'
};

// Dados temporários dos usuários
const dadosUsuarios = new Map();

class AgendamentoFluxoService {
  constructor() {
    this.agendamentoService = new AgendamentoService();
  }

  /**
   * Inicia o fluxo de agendamento
   */
  async iniciarFluxoAgendamento(sender, nomeUsuario) {
    try {
      // Verificar se a autenticação está configurada
      const authOk = await this.agendamentoService.configurarAuth();
      if (!authOk) {
        return `${nomeUsuario}, o sistema de agendamento precisa ser configurado primeiro. Entre em contato com o administrador.`;
      }

      // Consultar horários disponíveis
      const horariosDisponiveis = await this.agendamentoService.consultarHorariosDisponiveis();
      
      if (!horariosDisponiveis || horariosDisponiveis.length === 0) {
        return `${nomeUsuario}, não há horários disponíveis para agendamento nos próximos dias úteis. Tente novamente mais tarde.`;
      }

      // Salvar horários disponíveis para o usuário
      dadosUsuarios.set(sender, {
        horariosDisponiveis: horariosDisponiveis,
        etapa: 'horarios_mostrados'
      });

      definirEstadoUsuario(sender, ESTADOS_AGENDAMENTO.AGUARDANDO_SELECAO_HORARIO);

      let resposta = `${nomeUsuario}, bem-vindo ao sistema de agendamento! 📅\n\n`;
      resposta += this.agendamentoService.formatarHorariosDisponiveis(horariosDisponiveis);
      resposta += '\n\n🔄 Para voltar ao menu principal, digite *menu*';

      return resposta;
    } catch (error) {
      console.error('Erro ao iniciar fluxo de agendamento:', error);
      
      if (error.code === 'ENOENT') {
        return `${nomeUsuario}, o sistema de agendamento não está configurado. Entre em contato com o administrador para ativar esta funcionalidade.`;
      }
      
      return `${nomeUsuario}, ocorreu um erro ao carregar os horários disponíveis. Tente novamente mais tarde.`;
    }
  }

  /**
   * Processa a seleção de horário
   */
  async processarSelecaoHorario(sender, mensagem, nomeUsuario) {
    try {
      const dadosUsuario = dadosUsuarios.get(sender);
      if (!dadosUsuario) {
        return this.iniciarFluxoAgendamento(sender, nomeUsuario);
      }

      // Verificar se é comando para agendar
      const msgLimpa = mensagem.toLowerCase().trim();
      if (msgLimpa.startsWith('agendar ')) {
        const partes = msgLimpa.split(' ');
        if (partes.length >= 3) {
          const data = partes[1];
          const horario = partes[2];

          // Validar se a data e horário existem nos disponíveis
          const horarioValido = dadosUsuario.horariosDisponiveis.some(dia => 
            dia.data === data && dia.horarios.includes(horario)
          );

          if (!horarioValido) {
            return `${nomeUsuario}, este horário não está disponível. Por favor, escolha um dos horários listados acima.`;
          }

          // Salvar seleção e solicitar serviço
          dadosUsuario.dataEscolhida = data;
          dadosUsuario.horarioEscolhido = horario;
          dadosUsuario.etapa = 'horario_selecionado';

          definirEstadoUsuario(sender, ESTADOS_AGENDAMENTO.AGUARDANDO_SERVICO);

          return `${nomeUsuario}, você escolheu:\n📅 Data: ${this.formatarDataEscolhida(data)}\n⏰ Horário: ${horario}\n\n📝 Agora, por favor, informe qual serviço você deseja agendar:`;
        }
      }

      // Se não entendeu o comando, mostrar horários novamente
      return `${nomeUsuario}, por favor, use o formato: *agendar [data] [horário]*\n\nExemplo: *agendar 2025-01-15 09:30*\n\n${this.agendamentoService.formatarHorariosDisponiveis(dadosUsuario.horariosDisponiveis)}`;

    } catch (error) {
      console.error('Erro ao processar seleção de horário:', error);
      return `${nomeUsuario}, ocorreu um erro. Tente novamente.`;
    }
  }

  /**
   * Processa a informação do serviço
   */
  processarServico(sender, mensagem, nomeUsuario) {
    const dadosUsuario = dadosUsuarios.get(sender);
    if (!dadosUsuario) {
      return this.iniciarFluxoAgendamento(sender, nomeUsuario);
    }

    dadosUsuario.servico = mensagem.trim();
    dadosUsuario.etapa = 'servico_informado';

    definirEstadoUsuario(sender, ESTADOS_AGENDAMENTO.AGUARDANDO_NOME);

    return `${nomeUsuario}, obrigado! Agora, por favor, informe seu nome completo:`;
  }

  /**
   * Processa o nome completo
   */
  processarNome(sender, mensagem, nomeUsuario) {
    const dadosUsuario = dadosUsuarios.get(sender);
    if (!dadosUsuario) {
      return this.iniciarFluxoAgendamento(sender, nomeUsuario);
    }

    dadosUsuario.nomeCompleto = mensagem.trim();
    dadosUsuario.etapa = 'nome_informado';

    definirEstadoUsuario(sender, ESTADOS_AGENDAMENTO.AGUARDANDO_TELEFONE);

    return `${nomeUsuario}, por favor, informe seu telefone de contato:`;
  }

  /**
   * Processa o telefone e solicita confirmação
   */
  processarTelefone(sender, mensagem, nomeUsuario) {
    const dadosUsuario = dadosUsuarios.get(sender);
    if (!dadosUsuario) {
      return this.iniciarFluxoAgendamento(sender, nomeUsuario);
    }

    dadosUsuario.telefone = mensagem.trim();
    dadosUsuario.etapa = 'telefone_informado';

    definirEstadoUsuario(sender, ESTADOS_AGENDAMENTO.AGUARDANDO_CONFIRMACAO);

    // Gerar resumo para confirmação
    const resumo = this.gerarResumoAgendamento(dadosUsuario);
    
    return `${nomeUsuario}, por favor, confirme os dados do seu agendamento:\n\n${resumo}\n\n✅ Digite *confirmar* para agendar\n❌ Digite *cancelar* para cancelar`;
  }

  /**
   * Processa a confirmação final
   */
  async processarConfirmacao(sender, mensagem, nomeUsuario) {
    try {
      const dadosUsuario = dadosUsuarios.get(sender);
      if (!dadosUsuario) {
        return this.iniciarFluxoAgendamento(sender, nomeUsuario);
      }

      const msgLimpa = mensagem.toLowerCase().trim();

      if (msgLimpa === 'confirmar') {
        // Criar evento no Google Calendar
        const dadosAgendamento = {
          data: dadosUsuario.dataEscolhida,
          horario: dadosUsuario.horarioEscolhido,
          servico: dadosUsuario.servico,
          nomeCompleto: dadosUsuario.nomeCompleto,
          telefone: dadosUsuario.telefone
        };

        const resultado = await this.agendamentoService.criarEventoAtendimento(dadosAgendamento);

        if (resultado.success) {
          // Limpar dados temporários
          dadosUsuarios.delete(sender);
          definirEstadoUsuario(sender, 'menu_principal');

          return `${nomeUsuario}, seu agendamento foi confirmado com sucesso! ✅\n\n📅 Data: ${this.formatarDataEscolhida(dadosUsuario.dataEscolhida)}\n⏰ Horário: ${dadosUsuario.horarioEscolhido}\n📝 Serviço: ${dadosUsuario.servico}\n👤 Nome: ${dadosUsuario.nomeCompleto}\n📞 Telefone: ${dadosUsuario.telefone}\n\n📌 Guarde estas informações! Em caso de necessidade de cancelamento, entre em contato conosco.\n\n🔄 Digite *menu* para voltar ao menu principal.`;
        } else {
          return `${nomeUsuario}, ocorreu um erro ao confirmar seu agendamento. Tente novamente.`;
        }
      } else if (msgLimpa === 'cancelar') {
        // Limpar dados temporários
        dadosUsuarios.delete(sender);
        definirEstadoUsuario(sender, 'menu_principal');

        return `${nomeUsuario}, agendamento cancelado. 🔄 Digite *menu* para voltar ao menu principal.`;
      }

      return `${nomeUsuario}, por favor, digite *confirmar* para agendar ou *cancelar* para cancelar.`;

    } catch (error) {
      console.error('Erro ao processar confirmação:', error);
      return `${nomeUsuario}, ocorreu um erro ao processar sua confirmação. Tente novamente.`;
    }
  }

  /**
   * Processa mensagem baseada no estado atual
   */
  async processarMensagem(sender, mensagem, nomeUsuario) {
    const estado = obterEstadoUsuario(sender);

    switch (estado) {
      case ESTADOS_AGENDAMENTO.AGUARDANDO_SELECAO_HORARIO:
        return await this.processarSelecaoHorario(sender, mensagem, nomeUsuario);
      
      case ESTADOS_AGENDAMENTO.AGUARDANDO_SERVICO:
        return this.processarServico(sender, mensagem, nomeUsuario);
      
      case ESTADOS_AGENDAMENTO.AGUARDANDO_NOME:
        return this.processarNome(sender, mensagem, nomeUsuario);
      
      case ESTADOS_AGENDAMENTO.AGUARDANDO_TELEFONE:
        return this.processarTelefone(sender, mensagem, nomeUsuario);
      
      case ESTADOS_AGENDAMENTO.AGUARDANDO_CONFIRMACAO:
        return await this.processarConfirmacao(sender, mensagem, nomeUsuario);
      
      default:
        return await this.iniciarFluxoAgendamento(sender, nomeUsuario);
    }
  }

  /**
   * Verifica se o usuário está no fluxo de agendamento
   */
  estaNoFluxoAgendamento(sender) {
    const estado = obterEstadoUsuario(sender);
    return Object.values(ESTADOS_AGENDAMENTO).includes(estado);
  }

  /**
   * Formata data escolhida para exibição
   */
  formatarDataEscolhida(data) {
    const [ano, mes, dia] = data.split('-');
    const dataObj = new Date(ano, mes - 1, dia);
    
    const opcoes = {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    return dataObj.toLocaleDateString('pt-BR', opcoes);
  }

  /**
   * Gera resumo do agendamento para confirmação
   */
  gerarResumoAgendamento(dadosUsuario) {
    return `📅 Data: ${this.formatarDataEscolhida(dadosUsuario.dataEscolhida)}\n⏰ Horário: ${dadosUsuario.horarioEscolhido}\n📝 Serviço: ${dadosUsuario.servico}\n👤 Nome: ${dadosUsuario.nomeCompleto}\n📞 Telefone: ${dadosUsuario.telefone}`;
  }
}

module.exports = { AgendamentoFluxoService, ESTADOS_AGENDAMENTO };
