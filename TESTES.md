# 🧪 **Fluxo de Testes - WhatsAuto Servidor**

## 📋 **Pré-requisitos**
- ✅ Servidor rodando: `npm start`
- ✅ Terminal/Postman para testes de API
- ✅ WhatsApp Business ou simulador de requisições

---

## 🚀 **TESTE 1: Verificação Básica do Sistema**

### 1.1 Health Check
```bash
curl http://localhost:3000/
```
**Esperado:** `✅ Servidor WhatsAuto ativo`

### 1.2 Status Detalhado
```bash
curl http://localhost:3000/status
```
**Esperado:** JSON com features incluindo:
```json
{
  "features": {
    "emissaoCertidoes": true,
    "consultaPorCpfCnpj": true,
    "selecaoMultiplasInscricoes": true
  }
}
```

---

## 🎯 **TESTE 2: Fluxo Básico de Certidão (Sem WhatsApp)**

### 2.1 Menu Principal
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Teste&message=menu"
```
**Esperado:** Menu com opções 1-5

### 2.2 Acessar Certidões
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Teste&message=2"
```
**Esperado:** Início automático do fluxo de certidão

### 2.3 Selecionar Tipo Contribuinte
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Teste&message=1"
```
**Esperado:** Solicitação de CPF/CNPJ

---

## 🔍 **TESTE 3: Consulta por CPF/CNPJ (API Ábaco)**

### 3.1 Testar API Diretamente
```bash
curl http://localhost:3000/test-cpf/12345678901
```
**Possíveis Resultados:**
- ✅ **Sucesso:** Lista de inscrições encontradas
- ⚠️ **Sem suporte:** API não permite consulta por CPF
- ❌ **Erro:** Problema de conexão

### 3.2 Testar com CPF Real (se disponível)
```bash
curl http://localhost:3000/test-cpf/03718472490
```

### 3.3 Testar com CNPJ
```bash
curl http://localhost:3000/test-cpf/12345678000195
```

---

## 📱 **TESTE 4: Fluxo Completo via Simulação WhatsApp**

### Cenário A: CPF com UMA inscrição (automático)
```bash
# 1. Menu
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Usuario1&message=menu"

# 2. Certidões
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Usuario1&message=2"

# 3. Tipo PF/PJ
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Usuario1&message=1"

# 4. CPF (que tenha UMA inscrição)
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Usuario1&message=03718472490"
```
**Esperado:** 
- Se encontrar 1 inscrição → Emite certidão automaticamente
- Se não encontrar → Solicita inscrição manual

### Cenário B: CPF com MÚLTIPLAS inscrições
```bash
# 1-3. Mesmo início do Cenário A

# 4. CPF (que teoricamente tenha múltiplas inscrições)
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Usuario2&message=12345678901"
```
**Esperado:**
- Menu de seleção com múltiplas inscrições
- Opções numeradas (1, 2, 3...)

### Cenário C: Fluxo Manual (API não suporta)
```bash
# 1-4. Mesmo do Cenário A

# 5. Inscrição Manual (se API não encontrou)
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Usuario3&message=113436"
```
**Esperado:** Emissão de certidão com sucesso

---

## 🎯 **TESTE 5: Casos Específicos**

### 5.1 CPF Inválido
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=ErroTeste&message=123"
```
**Esperado:** Erro de validação de CPF/CNPJ

### 5.2 Seleção de Inscrição Inválida
```bash
# Após obter menu de múltiplas inscrições, testar:
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=Usuario2&message=99"
```
**Esperado:** Erro "Opção inválida"

### 5.3 Timeout/Erro de API
```bash
# Teste com CPF que pode gerar timeout
curl http://localhost:3000/test-cpf/00000000000
```

---

## ✅ **TESTE 6: Checklist de Validação**

### Funcionalidades Básicas
- [ ] Menu principal exibe corretamente
- [ ] Opção 2 inicia fluxo de certidão
- [ ] Coleta tipo de contribuinte (1/2/3)
- [ ] Coleta CPF/CNPJ com validação
- [ ] Emite certidão com sucesso

### Funcionalidades Avançadas
- [ ] Consulta API por CPF/CNPJ funciona
- [ ] Detecta múltiplas inscrições
- [ ] Exibe menu de seleção
- [ ] Permite escolher inscrição
- [ ] Emite certidão automaticamente
- [ ] Fallback para fluxo manual

### Tratamento de Erros
- [ ] CPF/CNPJ inválido rejeitado
- [ ] Opções inválidas tratadas
- [ ] Timeout de API gerenciado
- [ ] Sessão expirada detectada
- [ ] Mensagens de erro claras

---

## 🚨 **Cenários de Teste Específicos**

### Teste com Dados Reais (Ábaco)
```bash
# Use dados que funcionaram antes:
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=TestReal&message=menu"

# Seguir fluxo com:
# Tipo: 1
# CPF: 03718472490 (do teste anterior)
# Inscrição: 113436 (se necessário)
```

### Teste de Performance
```bash
# Testar múltiplas requisições simultâneas
for i in {1..5}; do
  curl -X POST http://localhost:3000/ \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "sender=User$i&message=menu" &
done
wait
```

---

## 📊 **Relatório de Teste**

### ✅ Funcionando
- [ ] Health check
- [ ] Menu principal  
- [ ] Fluxo básico certidão
- [ ] Validação CPF/CNPJ
- [ ] Emissão com dados manuais

### 🔍 A Verificar
- [ ] Consulta por CPF na API Ábaco
- [ ] Múltiplas inscrições (depende da API)
- [ ] Seleção de inscrição
- [ ] Emissão automática

### ❌ Problemas Encontrados
- [ ] (Anotar problemas aqui)

---

## 🎯 **Próximos Passos Após Teste**

1. **Se API suporta múltiplas inscrições:** ✅ Funcionalidade completa
2. **Se API não suporta:** Ainda melhora UX (1 inscrição automática)
3. **Se API falha:** Fallback funcional mantém sistema estável

**Execute os testes em ordem e anote os resultados!**
