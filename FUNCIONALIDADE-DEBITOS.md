# 📄 Funcionalidade de Consulta de Débitos - WhatsApp Chatbot

## Visão Geral

A funcionalidade de consulta automática de débitos foi implementada para automatizar o atendimento da opção 1 do menu do WhatsApp ("📄 Segunda via de DAM's"), permitindo aos contribuintes consultar e emitir a segunda via de todos os seus débitos disponíveis para pagamento.

## Principais Recursos

### ✅ Implementado

1. **Disparo Automático**
   - Opção 1 do menu principal
   - Detecção de intenção por palavras-chave
   - Fluxo guiado (wizard) para coleta de dados

2. **Coleta de Dados Obrigatórios**
   - Tipo de Contribuinte (PF/PJ, Imóvel, Empresa)
   - Inscrição Municipal (com validação)
   - Ano/Exercício (com validação de período)

3. **Integração com API Ábaco**
   - Módulo `DebitosApi` para comunicação
   - Validação de parâmetros
   - Tratamento de erros

4. **Exibição de Resultados**
   - Lista completa de débitos formatada
   - Links para segunda via (DAM)
   - Linhas digitáveis para pagamento
   - Informações de valor e vencimento

5. **Detecção de Intenção**
   - Palavras-chave: "segunda via", "boleto", "dam", "débito", "imposto", etc.
   - Acionamento automático do fluxo

## Estrutura dos Arquivos

```
src/
├── services/
│   └── debitosService.js    # Lógica principal do fluxo
└── utils/
    └── debitosApi.js        # Integração com API Ábaco
```

## Como Funciona

### 1. Acionamento
- Usuário digita "1" no menu principal
- OU usuário envia mensagem com palavras-chave relacionadas a débitos

### 2. Fluxo de Coleta
```
📄 Tipo de Contribuinte → 📝 Inscrição → 📅 Exercício → 🔍 Consulta
```

### 3. Processamento
- Validação dos dados informados
- Chamada à API Ábaco com parâmetros formatados
- Processamento da resposta

### 4. Exibição
- Lista numerada de débitos encontrados
- Para cada débito: tributo, valor, vencimento, link DAM, linha digitável
- Opções para nova consulta ou retorno ao menu

## Configuração da API

### Variáveis de Ambiente
```bash
ABACO_API_KEY=sua_chave_aqui  # Chave de acesso à API Ábaco
```

### Endpoint
```
URL: https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apapidebito
Método: GET
Headers: DadosAPI (JSON com parâmetros)
```

## Exemplos de Uso

### Entrada do Usuário
```
Usuário: "1"
ou
Usuário: "quero minha segunda via de boleto"
ou
Usuário: "carnê iptu"
```

### Saída do Sistema
```
📄 Segunda via de DAM's

João, vou ajudá-lo a consultar e emitir a segunda via de todos os seus débitos disponíveis para pagamento.

Para começar, preciso de algumas informações:

1️⃣ Tipo de Contribuinte:

Digite o número correspondente:

1 - 👤 Pessoa Física/Jurídica
2 - 🏠 Imóvel (IPTU, COSIP)
3 - 🏢 Empresa (taxas empresariais)
```

### Resultado Final
```
✅ Débitos encontrados

João, foram encontrados 2 débito(s) em aberto para sua inscrição:

1️⃣ IMPOSTO S/ A PROPRIEDADE TERRITORIAL URB | COSIP (TERRENOS)
💰 Valor: R$ 285,15
📅 Vencimento: 30/05/2025
🔗 [Segunda via (DAM)](link_para_dam)
📋 Linha digitável:
`81610000002-4 85150296202-6 50530110000-2 00081221201-7`

💡 Para pagamento:
• Clique no link "Segunda via (DAM)" para baixar o boleto
• Use a linha digitável para pagamento via app bancário
```

## Tratamento de Erros

### Validações Implementadas
- Tipo de contribuinte (1, 2 ou 3)
- Inscrição municipal (mínimo 6 dígitos)
- Exercício (entre 2020 e ano atual + 1)

### Cenários de Erro
1. **Nenhum débito encontrado**: Mensagem informativa com sugestões
2. **Erro na API**: Mensagem de erro com orientações de contato
3. **Dados inválidos**: Orientação para correção com exemplos

## Segurança

- Chave da API protegida por variável de ambiente
- Validação rigorosa de entrada
- Timeout de 30 segundos nas chamadas à API
- Logs detalhados para monitoramento

## Estados do Sistema

O fluxo utiliza estados para controlar a conversa:
- `debitos_ativo`: Usuário está no fluxo de consulta
- Estados internos da sessão: `tipo_contribuinte`, `inscricao`, `exercicio`

## Comandos de Navegação

Durante o fluxo:
- `0`: Volta ao menu principal
- `menu`: Volta ao menu principal
- `1`: Nova consulta (após finalização)

## Teste e Validação

Execute o teste básico:
```bash
node test-debitos.js
```

Para testar a integração completa, use um cliente WhatsApp ou ferramenta de teste de webhook.

## Próximos Passos

1. Configurar a chave real da API Ábaco
2. Testar em ambiente de homologação
3. Ajustar timeouts conforme necessário
4. Implementar logs mais detalhados se necessário
5. Adicionar métricas de uso

---

**Implementado por**: Sistema AMP
**Data**: Janeiro 2025
**Versão**: 1.0
