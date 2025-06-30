# 🚀 Deploy WhatsAuto Servidor

## Configuração do Deploy no Replit

### 1. Arquivos de Configuração
- ✅ `.replit` - Configurado para usar `index.refatorado.js`
- ✅ `package.json` - Main configurado corretamente
- ✅ Dependências instaladas

### 2. Passos para Deploy

#### No Replit:
1. **Clique no botão "Deploy"** no painel superior
2. **Selecione "Autoscale Deployment"** para alta disponibilidade
3. **Configure o domínio** (opcional)
4. **Inicie o deploy**

### 3. Monitoramento

#### Endpoints de Saúde:
- `GET /` - Health check básico
- `GET /status` - Status detalhado da aplicação
- `POST /reload` - Recarregar dados

#### Logs:
- Keep alive a cada 5 minutos
- Logs de todas as requisições
- Monitoramento de memória e uptime

### 4. Configurações de Produção

#### Variáveis de Ambiente (se necessário):
```bash
PORT=3000
NODE_ENV=production
```

#### URLs de Produção:
- Servidor principal: `https://[seu-repl].replit.app`
- Status: `https://[seu-repl].replit.app/status`

### 5. WhatsApp Business Integration

#### Webhook URL:
```
https://[seu-repl].replit.app/
```

#### Teste da Integração:
```bash
curl -X POST https://[seu-repl].replit.app/ \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "Teste",
    "message": "menu"
  }'
```

### 6. Troubleshooting

#### Se o deploy falhar:
1. Verificar se `index.refatorado.js` existe
2. Verificar se todas as dependências estão no `package.json`
3. Verificar logs no console do Replit

#### Se a aplicação não responder:
1. Verificar endpoint `/status`
2. Verificar logs de erro
3. Reiniciar o deployment

### 7. Backup e Manutenção

#### Backup dos Dados:
- `vlr_tlf_20_25.txt`
- `ISS_Arapiraca.txt`

#### Atualizações:
- Sempre testar localmente antes do deploy
- Usar `/reload` para recarregar dados sem restart

## ✅ Deploy Pronto!

Após o deploy, sua aplicação estará disponível 24/7 e pronta para integração com WhatsApp Business.
