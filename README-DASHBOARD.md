# 📊 Dashboard Administrativo - WhatsAuto

## 🚀 Como usar (Versão Simplificada)

### **Opção 1: Dashboard de Teste (Recomendado)**

```bash
# Executar dashboard standalone
node test-dashboard.js
```

**Acesso:**
- URL: http://localhost:3001/admin
- Usuário: `admin`
- Senha: `admin123`

### **Opção 2: Dashboard Integrado (Desenvolvimento)**

```bash
# Executar servidor principal
npm start
```

**Acesso:**
- URL: http://localhost:3000/admin
- Usuário: `admin`
- Senha: `admin123`

## 📱 Funcionalidades Disponíveis

### **🎯 Visão Geral**
- ✅ **Cards de métricas** (atendimentos, taxa sucesso, usuários)
- ✅ **Gráfico de tipos populares** (pizza)
- ✅ **Gráfico de horários** (barras)

### **📈 Análises**
- ✅ **Gráfico temporal** (atendimentos por dia)
- ✅ **Performance por tipo** (taxa sucesso + tempo médio)
- ✅ **Detecção de intenções** (rosca)

### **📋 Lista de Atendimentos**
- ✅ **Tabela com filtros** (tipo, status)
- ✅ **Paginação** automática
- ✅ **Detalhes** de cada atendimento

### **📁 Relatórios**
- ✅ **Exportação JSON** (geral, gráficos, atendimentos)
- ✅ **Download automático** de arquivos

## 🔐 Segurança

- ✅ **Login obrigatório** para acesso
- ✅ **Token JWT** para autenticação
- ✅ **Logout automático** em caso de erro
- ✅ **Interface isolada** do chatbot

## 💡 Dados de Demonstração

O dashboard atual exibe **dados fictícios** para demonstração:
- 25 atendimentos hoje
- 156 atendimentos na semana
- 87.5% taxa de sucesso
- 89 usuários únicos

## 🔧 Próximos Passos

1. **Integrar coleta real** de métricas
2. **Banco de dados persistente** (SQLite/PostgreSQL)
3. **Alertas automáticos** para problemas
4. **Relatórios agendados** por email
5. **Análise de sentimentos** das mensagens

## 🛠️ Tecnologias

- **Frontend:** Bootstrap 5 + Chart.js
- **Backend:** Express.js + Node.js
- **Autenticação:** JWT simplificado
- **Banco:** Em memória (desenvolvimento)

## ✨ Interface

O dashboard possui:
- 🎨 **Design moderno** com gradientes
- 📱 **Responsivo** para mobile
- 🎯 **Navegação intuitiva** por abas
- 📊 **Gráficos interativos**
- 🔄 **Atualização automática**

## 🆘 Problemas Comuns

### Login não funciona
- Verificar se servidor está rodando
- Usar credenciais: `admin` / `admin123`
- Verificar console do navegador

### Gráficos não carregam
- Verificar conexão com internet (CDN Chart.js)
- Aguardar alguns segundos após login

### Dados não aparecem
- Servidor de teste usa dados fictícios
- Para dados reais, integrar com collector

---

## 🎉 Demonstração

O dashboard está **funcionando** e pronto para ser apresentado aos administradores! 

Use o **modo de teste** (`node test-dashboard.js`) para demonstrações rápidas e o **modo integrado** (`npm start`) para desenvolvimento.
