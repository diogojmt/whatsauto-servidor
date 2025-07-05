# WhatsAuto Servidor - Versão Refatorada

Sistema de atendimento virtual refatorado para a Prefeitura de Arapiraca.

## 🔄 Principais Melhorias da Refatoração

### ✅ Estrutura Modularizada
- **Configurações centralizadas** em `src/config/constants.js`
- **Utilitários organizados** em `src/utils/`
- **Serviços separados** em `src/services/`
- **Respostas modularizadas** em `src/responses/`
- **Handler principal** em `src/handlers/messageHandler.js`

### ✅ Manutenibilidade
- Código mais legível e organizado
- Funções com responsabilidades específicas
- Constantes centralizadas para fácil manutenção
- Documentação JSDoc em todas as funções

### ✅ Funcionalidades Novas
- Endpoint `/status` para monitoramento
- Endpoint `/reload` para recarregar dados sem reiniciar
- Melhor tratamento de erros
- Log mais estruturado
- **🆕 Consulta de Cadastro Geral** - Opção 9 no menu principal

### 🎯 **NOVO: Sistema Inteligente de Detecção de Intenções**
- **Detecção global e contextual** de intenções em qualquer momento da conversa
- **Processamento automático** de intenções com diferentes níveis de confiança
- **Mudança de assunto** fluida e natural durante a conversa
- **Sistema extensível** para fácil adição de novas intenções
- **Configuração modular** baseada em palavras-chave e frases
- **Análise de contexto** para melhor experiência conversacional

## 📁 Estrutura de Arquivos

```
├── src/
│   ├── config/
│   │   ├── constants.js          # Constantes e configurações
│   │   └── intentions.js         # 🆕 Configuração de intenções
│   ├── utils/
│   │   ├── textUtils.js          # Utilitários de texto
│   │   ├── dataLoader.js         # Carregamento de dados
│   │   ├── mediaUtils.js         # Utilitários de mídia
│   │   └── validationUtils.js    # 🆕 Utilitários de validação (CPF/CNPJ)
│   ├── services/
│   │   ├── searchService.js      # Serviços de busca
│   │   ├── stateService.js       # Gerenciamento de estado
│   │   ├── intentionService.js   # 🆕 Serviço de detecção de intenções
│   │   └── cadastroGeralService.js # 🆕 Serviço de consulta de cadastro geral
│   ├── responses/
│   │   ├── menuResponses.js      # Respostas de menus
│   │   ├── damResponses.js       # Respostas de DAM
│   │   ├── certidaoResponses.js  # Respostas de certidões
│   │   ├── nfseResponses.js      # Respostas de NFSe
│   │   ├── tFLFResponses.js      # Respostas de TFLF
│   │   └── searchResponses.js    # Respostas de busca
│   ├── handlers/
│   │   └── messageHandler.js     # Handler principal de mensagens (🔄 atualizado)
│   └── examples/                 # 🆕 Exemplos e documentação
│       └── addNewIntention.js    # Como adicionar novas intenções
├── index.refatorado.js           # Servidor principal refatorado
├── index.js                      # Servidor original (mantido)
└── README.refatorado.md          # Esta documentação
```

## 🚀 Como Usar

### Executar Versão Refatorada
```bash
npm run start
# ou
node index.refatorado.js
```

### Executar Versão Original
```bash
npm run start:original
# ou
node index.js
```

### Desenvolvimento
```bash
npm run dev
```

## 🛠️ Endpoints Disponíveis

### Principais
- `POST /` - Endpoint principal para mensagens
- `POST /mensagem` - Endpoint alternativo
- `GET /` - Health check

### Novos (apenas na versão refatorada)
- `GET /status` - Status do servidor e estatísticas
- `POST /reload` - Recarregar dados sem reiniciar

## 📊 Exemplo de Resposta do Status

```json
{
  "status": "ativo",
  "dadosTFLF": 1245,
  "dadosISS": 856,
  "uptime": 3600,
  "memory": {
    "rss": 45678592,
    "heapTotal": 26738688,
    "heapUsed": 23456789,
    "external": 1234567
  }
}
```

## 🔧 Configuração

Todas as configurações importantes estão centralizadas em:
- `src/config/constants.js` - URLs, contatos, estados, emojis, etc.

## 🧪 Vantagens da Refatoração

1. **Manutenção mais fácil**: Alterações em URLs ou textos são feitas em um só lugar
2. **Código mais limpo**: Funções menores e mais específicas
3. **Melhor testabilidade**: Módulos isolados podem ser testados individualmente
4. **Escalabilidade**: Fácil adicionar novas funcionalidades
5. **Debugging**: Logs mais organizados e informativos
6. **Performance**: Carregamento otimizado de dados

## 🔄 Migração

Para migrar do código original para o refatorado:

1. **Backup**: Mantenha o `index.js` original como backup
2. **Teste**: Execute a versão refatorada em paralelo
3. **Compare**: Verifique se todas as funcionalidades funcionam igual
4. **Deploy**: Substitua o arquivo principal quando estiver confiante

