const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

// Configurações do agendamento
const AGENDA_CONFIG = {
  CALENDAR_ID: "primary", // ou o ID específico da agenda
  HORARIO_INICIO: 9, // 9h
  HORARIO_FIM: 13, // 13h
  DURACAO_ATENDIMENTO: 30, // minutos
  DIAS_ANTECEDENCIA: 14, // mostrar próximos 14 dias
  TIMEZONE: "America/Maceio", // GMT-3
  DIAS_UTEIS: [1, 2, 3, 4, 5], // Segunda a sexta
};

// Estados possíveis do usuário
const ESTADOS_USUARIO = {
  MENU_PRINCIPAL: "menu_principal",
  VISUALIZANDO_HORARIOS: "visualizando_horarios",
  AGENDANDO: "agendando",
  CONFIRMANDO: "confirmando",
};

// Caminhos dos arquivos - Priorizar diretório seguro do Replit
const REPLIT_WORKSPACE = "/home/runner/workspace";
const CREDENTIALS_FILENAME =
  "client_secret_223567033178-kcji8j786j0t8odqtc7f5lqu5s8b11mr.apps.googleusercontent.com.json";

const CREDENTIALS_PATH = fs.existsSync(
  path.join(REPLIT_WORKSPACE, CREDENTIALS_FILENAME)
)
  ? path.join(REPLIT_WORKSPACE, CREDENTIALS_FILENAME)
  : path.join(process.cwd(), CREDENTIALS_FILENAME);

const TOKEN_PATH = fs.existsSync(REPLIT_WORKSPACE)
  ? path.join(REPLIT_WORKSPACE, "token.json")
  : path.join(process.cwd(), "token.json");

/**
 * Gerencia estado do usuário
 */
class EstadoUsuario {
  constructor() {
    this.estados = new Map(); // userId -> estado
  }

  definirEstado(userId, estado, dados = {}) {
    this.estados.set(userId, { estado, dados, timestamp: Date.now() });
  }

  obterEstado(userId) {
    return (
      this.estados.get(userId) || { estado: ESTADOS_USUARIO.MENU_PRINCIPAL }
    );
  }

  limparEstado(userId) {
    this.estados.delete(userId);
  }

  // Limpar estados antigos (mais de 1 hora)
  limparEstadosAntigos() {
    const agora = Date.now();
    const umaHora = 60 * 60 * 1000;

    for (const [userId, dadosEstado] of this.estados.entries()) {
      if (agora - dadosEstado.timestamp > umaHora) {
        this.estados.delete(userId);
      }
    }
  }
}

class AgendamentoService {
  constructor() {
    this.auth = null;
    this.calendar = null;
    this.estadoUsuario = new EstadoUsuario();

    // Limpar estados antigos a cada 30 minutos
    setInterval(() => {
      this.estadoUsuario.limparEstadosAntigos();
    }, 30 * 60 * 1000);
  }

