# Mensagens de Aguardo para Consultas Demoradas

## Resumo

Foi implementado um sistema de mensagens de aguardo para informar o usuário quando o chatbot está processando consultas que podem demorar, como consultas de débitos ou BCI.

## Como Funciona

### 1. Utilitário de Mensagens (`src/utils/waitingMessage.js`)

- Classe que fornece mensagens de aguardo personalizadas
- Mensagens específicas para diferentes tipos de consulta
- Mensagens aleatórias para casos gerais

### 2. Mensagens Disponíveis

- **Débitos**: "🔍 Consultando débitos no sistema, aguarde..."
- **BCI**: "📋 Verificando informações de BCI, aguarde..."
- **Consulta**: "🔍 Realizando consulta, aguarde..."
- **API**: "🌐 Consultando API externa, aguarde..."
- **Aleatórias**: Conjunto de mensagens genéricas com emojis

### 3. Implementação nos Serviços

#### DebitosService
```javascript
// Preparar mensagem de aguardo
const WaitingMessage = require("../utils/waitingMessage");
const waitingMsg = WaitingMessage.getMessageForType("debitos");

// Incluir na resposta
return `${waitingMsg}\n\n${resultado}`;
```

#### BciService
```javascript
// Preparar mensagem de aguardo
const WaitingMessage = require("../utils/waitingMessage");
const waitingMsg = WaitingMessage.getMessageForType("bci");

// Incluir na resposta
return `${waitingMsg}\n\n${resultado}`;
```

## Benefícios

1. **Melhor Experiência do Usuário**: O usuário sabe que o sistema está processando
2. **Transparência**: Informa que a consulta está em andamento
3. **Redução de Ansiedade**: Evita que o usuário pense que o sistema travou
4. **Feedback Visual**: Emojis tornam as mensagens mais amigáveis

## Fluxo de Uso

1. Usuário solicita consulta (ex: débitos)
2. Sistema mostra mensagem de aguardo imediatamente
3. Processa a consulta no background
4. Retorna mensagem de aguardo + resultado final

## Exemplo de Resposta

```
🔍 Consultando débitos no sistema, aguarde...

✅ Não foram encontrados débitos para os dados informados.

🔄 Tentar outro ano?
📅 Digite um ano entre 2020 e 2025
```

## Personalização

Para adicionar novos tipos de mensagem, edite o arquivo `src/utils/waitingMessage.js`:

```javascript
static getMessageForType(type) {
  const specificMessages = {
    debitos: "🔍 Consultando débitos no sistema, aguarde...",
    bci: "📋 Verificando informações de BCI, aguarde...",
    // Adicione novos tipos aqui
    novoTipo: "🔄 Processando novo tipo de consulta, aguarde...",
  };
  
  return specificMessages[type] || this.getRandomMessage();
}
```

## Teste

Execute o arquivo de teste para verificar as mensagens:

```bash
node test-waiting-message.js
```
