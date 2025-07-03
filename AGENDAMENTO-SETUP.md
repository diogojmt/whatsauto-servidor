# Sistema de Agendamento - Google Calendar API

Este guia mostra como configurar e usar o sistema de agendamento integrado ao chatbot WhatsAuto.

## 📋 Pré-requisitos

1. **Conta Google** com acesso ao Google Calendar
2. **Projeto no Google Cloud Console** com Calendar API habilitada
3. **Arquivo de credenciais OAuth2** (já fornecido)

## 🚀 Instalação e Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Autenticação (PRIMEIRA VEZ APENAS)

Execute o script de configuração:

```bash
node setup-google-auth.js
```

**Siga os passos:**

1. ✅ O script verificará se as credenciais estão corretas
2. 🔗 Uma URL será exibida no terminal
3. 🌐 Acesse a URL no navegador
4. 🔐 Faça login com a conta: `atende.smfaz.arapiraca@gmail.com`
5. ✅ Autorize o aplicativo
6. 📋 Copie o código de autorização
7. 📥 Cole o código no terminal
8. 💾 O token será salvo automaticamente

### 3. Verificar Configuração

Após a configuração, o script testará automaticamente a conexão e listará os calendários disponíveis.

## 📅 Funcionalidades do Sistema

### Regras de Agendamento

- **Dias:** Segunda a sexta-feira (apenas dias úteis)
- **Horários:** 9h às 13h
- **Duração:** 30 minutos por atendimento
- **Antecedência:** Próximos 14 dias úteis
- **Fuso horário:** GMT-3 (America/Maceio)

### Fluxo do Usuário

1. **Iniciar agendamento:** Digite `8` no menu principal
2. **Ver horários disponíveis:** O bot lista automaticamente os horários livres
3. **Selecionar horário:** `agendar 2025-01-15 09:30`
4. **Informar serviço:** Descreva o serviço desejado
5. **Informar nome:** Nome completo
6. **Informar telefone:** Telefone de contato
7. **Confirmar:** Digite `confirmar` para finalizar

### Exemplo de Uso

```
👤 Usuário: 8
🤖 Bot: [Lista de horários disponíveis]

👤 Usuário: agendar 2025-01-15 09:30
🤖 Bot: Qual serviço você deseja agendar?

👤 Usuário: Consulta sobre IPTU
🤖 Bot: Informe seu nome completo:

👤 Usuário: João Silva
🤖 Bot: Informe seu telefone:

👤 Usuário: (82) 99999-9999
🤖 Bot: [Resumo do agendamento] Digite 'confirmar' para agendar

👤 Usuário: confirmar
🤖 Bot: ✅ Agendamento confirmado!
```

## 🔧 Arquivos Importantes

### Estrutura de Arquivos

```
projeto/
├── src/services/
│   ├── agendamentoService.js          # Core do Google Calendar
│   └── agendamentoFluxoService.js     # Fluxo do chatbot
├── client_secret_[...].json           # Credenciais OAuth2
├── token.json                         # Token de acesso (gerado automaticamente)
└── setup-google-auth.js               # Script de configuração
```

### Configurações Principais

```javascript
// Em src/services/agendamentoService.js
const AGENDA_CONFIG = {
  CALENDAR_ID: 'primary',           // ID do calendário
  HORARIO_INICIO: 9,                // 9h
  HORARIO_FIM: 13,                  // 13h
  DURACAO_ATENDIMENTO: 30,          // minutos
  DIAS_ANTECEDENCIA: 14,            // dias
  TIMEZONE: 'America/Maceio',       // GMT-3
  DIAS_UTEIS: [1, 2, 3, 4, 5]     // Segunda a sexta
};
```

## 🛠️ Comandos Úteis

### Reconfigurar Autenticação

```bash
node setup-google-auth.js
```

### Testar Conexão Manualmente

```javascript
const { AgendamentoService } = require('./src/services/agendamentoService');

async function teste() {
  const service = new AgendamentoService();
  await service.configurarAuth();
  const horarios = await service.consultarHorariosDisponiveis();
  console.log(horarios);
}

teste();
```

## 🔍 Troubleshooting

### Erro: "Token não encontrado"

**Solução:** Execute o script de configuração:
```bash
node setup-google-auth.js
```

### Erro: "Credenciais inválidas"

**Verificar:**
1. Arquivo de credenciais está na raiz do projeto
2. Nome do arquivo está correto
3. Conteúdo do arquivo é JSON válido

### Erro: "API não habilitada"

**Solução:**
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em "APIs & Services" > "Library"
3. Procure "Google Calendar API"
4. Clique em "Enable"

### Erro: "Horário não disponível"

**Possíveis causas:**
1. Horário já foi agendado por outro usuário
2. Evento manual criado na agenda
3. Conflito de fuso horário

### Nenhum horário disponível

**Verificar:**
1. Se há eventos ocupando todos os horários
2. Se os próximos dias são úteis (não são finais de semana)
3. Se a configuração de dias úteis está correta

## 📧 Contatos e Suporte

- **Email da Fazenda:** smfaz@arapiraca.al.gov.br
- **Email da Agenda:** atende.smfaz.arapiraca@gmail.com
- **Telefone:** (82) 3539-6000

## 🔄 Atualizações

### Versão 1.0
- ✅ Integração básica com Google Calendar
- ✅ Consulta de horários disponíveis
- ✅ Criação de eventos
- ✅ Fluxo completo no chatbot
- ✅ Validações de conflito
- ✅ Cancelamento de eventos (função disponível)

### Futuras Melhorias
- 🔄 Notificações por email
- 🔄 Lembretes automáticos
- 🔄 Reagendamento pelo chatbot
- 🔄 Relatórios de agendamentos
- 🔄 Múltiplos tipos de serviço com durações diferentes

## ⚠️ Importantes

1. **Backup:** O token é salvo em `token.json` - faça backup deste arquivo
2. **Segurança:** Nunca compartilhe o arquivo de credenciais ou token
3. **Manutenção:** Tokens podem expirar - execute novamente o setup se necessário
4. **Monitoramento:** Acompanhe os logs para identificar possíveis problemas

## 🏃‍♂️ Início Rápido

Para começar a usar imediatamente:

```bash
# 1. Instalar dependências
npm install

# 2. Configurar Google Auth (primeira vez)
node setup-google-auth.js

# 3. Iniciar servidor
npm start

# 4. Testar no WhatsApp
# Digite: 8
```

Pronto! O sistema de agendamento estará funcionando. 🎉
