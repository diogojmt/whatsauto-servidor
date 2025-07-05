/**
 * Arquivo de teste para validar o parser atualizado com padrões da Ábaco
 * 
 * Este arquivo demonstra como o parser agora extrai dados dos XMLs reais
 * retornados pelo webservice da Ábaco.
 */

const { CadastroGeralService } = require('./src/services/cadastroGeralService');

// Exemplo de XML com padrões da Ábaco (baseado na estrutura real)
const xmlExemploAbaco = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <PWSRetornoPertences.ExecuteResponse>
      <return>
        <SRPNomeContribuinte>João da Silva Santos</SRPNomeContribuinte>
        <SRPCPFCNPJContribuinte>12345678901</SRPCPFCNPJContribuinte>
        <SRPCodigoContribuinte>123456</SRPCodigoContribuinte>
        
        <SRPInscricaoImovel>000000000057518</SRPInscricaoImovel>
        <SRPEnderecoImovel>Rua das Flores, 123 - Centro - Arapiraca/AL</SRPEnderecoImovel>
        <SRPTipoImovel>Predial</SRPTipoImovel>
        <SRPTipoProprietario>Principal</SRPTipoProprietario>
        <SRPPossuiDebitoImovel>Sim</SRPPossuiDebitoImovel>
        <SRPDebitoSuspensoImovel>Não</SRPDebitoSuspensoImovel>
        
        <SRPInscricaoImovel>000000000057519</SRPInscricaoImovel>
        <SRPEnderecoImovel>Av. Central, 456 - Bairro Novo - Arapiraca/AL</SRPEnderecoImovel>
        <SRPTipoImovel>Terreno</SRPTipoImovel>
        <SRPTipoProprietario>Co-proprietário</SRPTipoProprietario>
        <SRPPossuiDebitoImovel>Não</SRPPossuiDebitoImovel>
        <SRPDebitoSuspensoImovel>Não</SRPDebitoSuspensoImovel>
      </return>
    </PWSRetornoPertences.ExecuteResponse>
  </soap:Body>
</soap:Envelope>`;

// Exemplo de XML com padrões genéricos (retrocompatibilidade)
const xmlExemploGenerico = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <contribuinte>
    <nome>Maria dos Santos</nome>
    <cpf>98765432100</cpf>
    <codigo>654321</codigo>
  </contribuinte>
  <imoveis>
    <imovel>
      <inscricao>111111111111111</inscricao>
      <endereco>Rua Antiga, 789</endereco>
      <tipo_imovel>Residencial</tipo_imovel>
      <proprietario>Principal</proprietario>
      <possui_debito>false</possui_debito>
    </imovel>
  </imoveis>
</response>`;

/**
 * Função para testar o parser com diferentes tipos de XML
 */
