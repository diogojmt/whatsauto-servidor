# Guia para Parser SOAP - Cadastro Geral (ATUALIZADO PARA ÁBACO)

## 📋 Visão Geral

Este guia explica o parser SOAP da funcionalidade "Consulta de Cadastro Geral" (Opção 9) que foi **ATUALIZADO** para suportar os padrões específicos do webservice da Ábaco.

## 🚀 ATUALIZAÇÃO REALIZADA - PADRÕES ÁBACO

O parser foi atualizado para incluir **padrões específicos** identificados nos XMLs reais da Ábaco:

### ✅ Tags Ábaco Suportadas:
- `SRPNomeContribuinte` - Nome do contribuinte
- `SRPCPFCNPJContribuinte` - CPF/CNPJ do contribuinte  
- `SRPCodigoContribuinte` - Código do contribuinte
- `SRPInscricaoImovel` - Inscrição do imóvel
- `SRPEnderecoImovel` - Endereço do imóvel
- `SRPTipoImovel` - Tipo do imóvel (Predial, Terreno, etc.)
- `SRPTipoProprietario` - Tipo de proprietário (Principal, Co-proprietário, etc.)
- `SRPPossuiDebitoImovel` - Status de débito (Sim/Não)
- `SRPDebitoSuspensoImovel` - Débito suspenso (Sim/Não)

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

## ✅ PADRÕES IMPLEMENTADOS

### Padrões Específicos da Ábaco (PRIORIDADE)
```javascript
// =================== PADRÕES ESPECÍFICOS WEBSERVICE ÁBACO ===================
// Estes padrões foram identificados nos XMLs reais retornados pelo webservice da Ábaco
// e têm PRIORIDADE na extração de dados

// Dados do contribuinte
/<SRPNomeContribuinte[^>]*>([^<]+)<\/SRPNomeContribuinte>/gi,
/<SRPCPFCNPJContribuinte[^>]*>([^<]+)<\/SRPCPFCNPJContribuinte>/gi,
/<SRPCodigoContribuinte[^>]*>([^<]+)<\/SRPCodigoContribuinte>/gi,

// Dados dos imóveis
/<SRPInscricaoImovel[^>]*>([^<]+)<\/SRPInscricaoImovel>/gi,
/<SRPEnderecoImovel[^>]*>([^<]+)<\/SRPEnderecoImovel>/gi,
/<SRPTipoImovel[^>]*>([^<]+)<\/SRPTipoImovel>/gi,
/<SRPTipoProprietario[^>]*>([^<]+)<\/SRPTipoProprietario>/gi,
/<SRPPossuiDebitoImovel[^>]*>([^<]+)<\/SRPPossuiDebitoImovel>/gi,
/<SRPDebitoSuspensoImovel[^>]*>([^<]+)<\/SRPDebitoSuspensoImovel>/gi
```

### Padrões Genéricos (RETROCOMPATIBILIDADE)
```javascript
// =================== PADRÕES GENÉRICOS (RETROCOMPATIBILIDADE) ===================
// Mantidos para compatibilidade com outros sistemas ou versões futuras

// Dados básicos
/<nome[^>]*>([^<]+)<\/nome>/gi,
/<cpf[^>]*>([^<]+)<\/cpf>/gi,
/<codigo[^>]*>([^<]+)<\/codigo>/gi,

// Inscrições genéricas
/<inscricao[^>]*>([^<]+)<\/inscricao>/gi,
/<endereco[^>]*>([^<]+)<\/endereco>/gi,
/<tipo_imovel[^>]*>([^<]+)<\/tipo_imovel>/gi
```

## 🛠️ Como Adicionar Novos Padrões da Ábaco

### Passo 1: Identificar Nova Tag no XML
```bash
# Verificar arquivos XML salvos
dir logs\soap_response_*.xml

# Ver índice de arquivos
type logs\soap_responses_index.txt
```

### Passo 2: Adicionar Padrão Específico da Ábaco
Localizar a seção `PADRÕES ESPECÍFICOS WEBSERVICE ÁBACO` em `extrairDadosCompletos()`:

```javascript
// =================== PADRÕES ESPECÍFICOS WEBSERVICE ÁBACO ===================
// ADICIONAR NOVO PADRÃO AQUI
/<SRPNovoCampo[^>]*>([^<]+)<\/SRPNovoCampo>/gi,

// Padrões existentes...
```

### Passo 3: Atualizar Lógica de Extração
Adicionar condição específica para o novo campo:

```javascript
// PRIORIZAR PADRÕES ESPECÍFICOS DO WEBSERVICE ÁBACO
if (source.includes("srpnovocampo")) {
  if (!contribuinte.novoCampo) {
    contribuinte.novoCampo = valor;
    encontrado = true;
  }
}
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
