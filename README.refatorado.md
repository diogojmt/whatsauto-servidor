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

## 📁 Estrutura de Arquivos

```
├── src/
│   ├── config/
│   │   └── constants.js          # Constantes e configurações
│   ├── utils/
│   │   ├── textUtils.js          # Utilitários de texto
│   │   ├── dataLoader.js         # Carregamento de dados
│   │   └── mediaUtils.js         # Utilitários de mídia
│   ├── services/
│   │   ├── searchService.js      # Serviços de busca
│   │   └── stateService.js       # Gerenciamento de estado
│   ├── responses/
│   │   ├── menuResponses.js      # Respostas de menus
│   │   ├── damResponses.js       # Respostas de DAM
│   │   ├── certidaoResponses.js  # Respostas de certidões
│   │   ├── nfseResponses.js      # Respostas de NFSe
│   │   ├── tFLFResponses.js      # Respostas de TFLF
│   │   └── searchResponses.js    # Respostas de busca
│   └── handlers/
│       └── messageHandler.js     # Handler principal de mensagens
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

## 📝 Próximos Passos Sugeridos

1. **Testes automatizados** para garantir qualidade
2. **Cache de respostas** para melhor performance
3. **Rate limiting** para proteção contra spam
4. **Métricas de uso** para análise de comportamento
5. **Interface administrativa** para gestão
