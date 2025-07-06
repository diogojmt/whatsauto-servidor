const { CadastroGeralService } = require('./src/services/cadastroGeralService');

// XML do log que estava com problema
const xmlComProblema = `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <SOAP-ENV:Body>
        <PWSRetornoPertences.ExecuteResponse xmlns="eAgata_Arapiraca_Maceio_Ev3">
            <Sdtretornopertences xmlns="eAgata_Arapiraca_Maceio_Ev3">
                <SDTRetornoPertences.SDTRetornoPertencesItem xmlns="eAgata_Arapiraca_Maceio_Ev3">
                    <SRPCodigoContribuinte>46631</SRPCodigoContribuinte>
                    <SRPCPFCNPJInvalido>N</SRPCPFCNPJInvalido>
                    <SRPNomeContribuinte>JOSE FERREIRA MENDES</SRPNomeContribuinte>
                    <SRPCPFCNPJContribuinte>00733300430</SRPCPFCNPJContribuinte>
                    <SDTRetornoPertencesImovel>
                        <SDTRetornoPertencesImovelItem>
                            <SRPInscricaoImovel>000000000012359</SRPInscricaoImovel>
                            <SRPDebitoSuspensoImovel>N</SRPDebitoSuspensoImovel>
                            <SRPTipoImovel>Predial</SRPTipoImovel>
                            <SRPEnderecoImovel>RUA - BELA VISTA, 957 - BRASILIA - ARAPIRACA/</SRPEnderecoImovel>
                            <SRPTipoProprietario>Principal</SRPTipoProprietario>
                            <SRPPossuiDebitoImovel>N</SRPPossuiDebitoImovel>
                            <SRPProprietario>0</SRPProprietario>
                        </SDTRetornoPertencesImovelItem>
                        <SDTRetornoPertencesImovelItem>
                            <SRPInscricaoImovel>000000000040032</SRPInscricaoImovel>
                            <SRPDebitoSuspensoImovel>N</SRPDebitoSuspensoImovel>
                            <SRPTipoImovel>Predial</SRPTipoImovel>
                            <SRPEnderecoImovel>RUA - JOSE RAIMUNDO, 40 - JARDIM ESPERANCA - ARAPIRACA/AL</SRPEnderecoImovel>
                            <SRPTipoProprietario>Principal</SRPTipoProprietario>
                            <SRPPossuiDebitoImovel>S</SRPPossuiDebitoImovel>
                            <SRPProprietario>0</SRPProprietario>
                        </SDTRetornoPertencesImovelItem>
                    </SDTRetornoPertencesImovel>
                </SDTRetornoPertences.SDTRetornoPertencesItem>
            </Sdtretornopertences>
        </PWSRetornoPertences.ExecuteResponse>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

async function testarCorrecaoEnderecos() {
  console.log('🧪 TESTE: Correção de endereços duplicados');
  console.log('='.repeat(60));
  
  const service = new CadastroGeralService();
  
  // Testar o parser atualizado
  const resultado = service.extrairDadosCompletos(xmlComProblema);
  
  console.log('\n📋 RESULTADO:');
  console.log(`- Contribuinte: ${resultado.contribuinte.nome}`);
  console.log(`- CPF: ${resultado.contribuinte.cpfCnpj}`);
  console.log(`- Código: ${resultado.contribuinte.codigo}`);
  console.log(`- Imóveis encontrados: ${resultado.imoveis.length}\n`);
  
  resultado.imoveis.forEach((imovel, index) => {
    console.log(`🏠 Imóvel ${index + 1}:`);
    console.log(`   📍 Inscrição: ${imovel.inscricao}`);
    console.log(`   🏘️ Endereço: ${imovel.endereco}`);
    console.log(`   🏢 Tipo: ${imovel.tipoImovel}`);
    console.log(`   👤 Proprietário: ${imovel.tipoProprietario}`);
    console.log(`   💰 Possui débito: ${imovel.possuiDebito}`);
    console.log(`   ⚠️ Débito suspenso: ${imovel.statusDebito}`);
    console.log('');
  });
  
  // Verificar se os endereços estão corretos
  const endereco1 = resultado.imoveis[0]?.endereco;
  const endereco2 = resultado.imoveis[1]?.endereco;
  
  const problemaSolucionado = 
    endereco1 !== endereco2 && 
    !endereco1?.includes('JOSE RAIMUNDO') && 
    !endereco2?.includes('BELA VISTA');
  
  console.log('✅ VERIFICAÇÃO:');
  console.log(`- Endereços diferentes: ${endereco1 !== endereco2 ? 'SIM' : 'NÃO'}`);
  console.log(`- Problema solucionado: ${problemaSolucionado ? 'SIM' : 'NÃO'}`);
  
  if (problemaSolucionado) {
    console.log('\n🎉 SUCESSO! Os endereços agora estão sendo associados corretamente a cada imóvel!');
  } else {
    console.log('\n❌ PROBLEMA AINDA EXISTE! Verificar lógica de extração.');
  }
}

testarCorrecaoEnderecos().catch(console.error);