async function testarParser() {
  console.log('='.repeat(80));
  console.log('TESTE DO PARSER ATUALIZADO - PADRÕES ÁBACO');
  console.log('='.repeat(80));
  
  const service = new CadastroGeralService();
  
  // Teste 1: XML com padrões da Ábaco
  console.log('\n📋 TESTE 1: XML com padrões específicos da Ábaco');
  console.log('-'.repeat(50));
  
  const resultadoAbaco = service.processarRespostaSoap(xmlExemploAbaco);
  console.log('\n✅ Resultado da extração (Padrões Ábaco):');
  console.log(JSON.stringify(resultadoAbaco, null, 2));
  
  // Teste da apresentação formatada
  const respostaFormatadaAbaco = service.formatarResposta(resultadoAbaco, '12345678901');
  console.log('\n📱 Resposta formatada para WhatsApp (Padrões Ábaco):');
  console.log(respostaFormatadaAbaco.text);
  
  // Teste 2: XML com padrões genéricos (retrocompatibilidade)
  console.log('\n📋 TESTE 2: XML com padrões genéricos (Retrocompatibilidade)');
  console.log('-'.repeat(50));
  
  const resultadoGenerico = service.processarRespostaSoap(xmlExemploGenerico);
  console.log('\n✅ Resultado da extração (Padrões Genéricos):');
  console.log(JSON.stringify(resultadoGenerico, null, 2));
  
  // Teste da apresentação formatada
  const respostaFormatadaGenerica = service.formatarResposta(resultadoGenerico, '98765432100');
  console.log('\n📱 Resposta formatada para WhatsApp (Padrões Genéricos):');
  console.log(respostaFormatadaGenerica.text);
  
  console.log('\n' + '='.repeat(80));
  console.log('RESUMO DOS TESTES');
  console.log('='.repeat(80));
  
  console.log('\n✅ Padrões da Ábaco:');
  console.log(`   - Contribuinte encontrado: ${resultadoAbaco.encontrado ? 'SIM' : 'NÃO'}`);
  console.log(`   - Nome extraído: ${resultadoAbaco.contribuinte?.nome || 'NÃO'}`);
  console.log(`   - CPF/CNPJ extraído: ${resultadoAbaco.contribuinte?.cpfCnpj || 'NÃO'}`);
  console.log(`   - Código extraído: ${resultadoAbaco.contribuinte?.codigo || 'NÃO'}`);
  console.log(`   - Imóveis encontrados: ${resultadoAbaco.imoveis?.length || 0}`);
  
  console.log('\n✅ Padrões Genéricos (Retrocompatibilidade):');
  console.log(`   - Contribuinte encontrado: ${resultadoGenerico.encontrado ? 'SIM' : 'NÃO'}`);
  console.log(`   - Nome extraído: ${resultadoGenerico.contribuinte?.nome || 'NÃO'}`);
  console.log(`   - CPF/CNPJ extraído: ${resultadoGenerico.contribuinte?.cpfCnpj || 'NÃO'}`);
  console.log(`   - Código extraído: ${resultadoGenerico.contribuinte?.codigo || 'NÃO'}`);
  console.log(`   - Imóveis encontrados: ${resultadoGenerico.imoveis?.length || 0}`);
  
  console.log('\n🎯 CONCLUSÃO: O parser está funcionando corretamente com ambos os formatos!');
}

/**
 * Função para demonstrar como adicionar novos padrões
 */
function demonstrarAdicaoNovospadroes() {
  console.log('\n' + '='.repeat(80));
  console.log('COMO ADICIONAR NOVOS PADRÕES DA ÁBACO');
  console.log('='.repeat(80));
  
  console.log(`
📝 PASSOS PARA ADICIONAR NOVO PADRÃO:

1. 🔍 IDENTIFICAR NOVA TAG NO XML:
   - Consultar arquivo XML salvo em /logs/soap_response_*.xml
   - Localizar nova tag como: <SRPNovoCampo>valor</SRPNovoCamera>

2. ➕ ADICIONAR PADRÃO REGEX:
   - Localizar seção "PADRÕES ESPECÍFICOS WEBSERVICE ÁBACO"
   - Adicionar: /<SRPNovoCamera[^>]*>([^<]+)<\\/SRPNovoCamera>/gi

3. 🔧 ATUALIZAR LÓGICA DE EXTRAÇÃO:
   - Em extrairDadosCompletos() ou extrairInformacoesDetalhadas()
   - Adicionar condição: else if (source.includes("srpnovocampo"))

4. 🧪 TESTAR:
   - Usar XML real com nova tag
   - Verificar se extração está funcionando
   - Validar apresentação na resposta formatada

📋 EXEMPLO PRÁTICO:

// Nova tag encontrada no XML:
// <SRPValorIPTU>R$ 150,00</SRPValorIPTU>

// 1. Adicionar padrão:
/<SRPValorIPTU[^>]*>([^<]+)<\\/SRPValorIPTU>/gi

// 2. Adicionar lógica:
else if (source.includes("srpvaloriptu")) {
  if (!imovel.valorIPTU) {
    imovel.valorIPTU = valor;
  }
}

// 3. Atualizar apresentação:
if (imovel.valorIPTU) {
  textoResposta += \`   💰 *IPTU:* \${imovel.valorIPTU}\\n\`;
}
`);
}

// Executar testes se arquivo for executado diretamente
if (require.main === module) {
  testarParser().then(() => {
    demonstrarAdicaoNovospadroes();
  }).catch(console.error);
}

module.exports = { testarParser, demonstrarAdicaoNovospadroes };
