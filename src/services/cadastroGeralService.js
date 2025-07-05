const axios = require('axios');
const { EMOJIS, ESTADOS } = require('../config/constants');
const { definirEstadoUsuario, obterEstadoUsuario } = require('./stateService');
const { validarCPF, validarCNPJ } = require('../utils/validationUtils');

/**
 * Serviço para consulta de Cadastro Geral via WebService SOAP da Ábaco
 */
class CadastroGeralService {
  constructor() {
    this.wsdlUrl = "https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apwsretornopertences?wsdl";
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Detecta se a mensagem é uma intenção de consulta de cadastro geral
   */
  detectarIntencaoCadastroGeral(message) {
    const msgLimpa = message.toLowerCase().trim();
    
    const palavrasChave = [
      'consulta cadastro',
      'consultar cadastro',
      'cadastro geral',
      'consultar inscricao',
      'consulta inscricao',
      'consultar cpf',
      'consulta cpf',
      'consultar cnpj',
      'consulta cnpj',
      'inscricao municipal',
      'inscricao imobiliaria',
      'vinculos',
      'consultar dados'
    ];

    return palavrasChave.some(palavra => msgLimpa.includes(palavra));
  }

  /**
   * Inicia o fluxo de consulta de cadastro geral
   */
  iniciarConsultaCadastroGeral(sender, nome) {
    console.log(`[CadastroGeralService] Iniciando consulta para ${sender}`);
    
    definirEstadoUsuario(sender, ESTADOS.OPCAO_9_CADASTRO_GERAL);
    
    return {
      type: 'text',
      text: `${EMOJIS.BUSCA} *Consulta de Cadastro Geral*

${nome}, informe o *CPF* ou *CNPJ* para consultar as inscrições vinculadas:

${EMOJIS.PESSOA} *CPF:* apenas números (11 dígitos)
${EMOJIS.EMPRESA} *CNPJ:* apenas números (14 dígitos)

${EMOJIS.EXEMPLO} *Exemplo:*
• CPF: 12345678901
• CNPJ: 12345678000123

${EMOJIS.INFO} *Esta consulta retorna:*
• Inscrições Municipais
• Inscrições Imobiliárias
• Dados Cadastrais básicos

Digite *menu* para voltar ao menu principal.`
    };
  }

  /**
   * Processa a etapa atual do fluxo
   */
  async processarEtapa(sender, message) {
    const estado = obterEstadoUsuario(sender);
    const msgLimpa = message.toLowerCase().trim();

    console.log(`[CadastroGeralService] Processando etapa - Estado: ${estado}, Mensagem: ${msgLimpa}`);

    // Verificar se usuário quer sair
    if (this.verificarComandoSaida(msgLimpa)) {
      return {
        type: 'redirect',
        action: 'menu_principal'
      };
    }

    if (estado === ESTADOS.OPCAO_9_CADASTRO_GERAL) {
      return await this.processarCpfCnpj(sender, message);
    }

    return {
      type: 'text',
      text: `${EMOJIS.ERRO} Estado não reconhecido. Digite *menu* para voltar ao menu principal.`
    };
  }

  /**
   * Processa o CPF/CNPJ informado pelo usuário
   */
  async processarCpfCnpj(sender, message) {
    const documento = message.replace(/\D/g, ''); // Remove caracteres não numéricos
    
    console.log(`[CadastroGeralService] Processando documento: ${documento}`);

    // Validar se o documento foi informado
    if (!documento) {
      return {
        type: 'text',
        text: `${EMOJIS.ERRO} *Documento inválido*

Por favor, informe apenas os números do CPF ou CNPJ:

${EMOJIS.PESSOA} *CPF:* 11 dígitos
${EMOJIS.EMPRESA} *CNPJ:* 14 dígitos

${EMOJIS.EXEMPLO} *Exemplo:* 12345678901`
      };
    }

    // Validar CPF (11 dígitos)
    if (documento.length === 11) {
      if (!validarCPF(documento)) {
        return {
          type: 'text',
          text: `${EMOJIS.ERRO} *CPF inválido*

O CPF informado não possui um formato válido.

${EMOJIS.DICA} Verifique se digitou corretamente os 11 dígitos.`
        };
      }
    }
    // Validar CNPJ (14 dígitos)
    else if (documento.length === 14) {
      if (!validarCNPJ(documento)) {
        return {
          type: 'text',
          text: `${EMOJIS.ERRO} *CNPJ inválido*

O CNPJ informado não possui um formato válido.

${EMOJIS.DICA} Verifique se digitou corretamente os 14 dígitos.`
        };
      }
    }
    // Documento com tamanho inválido
    else {
      return {
        type: 'text',
        text: `${EMOJIS.ERRO} *Documento inválido*

${EMOJIS.PESSOA} *CPF:* deve ter 11 dígitos
${EMOJIS.EMPRESA} *CNPJ:* deve ter 14 dígitos

${EMOJIS.INFO} Você digitou ${documento.length} dígitos.`
      };
    }

    // Verificar cache
    const chaveCache = `cadastro_${documento}`;
    const dadosCache = this.cache.get(chaveCache);
    
    if (dadosCache && (Date.now() - dadosCache.timestamp) < this.cacheTTL) {
      console.log(`[CadastroGeralService] Retornando dados do cache para ${documento}`);
      return this.formatarResposta(dadosCache.data, documento);
    }

    // Realizar consulta SOAP
    try {
      console.log(`[CadastroGeralService] Realizando consulta SOAP para ${documento}`);
      
      const resultados = await this.consultarCadastroGeral(documento);
      
      // Armazenar no cache
      this.cache.set(chaveCache, {
        data: resultados,
        timestamp: Date.now()
      });

      return this.formatarResposta(resultados, documento);
      
    } catch (error) {
      console.error(`[CadastroGeralService] Erro na consulta:`, error);
      
      return {
        type: 'text',
        text: `${EMOJIS.ERRO} *Erro na consulta*

Não foi possível realizar a consulta no momento.

${EMOJIS.DICA} *Tente novamente em alguns minutos ou:*
• Verifique se o documento está correto
• Acesse o portal: https://arapiraca.abaco.com.br/eagata/portal/

${EMOJIS.TELEFONE} *Suporte:* smfaz@arapiraca.al.gov.br`
      };
    }
  }

  /**
   * Consulta o cadastro geral via WebService SOAP
   */
  async consultarCadastroGeral(documento) {
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:eag="eAgata_Arapiraca_Maceio_Ev3">
   <soapenv:Header/>
   <soapenv:Body>
      <eag:PWSRetornoPertences.Execute>
         <eag:Flagtipopesquisa>C</eag:Flagtipopesquisa>
         <eag:Ctgcpf>${documento}</eag:Ctgcpf>
         <eag:Ctiinscricao></eag:Ctiinscricao>
      </eag:PWSRetornoPertences.Execute>
   </soapenv:Body>
</soapenv:Envelope>`;

    const config = {
      method: 'post',
      url: this.wsdlUrl,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'PWSRetornoPertences.Execute'
      },
      data: soapEnvelope,
      timeout: 30000 // 30 segundos
    };

    console.log(`[CadastroGeralService] Enviando requisição SOAP para ${this.wsdlUrl}`);

    const response = await axios(config);
    
    console.log(`[CadastroGeralService] Resposta recebida - Status: ${response.status}`);
    
    // Processar resposta XML
    return this.processarRespostaSoap(response.data);
  }

  /**
   * Processa a resposta SOAP XML
   */
  processarRespostaSoap(xmlData) {
    console.log(`[CadastroGeralService] Processando resposta SOAP`);
    
    // Converter XML para objeto JavaScript (implementação simplificada)
    // Em produção, considere usar uma biblioteca como xml2js
    const inscricoes = [];
    
    try {
      // Buscar por padrões na resposta XML
      const linhasXml = xmlData.split('\n');
      
      for (const linha of linhasXml) {
        // Buscar inscrições municipais
        const matchInscricaoMunicipal = linha.match(/<inscricao[^>]*>([^<]+)<\/inscricao>/i);
        if (matchInscricaoMunicipal) {
          inscricoes.push({
            tipo: 'Municipal',
            numero: matchInscricaoMunicipal[1].trim()
          });
        }
        
        // Buscar inscrições imobiliárias
        const matchInscricaoImobiliaria = linha.match(/<inscricao_imobiliaria[^>]*>([^<]+)<\/inscricao_imobiliaria>/i);
        if (matchInscricaoImobiliaria) {
          inscricoes.push({
            tipo: 'Imobiliária',
            numero: matchInscricaoImobiliaria[1].trim()
          });
        }
      }
      
      // Se não encontrou padrões específicos, buscar por estrutura genérica
      if (inscricoes.length === 0) {
        // Implementar parsing mais robusto baseado na estrutura real da resposta
        // Por enquanto, simular dados para teste
        console.log(`[CadastroGeralService] Estrutura XML não reconhecida, retornando dados vazios`);
      }
      
      return {
        inscricoes: inscricoes,
        encontrado: inscricoes.length > 0,
        xmlOriginal: xmlData // Para debug
      };
      
    } catch (error) {
      console.error(`[CadastroGeralService] Erro ao processar XML:`, error);
      return {
        inscricoes: [],
        encontrado: false,
        erro: error.message
      };
    }
  }

  /**
   * Formata a resposta para o usuário
   */
  formatarResposta(dados, documento) {
    const tipoDocumento = documento.length === 11 ? 'CPF' : 'CNPJ';
    const documentoFormatado = this.formatarDocumento(documento);
    
    if (!dados.encontrado || dados.inscricoes.length === 0) {
      return {
        type: 'text',
        text: `${EMOJIS.BUSCA} *Consulta de Cadastro Geral*

${EMOJIS.DOCUMENTO} *${tipoDocumento}:* ${documentoFormatado}

${EMOJIS.INFO} *Resultado:*
Nenhuma inscrição ativa encontrada para este documento.

${EMOJIS.DICA} *Isso pode significar:*
• O documento não possui inscrições no sistema
• As inscrições estão inativas
• O documento foi digitado incorretamente

${EMOJIS.INTERNET} *Portal do Contribuinte:*
https://arapiraca.abaco.com.br/eagata/portal/

Digite *menu* para voltar ao menu principal.`
      };
    }

    let textoResposta = `${EMOJIS.SUCESSO} *Consulta de Cadastro Geral*

${EMOJIS.DOCUMENTO} *${tipoDocumento}:* ${documentoFormatado}

${EMOJIS.BUSCA} *Inscrições encontradas:*\n`;

    // Agrupar inscrições por tipo
    const inscricoesMunicipais = dados.inscricoes.filter(i => i.tipo === 'Municipal');
    const inscricoesImobiliarias = dados.inscricoes.filter(i => i.tipo === 'Imobiliária');

    if (inscricoesMunicipais.length > 0) {
      textoResposta += `\n${EMOJIS.EMPRESA} *Inscrições Municipais:*\n`;
      inscricoesMunicipais.forEach(inscricao => {
        textoResposta += `• ${inscricao.numero}\n`;
      });
    }

    if (inscricoesImobiliarias.length > 0) {
      textoResposta += `\n${EMOJIS.CASA} *Inscrições Imobiliárias:*\n`;
      inscricoesImobiliarias.forEach(inscricao => {
        textoResposta += `• ${inscricao.numero}\n`;
      });
    }

    textoResposta += `\n${EMOJIS.INFO} *Para mais detalhes:*
• Acesse o Portal do Contribuinte
• Digite *1* para segunda via de DAM
• Digite *2* para certidões

${EMOJIS.INTERNET} *Portal:*
https://arapiraca.abaco.com.br/eagata/portal/

Digite *menu* para voltar ao menu principal.`;

    return {
      type: 'text',
      text: textoResposta
    };
  }

  /**
   * Formata o documento para exibição
   */
  formatarDocumento(documento) {
    if (documento.length === 11) {
      // CPF: 123.456.789-01
      return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (documento.length === 14) {
      // CNPJ: 12.345.678/0001-23
      return documento.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return documento;
  }

  /**
   * Verifica se é um comando de saída
   */
  verificarComandoSaida(msgLimpa) {
    const comandosSaida = ['menu', 'voltar', 'cancelar', 'sair'];
    return comandosSaida.some(comando => msgLimpa.includes(comando));
  }

  /**
   * Limpa cache antigo
   */
  limparCache() {
    const agora = Date.now();
    for (const [chave, dados] of this.cache.entries()) {
      if (agora - dados.timestamp > this.cacheTTL) {
        this.cache.delete(chave);
      }
    }
  }
}

module.exports = { CadastroGeralService };