  /**
   * Configura a autenticação OAuth2
   */
  async configurarAuth() {
    try {
      // Verificar se arquivo de credenciais existe
      if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error(
          "Arquivo de credenciais não encontrado:",
          CREDENTIALS_PATH
        );
        return false;
      }

      // Carregar credenciais
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
      const { client_secret, client_id, redirect_uris } = credentials.installed;

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Tentar carregar token existente
      try {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
        oAuth2Client.setCredentials(token);
        this.auth = oAuth2Client;
        this.calendar = google.calendar({ version: "v3", auth: oAuth2Client });
        return true;
      } catch (error) {
        console.log("Token não encontrado, será necessário autenticar");
        return false;
      }
    } catch (error) {
      console.error("Erro ao configurar autenticação:", error);
      throw error;
    }
  }

  /**
   * Gera URL de autorização para primeiro acesso
   */
  gerarUrlAutorizacao() {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
    });

    return authUrl;
  }

  /**
   * Salva o token de acesso
   */
  async salvarToken(code) {
    try {
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
      const { client_secret, client_id, redirect_uris } = credentials.installed;

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      // Salvar token para uso futuro
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

      this.auth = oAuth2Client;
      this.calendar = google.calendar({ version: "v3", auth: oAuth2Client });

      return true;
    } catch (error) {
      console.error("Erro ao salvar token:", error);
      throw error;
    }
  }

  /**
   * Verifica se uma data é dia útil
   */
  ehDiaUtil(data) {
    const diaSemana = data.getDay();
    return AGENDA_CONFIG.DIAS_UTEIS.includes(diaSemana);
  }

  /**
   * Valida agendamento
   */
  validarAgendamento(data, horario) {
    const agora = new Date();
    const [ano, mes, dia] = data.split("-").map(Number);
    const [hora, minuto] = horario.split(":").map(Number);

    // Validar formato da data
    if (
      isNaN(ano) ||
      isNaN(mes) ||
      isNaN(dia) ||
      mes < 1 ||
      mes > 12 ||
      dia < 1 ||
      dia > 31
    ) {
      throw new Error("Formato de data inválido. Use: AAAA-MM-DD");
    }

    // Validar formato do horário
    if (
      isNaN(hora) ||
      isNaN(minuto) ||
      hora < 0 ||
      hora > 23 ||
      minuto < 0 ||
      minuto > 59
    ) {
      throw new Error("Formato de horário inválido. Use: HH:MM");
    }

    const dataAgendamento = new Date(ano, mes - 1, dia, hora, minuto);

    // Verificar se não é data passada
    if (dataAgendamento <= agora) {
      throw new Error("❌ Não é possível agendar para data/horário passado");
    }

    // Verificar se é dia útil
    if (!this.ehDiaUtil(dataAgendamento)) {
      throw new Error(
        "❌ Agendamento disponível apenas em dias úteis (Segunda a Sexta)"
      );
    }

    // Verificar se está dentro do horário de funcionamento
    if (
      hora < AGENDA_CONFIG.HORARIO_INICIO ||
      hora >= AGENDA_CONFIG.HORARIO_FIM
    ) {
      throw new Error(
        `❌ Horário deve estar entre ${AGENDA_CONFIG.HORARIO_INICIO}h e ${AGENDA_CONFIG.HORARIO_FIM}h`
      );
    }

    // Verificar se está dentro da antecedência permitida
    const diasDiferenca = Math.ceil(
      (dataAgendamento - agora) / (1000 * 60 * 60 * 24)
    );
    if (diasDiferenca > AGENDA_CONFIG.DIAS_ANTECEDENCIA) {
      throw new Error(
        `❌ Agendamento permitido apenas para os próximos ${AGENDA_CONFIG.DIAS_ANTECEDENCIA} dias`
      );
    }

    return true;
  }

  /**
   * Gera lista de horários do dia
   */
  gerarHorariosDia() {
    const horarios = [];
    const inicio = AGENDA_CONFIG.HORARIO_INICIO;
    const fim = AGENDA_CONFIG.HORARIO_FIM;
    const duracao = AGENDA_CONFIG.DURACAO_ATENDIMENTO;

    for (let hora = inicio; hora < fim; hora++) {
      for (let minuto = 0; minuto < 60; minuto += duracao) {
        const horario = `${hora.toString().padStart(2, "0")}:${minuto
          .toString()
          .padStart(2, "0")}`;
        horarios.push(horario);
      }
    }

    return horarios;
  }

  /**
   * Consulta eventos existentes no período
   */
  async consultarEventos(dataInicio, dataFim) {
    try {
      if (!this.calendar) {
        const authConfigured = await this.configurarAuth();
        if (!authConfigured) {
          throw new Error("Falha na autenticação com Google Calendar");
        }
      }

      const response = await this.calendar.events.list({
        calendarId: AGENDA_CONFIG.CALENDAR_ID,
        timeMin: dataInicio.toISOString(),
        timeMax: dataFim.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      return response.data.items || [];
    } catch (error) {
      console.error("Erro ao consultar eventos:", error);
      throw error;
    }
  }

  /**
   * Consulta horários disponíveis nos próximos dias úteis
   */
  async consultarHorariosDisponiveis(
    diasAntecedencia = AGENDA_CONFIG.DIAS_ANTECEDENCIA
  ) {
    try {
      const horariosDisponiveis = [];
      const hoje = new Date();
      const horariosBase = this.gerarHorariosDia();

      // Percorrer os próximos dias
      for (let i = 1; i <= diasAntecedencia; i++) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() + i);

        // Verificar se é dia útil
        if (!this.ehDiaUtil(data)) {
          continue;
        }

        // Definir início e fim do dia
        const iniciodia = new Date(data);
        iniciodia.setHours(0, 0, 0, 0);

        const fimDia = new Date(data);
        fimDia.setHours(23, 59, 59, 999);

        // Consultar eventos do dia
        const eventos = await this.consultarEventos(iniciodia, fimDia);

        // Verificar quais horários estão livres
        const horariosLivres = [];

        for (const horario of horariosBase) {
          const [hora, minuto] = horario.split(":").map(Number);
          const dataHorario = new Date(data);
          dataHorario.setHours(hora, minuto, 0, 0);

          // Verificar se o horário não conflita com eventos existentes
          const temConflito = eventos.some((evento) => {
            if (!evento.start || !evento.end) return false;

            const inicioEvento = new Date(
              evento.start.dateTime || evento.start.date
            );
            const fimEvento = new Date(evento.end.dateTime || evento.end.date);

            return dataHorario >= inicioEvento && dataHorario < fimEvento;
          });

          if (!temConflito) {
            horariosLivres.push(horario);
          }
        }

        if (horariosLivres.length > 0) {
          horariosDisponiveis.push({
            data: data.toISOString().split("T")[0],
            dataFormatada: this.formatarData(data),
            diaSemana: this.obterDiaSemana(data),
            horarios: horariosLivres,
          });
        }
      }

      return horariosDisponiveis;
    } catch (error) {
      console.error("Erro ao consultar horários disponíveis:", error);
      throw error;
    }
  }

  /**
   * Cria um novo evento de atendimento
   */
  async criarEventoAtendimento(dadosAgendamento) {
    try {
      if (!this.calendar) {
        const authConfigured = await this.configurarAuth();
        if (!authConfigured) {
          throw new Error("Falha na autenticação com Google Calendar");
        }
      }

      const { data, horario, servico, nomeCompleto, telefone } =
        dadosAgendamento;

      // Validar agendamento
      this.validarAgendamento(data, horario);

      // Parsing da data e horário
      const [ano, mes, dia] = data.split("-").map(Number);
      const [hora, minuto] = horario.split(":").map(Number);

      const dataInicio = new Date(ano, mes - 1, dia, hora, minuto);
      const dataFim = new Date(dataInicio);
      dataFim.setMinutes(
        dataFim.getMinutes() + AGENDA_CONFIG.DURACAO_ATENDIMENTO
      );

      // Verificar se o horário ainda está disponível
      const eventos = await this.consultarEventos(dataInicio, dataFim);
      const temConflito = eventos.some((evento) => {
        if (!evento.start || !evento.end) return false;

        const inicioEvento = new Date(
          evento.start.dateTime || evento.start.date
        );
        const fimEvento = new Date(evento.end.dateTime || evento.end.date);

        return dataInicio >= inicioEvento && dataInicio < fimEvento;
      });

      if (temConflito) {
        throw new Error("❌ Horário não está mais disponível");
      }

      // Criar evento
      const evento = {
        summary: `Atendimento - ${servico}`,
        description: `Serviço: ${servico}\nNome: ${nomeCompleto}\nTelefone: ${telefone}`,
        start: {
          dateTime: dataInicio.toISOString(),
          timeZone: AGENDA_CONFIG.TIMEZONE,
        },
        end: {
          dateTime: dataFim.toISOString(),
          timeZone: AGENDA_CONFIG.TIMEZONE,
        },
        attendees: [
          {
            email: "atende.smfaz.arapiraca@gmail.com",
          },
        ],
      };

      const response = await this.calendar.events.insert({
        calendarId: AGENDA_CONFIG.CALENDAR_ID,
        resource: evento,
      });

      return {
        success: true,
        eventoId: response.data.id,
        dados: {
          data: this.formatarData(dataInicio),
          horario: horario,
          servico: servico,
          nomeCompleto: nomeCompleto,
          telefone: telefone,
        },
      };
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      throw error;
    }
  }

  /**
   * Cancela um evento
   */
  async cancelarEvento(eventoId) {
    try {
      if (!this.calendar) {
        const authConfigured = await this.configurarAuth();
        if (!authConfigured) {
          throw new Error("Falha na autenticação com Google Calendar");
        }
      }

      await this.calendar.events.delete({
        calendarId: AGENDA_CONFIG.CALENDAR_ID,
        eventId: eventoId,
      });

      return { success: true };
    } catch (error) {
      console.error("Erro ao cancelar evento:", error);
      throw error;
    }
  }

  /**
   * Formata data para exibição
   */
  formatarData(data) {
    const opcoes = {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    return data.toLocaleDateString("pt-BR", opcoes);
  }

  /**
   * Obtém dia da semana
   */
  obterDiaSemana(data) {
    const dias = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    return dias[data.getDay()];
  }

  /**
   * Retorna lista de comandos disponíveis
   */
  obterComandosDisponiveis() {
    return {
      menu: "Voltar ao menu principal",
      horarios: "Ver horários disponíveis",
      "agendar [data] [horário]": "Fazer um agendamento",
      "meus agendamentos": "Ver seus agendamentos",
      "cancelar [id]": "Cancelar agendamento",
      ajuda: "Ver esta lista de comandos",
    };
  }

  /**
   * Formata menu de ajuda
   */
  formatarMenuAjuda() {
    const comandos = this.obterComandosDisponiveis();
    let resposta = "❓ *Comandos Disponíveis:*\n\n";

    Object.entries(comandos).forEach(([comando, descricao]) => {
      resposta += `🔸 *${comando}*\n   ${descricao}\n\n`;
    });

    resposta += "💡 *Dica:* Os comandos não são case-sensitive\n\n";
    resposta += "🔙 Digite *menu* para voltar ao menu principal";

    return resposta;
  }

  /**
   * Formata resposta com opções de navegação
   */
  formatarRespostaComNavegacao(conteudo, opcoes = {}) {
    let resposta = conteudo;

    if (opcoes.incluirMenu !== false) {
      resposta += "\n\n🔙 Digite *menu* para voltar ao menu principal";
    }

    if (opcoes.incluirAjuda) {
      resposta += "\n❓ Digite *ajuda* para ver comandos disponíveis";
    }

    if (opcoes.incluirAtualizar) {
      resposta += "\n🔄 Digite *horarios* para atualizar a lista";
    }

    return resposta;
  }

  /**
   * Formata lista de horários disponíveis para resposta
   */
  formatarHorariosDisponiveis(horariosDisponiveis) {
    if (!horariosDisponiveis || horariosDisponiveis.length === 0) {
      const conteudo =
        "❌ Não há horários disponíveis nos próximos dias úteis.";
      return this.formatarRespostaComNavegacao(conteudo);
    }

    let conteudo = "🗓️ *Horários Disponíveis para Agendamento*\n\n";

    horariosDisponiveis.forEach((dia, index) => {
      const dataFormatada = `${dia.diaSemana}, ${dia.data
        .split("-")
        .reverse()
        .join("/")}`;
      conteudo += `📅 *${dataFormatada}*\n`;
      conteudo += `⏰ ${dia.horarios.join(" | ")}\n\n`;
    });

    conteudo += "💡 *Para agendar:*\n";
    conteudo += "📝 Digite: `agendar [data] [horário]`\n";
    conteudo += "📋 Exemplo: `agendar 2025-01-15 09:30`";

    return this.formatarRespostaComNavegacao(conteudo, {
      incluirAjuda: true,
      incluirAtualizar: true,
    });
  }

  /**
   * Formata confirmação de agendamento
   */
  formatarConfirmacaoAgendamento(dadosAgendamento) {
    const { dados } = dadosAgendamento;

    let resposta = "✅ *Agendamento Confirmado!*\n\n";
    resposta += `📅 *Data:* ${dados.data}\n`;
    resposta += `⏰ *Horário:* ${dados.horario}\n`;
    resposta += `🔧 *Serviço:* ${dados.servico}\n`;
    resposta += `👤 *Nome:* ${dados.nomeCompleto}\n`;
    resposta += `📱 *Telefone:* ${dados.telefone}\n\n`;
    resposta += "📧 Você receberá um e-mail de confirmação em breve.\n";
    resposta += "⚠️ *Importante:* Chegue com 10 minutos de antecedência.";

    return this.formatarRespostaComNavegacao(resposta);
  }

  /**
   * Formata erro de agendamento
   */
  formatarErroAgendamento(erro) {
    let resposta = "❌ *Erro no Agendamento*\n\n";
    resposta += `${erro.message}\n\n`;
    resposta += "💡 *Dicas:*\n";
    resposta += "• Verifique o formato da data (AAAA-MM-DD)\n";
    resposta += "• Verifique o formato do horário (HH:MM)\n";
    resposta += "• Consulte os horários disponíveis digitando *horarios*";

    return this.formatarRespostaComNavegacao(resposta, {
      incluirAjuda: true,
      incluirAtualizar: true,
    });
  }

  /**
   * Gerencia estados do usuário
   */
  definirEstadoUsuario(userId, estado, dados = {}) {
    this.estadoUsuario.definirEstado(userId, estado, dados);
  }

  /**
   * Obtém estado atual do usuário
   */
  obterEstadoUsuario(userId) {
    return this.estadoUsuario.obterEstado(userId);
  }

  /**
   * Limpa estado do usuário
   */
  limparEstadoUsuario(userId) {
    this.estadoUsuario.limparEstado(userId);
  }

  /**
   * Processa comando do usuário baseado no estado atual
   */
  async processarComando(userId, comando, dadosAdicionais = {}) {
    try {
      const estadoAtual = this.obterEstadoUsuario(userId);
      const comandoLower = comando.toLowerCase().trim();

      // Comandos globais que funcionam em qualquer estado
      if (comandoLower === "menu") {
        this.limparEstadoUsuario(userId);
        return this.formatarRespostaComNavegacao(
          "🏠 *Menu Principal*\n\nDigite um dos comandos disponíveis:",
          {
            incluirAjuda: true,
            incluirMenu: false,
          }
        );
      }

      if (comandoLower === "ajuda") {
        return this.formatarMenuAjuda();
      }

      if (comandoLower === "horarios") {
        this.definirEstadoUsuario(
          userId,
          ESTADOS_USUARIO.VISUALIZANDO_HORARIOS
        );
        const horarios = await this.consultarHorariosDisponiveis();
        return this.formatarHorariosDisponiveis(horarios);
      }

      // Processar comando de agendamento
      if (comandoLower.startsWith("agendar ")) {
        return await this.processarComandoAgendamento(
          userId,
          comando,
          dadosAdicionais
        );
      }

      // Estado específico: visualizando horários
      if (estadoAtual.estado === ESTADOS_USUARIO.VISUALIZANDO_HORARIOS) {
        if (comandoLower.startsWith("agendar ")) {
          return await this.processarComandoAgendamento(
            userId,
            comando,
            dadosAdicionais
          );
        }
      }

      // Comando não reconhecido
      return this.formatarRespostaComNavegacao(
        "❓ Comando não reconhecido.\n\nDigite *ajuda* para ver os comandos disponíveis.",
        { incluirAjuda: true }
      );
    } catch (error) {
      console.error("Erro ao processar comando:", error);
      return this.formatarErroAgendamento(error);
    }
  }

  /**
   * Processa comando específico de agendamento
   */
  async processarComandoAgendamento(userId, comando, dadosAdicionais) {
    try {
      // Extrair data e horário do comando
      const partes = comando.split(" ");
      if (partes.length < 3) {
        throw new Error("Formato incorreto. Use: agendar AAAA-MM-DD HH:MM");
      }

      const data = partes[1];
      const horario = partes[2];

      // Validar dados obrigatórios
      if (
        !dadosAdicionais.servico ||
        !dadosAdicionais.nomeCompleto ||
        !dadosAdicionais.telefone
      ) {
        throw new Error(
          "Dados incompletos. Informe: serviço, nome completo e telefone"
        );
      }

      // Criar agendamento
      const dadosAgendamento = {
        data,
        horario,
        servico: dadosAdicionais.servico,
        nomeCompleto: dadosAdicionais.nomeCompleto,
        telefone: dadosAdicionais.telefone,
      };

      const resultado = await this.criarEventoAtendimento(dadosAgendamento);

      if (resultado.success) {
        this.limparEstadoUsuario(userId);
        return this.formatarConfirmacaoAgendamento(resultado);
      } else {
        throw new Error("Falha ao criar agendamento");
      }
    } catch (error) {
      return this.formatarErroAgendamento(error);
    }
  }

  /**
   * Busca agendamentos do usuário por telefone
   */
  async buscarAgendamentosUsuario(telefone) {
    try {
      if (!this.calendar) {
        const authConfigured = await this.configurarAuth();
        if (!authConfigured) {
          throw new Error("Falha na autenticação com Google Calendar");
        }
      }

      const agora = new Date();
      const futuro = new Date();
      futuro.setDate(agora.getDate() + AGENDA_CONFIG.DIAS_ANTECEDENCIA);

      const response = await this.calendar.events.list({
        calendarId: AGENDA_CONFIG.CALENDAR_ID,
        timeMin: agora.toISOString(),
        timeMax: futuro.toISOString(),
        q: telefone,
        singleEvents: true,
        orderBy: "startTime",
      });

      return response.data.items || [];
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      throw error;
    }
  }

  /**
   * Formata lista de agendamentos do usuário
   */
  formatarAgendamentosUsuario(agendamentos) {
    if (!agendamentos || agendamentos.length === 0) {
      const conteudo = "📅 Você não possui agendamentos futuros.";
      return this.formatarRespostaComNavegacao(conteudo);
    }

    let conteudo = "📅 *Seus Agendamentos:*\n\n";

    agendamentos.forEach((evento, index) => {
      const inicio = new Date(evento.start.dateTime || evento.start.date);
      const dataFormatada = this.formatarData(inicio);
      const horario = inicio.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      conteudo += `${index + 1}. 📋 *${evento.summary}*\n`;
      conteudo += `   📅 ${dataFormatada}\n`;
      conteudo += `   ⏰ ${horario}\n`;
      conteudo += `   🆔 ID: ${evento.id}\n\n`;
    });

    conteudo += "💡 Para cancelar: `cancelar [ID]`";

    return this.formatarRespostaComNavegacao(conteudo, {
      incluirAjuda: true,
    });
  }
}

module.exports = { AgendamentoService, ESTADOS_USUARIO };
