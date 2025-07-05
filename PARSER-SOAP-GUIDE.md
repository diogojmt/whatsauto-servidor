# Guia para Atualização do Parser SOAP - Cadastro Geral

## 📋 Visão Geral

Este guia explica como atualizar o parser SOAP da funcionalidade "Consulta de Cadastro Geral" (Opção 9) quando recebermos exemplos reais de XML do webservice da Ábaco.

## 🔍 Logs Detalhados Implementados

### 1. Logs no Console
- **XML Completo**: Todo XML recebido é logado no console antes do processamento
- **Indicadores**: Análise automática de erro/sucesso/resposta
- **Estrutura**: Informações sobre tamanho e características do XML

### 2. Arquivos XML Salvos
- **Localização**: `/logs/soap_response_[documento]_[timestamp].xml`
- **Índice**: `/logs/soap_responses_index.txt` (lista todos os arquivos salvos)
- **Formato**: XML completo preservado para análise

### 3. Análise Contextual
- Detecção automática de:
  - Mensagens de erro (erro, error, fault, exception)
  - Indicadores de sucesso (success, ok, true, válido)
  - Tipos de resposta (return, response, result, body)

## 🛠️ Como Atualizar o Parser

### Passo 1: Localizar XML Real
```bash
# Verificar arquivos XML salvos
ls -la logs/soap_response_*.xml

# Ver índice de arquivos
cat logs/soap_responses_index.txt
```

### Passo 2: Analisar Estrutura do XML
1. Abrir o arquivo XML salvo
2. Identificar tags que contêm as inscrições
3. Observar a estrutura: `<tag>valor</tag>`

### Passo 3: Atualizar Padrões no Parser
Localizar a array `padroesPossveis` na função `processarRespostaSoap` (linha ~308):

```javascript
const padroesPossveis = [
  // ADICIONAR NOVOS PADRÕES AQUI
  // Exemplo: se o XML tem <inscricao_municipal>12345</inscricao_municipal>
  /<inscricao_municipal[^>]*>([^<]+)<\/inscricao_municipal>/gi,
  
  // Exemplo: se o XML tem <numero_inscricao tipo="municipal">12345</numero_inscricao>
  /<numero_inscricao[^>]*tipo="municipal"[^>]*>([^<]+)<\/numero_inscricao>/gi,
  
  // Padrões existentes...
];
```

### Passo 4: Ajustar Determinação de Tipo
Se necessário, atualizar a lógica de determinação do tipo de inscrição (linha ~340):

```javascript
// Determinar tipo baseado no padrão encontrado
let tipo = 'Municipal'; // Padrão

if (padrao.source.includes('imob')) {
  tipo = 'Imobiliária';
} else if (padrao.source.includes('munic')) {
  tipo = 'Municipal';
}
// ADICIONAR NOVAS CONDIÇÕES AQUI
```

## 📝 Exemplos de Padrões Comuns

### Tags Específicas
```javascript
// Para <inscricao_municipal>12345</inscricao_municipal>
/<inscricao_municipal[^>]*>([^<]+)<\/inscricao_municipal>/gi

// Para <inscricao_imobiliaria>67890</inscricao_imobiliaria>
/<inscricao_imobiliaria[^>]*>([^<]+)<\/inscricao_imobiliaria>/gi
```

### Tags com Atributos
```javascript
// Para <inscricao tipo="municipal">12345</inscricao>
/<inscricao[^>]*tipo="municipal"[^>]*>([^<]+)<\/inscricao>/gi

// Para <numero categoria="imobiliaria">67890</numero>
/<numero[^>]*categoria="imobiliaria"[^>]*>([^<]+)<\/numero>/gi
```

### Valores em Atributos
```javascript
// Para <item inscricao="12345" tipo="municipal" />
/inscricao="([^"]+)"/gi
```

### Arrays/Listas
```javascript
// Para múltiplas inscrições em array
/<item[^>]*>([^<]+)<\/item>/gi
```

## 🧪 Teste e Validação

### 1. Fazer Consulta de Teste
```bash
# Executar uma consulta usando a opção 9
# Verificar logs no console
# Confirmar que arquivo XML foi salvo
```

### 2. Verificar Captura de Dados
```javascript
// Verificar se o novo padrão captura os dados
console.log(`[CadastroGeralService] Encontradas ${inscricoes.length} inscrições:`, inscricoes);
```

### 3. Validar Tipos de Inscrição
```javascript
// Verificar se os tipos estão corretos
const inscricoesMunicipais = dados.inscricoes.filter(i => i.tipo === 'Municipal');
const inscricoesImobiliarias = dados.inscricoes.filter(i => i.tipo === 'Imobiliária');
```

## 🔧 Estrutura do Parser Atual

O parser atual já suporta:

### Padrões Específicos
- `<inscricao>valor</inscricao>`
- `<inscricao_municipal>valor</inscricao_municipal>`
- `<inscricao_imobiliaria>valor</inscricao_imobiliaria>`
- `<municipal>valor</municipal>`
- `<imobiliaria>valor</imobiliaria>`

### Padrões Genéricos
- Tags contendo "inscr", "munic", "imob"
- Tags "codigo", "numero", "id"
- Tags "return", "result", "response"
- Números com 6+ dígitos

### Análise Contextual
- Detecção de erros automática
- Verificação de sucesso
- Análise de estrutura

## 🚀 Implementação Realizada

### ✅ Recursos Adicionados
1. **Logs Detalhados**: XML completo logado antes do processamento
2. **Salvamento em Arquivos**: Todos os XMLs preservados em `/logs/`
3. **Índice de Arquivos**: Facilita localização de consultas específicas
4. **Parser Flexível**: Suporta múltiplos padrões de resposta
5. **Análise Contextual**: Detecção automática de tipos de resposta
6. **Documentação**: Guia completo para atualização do parser

### 🔄 Próximos Passos
1. Executar consultas reais para capturar XMLs
2. Analisar estrutura dos XMLs recebidos
3. Atualizar padrões do parser conforme necessário
4. Testar e validar funcionamento

## 📞 Suporte
Para dúvidas sobre a implementação, consulte:
- Código fonte: `src/services/cadastroGeralService.js`
- Logs: `/logs/soap_response_*.xml`
- Documentação inline no código (linhas 8-46)
