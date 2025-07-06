# Dashboard Administrativo - WhatsAuto

Sistema de monitoramento e análise quantitativa/qualitativa dos atendimentos do chatbot WhatsAuto.

## 🎯 Funcionalidades

### **📊 Métricas Quantitativas**
- **Atendimentos por período** (hoje, semana, mês)
- **Tipos de consulta mais populares**
- **Taxa de sucesso/erro** por serviço
- **Tempo médio de atendimento**
- **Horários de pico** de atendimento
- **Usuários únicos** vs recorrentes

### **📈 Métricas Qualitativas**
- **Jornada do usuário** (fluxos eficientes/ineficientes)
- **Pontos de abandono** (onde usuários desistem)
- **Detecção de intenções** (precisão do sistema inteligente)
- **Mudanças de assunto** durante atendimento
- **Análise de comportamento** dos usuários

### **🔒 Segurança**
- **Acesso restrito** aos administradores
- **Autenticação JWT** com tokens seguros
- **Senhas criptografadas** com bcrypt
- **Sessões controladas** com expiração

## 🚀 Instalação e Configuração

### **1. Instalar Dependências**
```bash
npm install
```

### **2. Criar Primeiro Administrador**
```bash
npm run setup-admin
```

### **3. Iniciar Servidor**
```bash
npm start
```

### **4. Acessar Dashboard**
Acesse: `http://localhost:3000/admin`

## 📊 Interface do Dashboard

### **Visão Geral**
- Cards com estatísticas principais
- Gráficos de tipos de atendimento
- Distribuição por horário do dia

### **Análises**
- Gráfico de atendimentos por dia (30 dias)
- Performance por tipo de atendimento
- Análise de detecção de intenções

### **Lista de Atendimentos**
- Tabela com todos os atendimentos
- Filtros por tipo e status
- Paginação automática
- Detalhes de cada atendimento

### **Relatórios**
- Exportação de dados em JSON
- Relatório geral de estatísticas
- Dados dos gráficos para análise
- Lista completa de atendimentos

## 🔧 Estrutura Técnica

### **Backend**
- **SQLite** para armazenamento de dados
- **Express.js** para API REST
- **JWT** para autenticação
- **Bcrypt** para senhas

### **Frontend**
- **Bootstrap 5** para interface
- **Chart.js** para gráficos
- **JavaScript puro** para interatividade
- **Responsive design** para mobile

### **Banco de Dados**
- **atendimentos** - Dados dos atendimentos
- **eventos_usuario** - Eventos de cada usuário
- **metricas_sistema** - Métricas de performance
- **sessoes** - Sessões de usuário
- **admin_users** - Usuários administrativos

## 📡 API Endpoints

### **Autenticação**
- `POST /api/dashboard/login` - Login administrativo
- `POST /api/dashboard/setup-admin` - Criar primeiro admin

### **Dados**
- `GET /api/dashboard/stats` - Estatísticas gerais
- `GET /api/dashboard/charts` - Dados para gráficos
- `GET /api/dashboard/atendimentos` - Lista de atendimentos
- `GET /api/dashboard/eventos/:usuarioId` - Eventos do usuário
- `GET /api/dashboard/metricas` - Métricas de sistema

### **Relatórios**
- `GET /api/dashboard/export?tipo=geral` - Exportar estatísticas
- `GET /api/dashboard/export?tipo=graficos` - Exportar dados gráficos
- `GET /api/dashboard/export?tipo=atendimentos` - Exportar atendimentos

## 🔄 Integração com Sistema Existente

O dashboard foi integrado ao sistema existente através de:

### **Collector de Métricas**
- Intercepta todas as mensagens
- Registra eventos automaticamente
- Calcula métricas em tempo real
- Não interfere no funcionamento atual

### **Middleware Transparente**
- Coleta dados sem afetar performance
- Funciona com todos os serviços existentes
- Detecção automática de tipos de atendimento
- Tratamento de erros robusto

## 📋 Métricas Coletadas

### **Atendimentos**
- ID único do atendimento
- Usuário (telefone)
- Tipo de atendimento
- Status (em andamento, finalizado, erro)
- Timestamps de início/fim
- Duração em segundos
- Sucesso/erro
- Detalhes de erro (se houver)

### **Eventos de Usuário**
- Mensagens recebidas
- Mudanças de contexto
- Intenções detectadas
- Abandono de fluxo
- Erros de processamento

### **Métricas de Sistema**
- Performance dos serviços
- Tempo de resposta
- Cache hits/misses
- Erros de API externa
- Uso de memória

## 🛠️ Manutenção

### **Backup do Banco**
```bash
# Fazer backup
cp data/dashboard.db data/dashboard.db.backup

# Restaurar backup
cp data/dashboard.db.backup data/dashboard.db
```

### **Limpeza de Dados Antigos**
```sql
-- Limpar dados mais antigos que 90 dias
DELETE FROM atendimentos WHERE inicio_timestamp < date('now', '-90 days');
DELETE FROM eventos_usuario WHERE timestamp < date('now', '-90 days');
DELETE FROM metricas_sistema WHERE timestamp < date('now', '-90 days');
```

### **Adicionar Novos Administradores**
```bash
npm run setup-admin
```

## 🚨 Segurança

### **Boas Práticas**
- Dashboard **não exposto** no chatbot
- Acesso **apenas para administradores**
- Tokens com **expiração automática**
- Senhas **criptografadas**
- Logs de **auditoria** de acesso

### **Proteção de Dados**
- Dados pessoais **limitados**
- Mensagens **truncadas** (100 caracteres)
- Retenção de dados **configurável**
- Backup **automático** recomendado

## 📈 Próximos Passos

1. **Alertas automáticos** para problemas
2. **Relatórios por email** agendados
3. **Dashboard em tempo real** com WebSocket
4. **Análise de sentimento** das mensagens
5. **Integração com Google Analytics**
6. **API para ferramentas externas**

## ❓ Suporte

Para problemas ou dúvidas:
1. Verificar logs do servidor
2. Conferir conectividade com banco
3. Validar autenticação
4. Revisar permissões de arquivo

O dashboard é completamente **independente** do chatbot e pode ser **desabilitado** sem afetar o funcionamento normal do sistema.