## 🆘 Troubleshooting

Se houver problemas com a versão refatorada:

1. Verifique se todos os arquivos da pasta `src/` estão presentes
2. Compare respostas entre versão original e refatorada
3. Verifique os logs do console para erros
4. Use `GET /status` para verificar se os dados foram carregados

## 🎯 Sistema de Detecção de Intenções

### Como Funciona

O novo sistema de detecção de intenções permite que o chatbot identifique automaticamente o que o usuário quer fazer, independentemente do ponto da conversa em que está.

### Características Principais

- **Global**: Funciona em qualquer momento da conversa
- **Contextual**: Considera o estado atual do usuário
- **Inteligente**: Calcula níveis de confiança
- **Extensível**: Fácil adicionar novas intenções
- **Não invasivo**: Não quebra fluxos existentes

### Intenções Configuradas

1. **DEBITOS** - Consulta de débitos e DAM
2. **CERTIDOES** - Emissão de certidões
3. **NFSE** - Nota Fiscal de Serviços
4. **BCI** - Cadastro Imobiliário
5. **AGENDAMENTO** - Agendamento de atendimentos
6. **TFLF** - Taxa de Fiscalização
7. **DEMONSTRATIVO** - Demonstrativo Financeiro
8. **SUBSTITUTOS** - Substitutos Tributários
9. **CADASTRO_GERAL** - Consulta de Cadastro Geral (CPF/CNPJ)
10. **ATENDENTE** - Falar com atendente humano

### Exemplos de Uso

```
Usuário: "Preciso pagar meu IPTU"
Bot: "🎯 Detectei sua intenção - você quer consultar débitos? ..."

Usuário: "Quero uma certidão negativa"
Bot: "🎯 Detectei sua intenção - você quer emitir certidões? ..."

Usuário: "Na verdade, prefiro agendar um atendimento"
Bot: "🔄 Mudança de assunto detectada - você quer Agendamento? ..."
```

### Como Adicionar Novas Intenções

1. **Configurar a intenção** em `src/config/intentions.js`
2. **Implementar a ação** em `src/handlers/messageHandler.js`
3. **Testar usando** `src/examples/addNewIntention.js`

Veja exemplo completo em [`src/examples/addNewIntention.js`](src/examples/addNewIntention.js).

## 🆕 Funcionalidade: Consulta de Cadastro Geral (Opção 9)

### Descrição
Nova funcionalidade que permite consultar rapidamente, a partir do CPF ou CNPJ, as informações de Cadastro Geral, Inscrição Municipal e Inscrição Imobiliária vinculadas ao documento informado.

### Como Usar
1. Digite `9` no menu principal
2. Informe o CPF (11 dígitos) ou CNPJ (14 dígitos)
3. Receba as inscrições vinculadas ao documento

### Recursos Implementados
- ✅ Validação de CPF/CNPJ com dígitos verificadores
- ✅ Integração com WebService SOAP da Ábaco
- ✅ Cache de consultas por 5 minutos
- ✅ Tratamento de erros e timeouts
- ✅ Formatação automática de documentos
- ✅ Detecção automática por palavras-chave

### Palavras-chave de Acesso
A funcionalidade pode ser acessada digitando:
- "consulta cadastro", "consultar cadastro"
- "cadastro geral", "consultar inscrição"
- "consultar cpf", "consultar cnpj"
- "inscrição municipal", "inscrição imobiliária"

### Configuração Técnica
- **URL WSDL**: https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apwsretornopertences?wsdl
- **Timeout**: 30 segundos
- **Cache TTL**: 5 minutos
- **Validação**: Algoritmo padrão CPF/CNPJ

### Estrutura SOAP
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:eag="eAgata_Arapiraca_Maceio_Ev3">
   <soapenv:Header/>
   <soapenv:Body>
      <eag:PWSRetornoPertences.Execute>
         <eag:Flagtipopesquisa>C</eag:Flagtipopesquisa>
         <eag:Ctgcpf>[CPF/CNPJ]</eag:Ctgcpf>
         <eag:Ctiinscricao></eag:Ctiinscricao>
      </eag:PWSRetornoPertences.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

### Logs e Monitoramento
- Todas as consultas são logadas com timestamp
- Erros são capturados e reportados
- Cache é limpo automaticamente
- Métricas disponíveis no endpoint `/status`

### Produção
Para usar em produção, altere a URL no arquivo `src/services/cadastroGeralService.js` conforme orientação técnica.

## 📝 Próximos Passos Sugeridos

1. **Testes automatizados** para garantir qualidade
2. **Cache de respostas** para melhor performance
3. **Rate limiting** para proteção contra spam
4. **Métricas de uso** para análise de comportamento
5. **Interface administrativa** para gestão
6. **Machine Learning** para melhorar detecção de intenções
