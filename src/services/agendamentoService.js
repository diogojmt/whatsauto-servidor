const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Configurações do agendamento
const AGENDA_CONFIG = {
  CALENDAR_ID: 'primary', // ou o ID específico da agenda
  HORARIO_INICIO: 9, // 9h
  HORARIO_FIM: 13, // 13h
  DURACAO_ATENDIMENTO: 30, // minutos
  DIAS_ANTECEDENCIA: 14, // mostrar próximos 14 dias
  TIMEZONE: 'America/Maceio', // GMT-3
  DIAS_UTEIS: [1, 2, 3, 4, 5] // Segunda a sexta
};

// Caminhos dos arquivos
const CREDENTIALS_PATH = path.join(__dirname, '../../client_secret_223567033178-kcji8j786j0t8odqtc7f5lqu5s8b11mr.apps.googleusercontent.com.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');

class AgendamentoService {
  constructor() {
    this.auth = null;
    this.calendar = null;
  }

  /**
   * Configura a autenticação OAuth2
   */
  async configurarAuth() {
    try {
      // Carregar credenciais
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Tentar carregar token existente
      try {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        oAuth2Client.setCredentials(token);
        this.auth = oAuth2Client;
        this.calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        return true;
      } catch (error) {
        console.log('Token não encontrado, será necessário autenticar');
        return false;
      }
    } catch (error) {
      console.error('Erro ao configurar autenticação:', error);
      throw error;
    }
  }

  /**
   * Gera URL de autorização para primeiro acesso
   */
  gerarUrlAutorizacao() {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar']
    });

    return authUrl;
  }

  /**
   * Salva o token de acesso
   */
  async salvarToken(code) {
    try {
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
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
      this.calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar token:', error);
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
   * Gera lista de horários do dia
   */
  gerarHorariosDia() {
    const horarios = [];
    const inicio = AGENDA_CONFIG.HORARIO_INICIO;
    const fim = AGENDA_CONFIG.HORARIO_FIM;
    const duracao = AGENDA_CONFIG.DURACAO_ATENDIMENTO;

    for (let hora = inicio; hora < fim; hora++) {
      for (let minuto = 0; minuto < 60; minuto += duracao) {
        const horario = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
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
        await this.configurarAuth();
      }

      const response = await this.calendar.events.list({
        calendarId: AGENDA_CONFIG.CALENDAR_ID,
        timeMin: dataInicio.toISOString(),
        timeMax: dataFim.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Erro ao consultar eventos:', error);
      throw error;
    }
  }

  /**
   * Consulta horários disponíveis nos próximos dias úteis
   */
  async consultarHorariosDisponiveis(diasAntecedencia = AGENDA_CONFIG.DIAS_ANTECEDENCIA) {
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
          const [hora, minuto] = horario.split(':').map(Number);
          const dataHorario = new Date(data);
          dataHorario.setHours(hora, minuto, 0, 0);

          // Verificar se o horário não conflita com eventos existentes
          const temConflito = eventos.some(evento => {
            if (!evento.start || !evento.end) return false;
            
            const inicioEvento = new Date(evento.start.dateTime || evento.start.date);
            const fimEvento = new Date(evento.end.dateTime || evento.end.date);
            
            return dataHorario >= inicioEvento && dataHorario < fimEvento;
          });

          if (!temConflito) {
            horariosLivres.push(horario);
          }
        }

        if (horariosLivres.length > 0) {
          horariosDisponiveis.push({
            data: data.toISOString().split('T')[0],
            dataFormatada: this.formatarData(data),
            diaSemana: this.obterDiaSemana(data),
            horarios: horariosLivres
          });
        }
      }

      return horariosDisponiveis;
    } catch (error) {
      console.error('Erro ao consultar horários disponíveis:', error);
      throw error;
    }
  }

  /**
   * Cria um novo evento de atendimento
   */
  async criarEventoAtendimento(dadosAgendamento) {
    try {
      if (!this.calendar) {
        await this.configurarAuth();
      }

      const { data, horario, servico, nomeCompleto, telefone } = dadosAgendamento;
      
      // Parsing da data e horário
      const [ano, mes, dia] = data.split('-').map(Number);
      const [hora, minuto] = horario.split(':').map(Number);
      
      const dataInicio = new Date(ano, mes - 1, dia, hora, minuto);
      const dataFim = new Date(dataInicio);
      dataFim.setMinutes(dataFim.getMinutes() + AGENDA_CONFIG.DURACAO_ATENDIMENTO);

      // Verificar se o horário ainda está disponível
      const eventos = await this.consultarEventos(dataInicio, dataFim);
      const temConflito = eventos.some(evento => {
        if (!evento.start || !evento.end) return false;
        
        const inicioEvento = new Date(evento.start.dateTime || evento.start.date);
        const fimEvento = new Date(evento.end.dateTime || evento.end.date);
        
        return dataInicio >= inicioEvento && dataInicio < fimEvento;
      });

      if (temConflito) {
        throw new Error('Horário não está mais disponível');
      }

      // Criar evento
      const evento = {
        summary: `Atendimento - ${servico}`,
        description: `Serviço: ${servico}\nNome: ${nomeCompleto}\nTelefone: ${telefone}`,
        start: {
          dateTime: dataInicio.toISOString(),
          timeZone: AGENDA_CONFIG.TIMEZONE
        },
        end: {
          dateTime: dataFim.toISOString(),
          timeZone: AGENDA_CONFIG.TIMEZONE
        },
        attendees: [
          {
            email: 'atende.smfaz.arapiraca@gmail.com'
          }
        ]
      };

      const response = await this.calendar.events.insert({
        calendarId: AGENDA_CONFIG.CALENDAR_ID,
        resource: evento
      });

      return {
        success: true,
        eventoId: response.data.id,
        dados: {
          data: this.formatarData(dataInicio),
          horario: horario,
          servico: servico,
          nomeCompleto: nomeCompleto,
          telefone: telefone
        }
      };
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      throw error;
    }
  }

  /**
   * Cancela um evento
   */
  async cancelarEvento(eventoId) {
    try {
      if (!this.calendar) {
        await this.configurarAuth();
      }

      await this.calendar.events.delete({
        calendarId: AGENDA_CONFIG.CALENDAR_ID,
        eventId: eventoId
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao cancelar evento:', error);
      throw error;
    }
  }

  /**
   * Formata data para exibição
   */
  formatarData(data) {
    const opcoes = {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    return data.toLocaleDateString('pt-BR', opcoes);
  }

  /**
   * Obtém dia da semana
   */
  obterDiaSemana(data) {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[data.getDay()];
  }

  /**
   * Formata lista de horários disponíveis para resposta
   */
  formatarHorariosDisponiveis(horariosDisponiveis) {
    if (!horariosDisponiveis || horariosDisponiveis.length === 0) {
      return 'Não há horários disponíveis nos próximos dias úteis.';
    }

    let resposta = 'Estes são os horários disponíveis para agendamento:\n\n';
    
    horariosDisponiveis.forEach(dia => {
      const dataFormatada = dia.diaSemana + ' (' + dia.data.split('-').reverse().join('/') + ')';
      resposta += `📅 ${dataFormatada}: ${dia.horarios.join(', ')}\n`;
    });

    resposta += '\n💡 Para agendar, digite: *agendar [data] [horário]*\n';
    resposta += 'Exemplo: *agendar 2025-01-15 09:30*';

    return resposta;
  }
}

module.exports = { AgendamentoService };
