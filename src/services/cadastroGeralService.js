const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { EMOJIS, ESTADOS } = require('../config/constants');
const { definirEstadoUsuario, obterEstadoUsuario } = require('./stateService');
const { validarCPF, validarCNPJ } = require('../utils/validationUtils');

/**
 * Serviço para consulta de Cadastro Geral via WebService SOAP da Ábaco
 * 
 * =================== GUIA PARA ATUALIZAÇÃO DO PARSER ===================
 * 
 * Como atualizar o parser quando receber exemplos reais de XML:
 * 
 * 1. LOCALIZAR ARQUIVOS XML SALVOS:
 *    - Os XMLs são salvos em: /logs/soap_response_[documento]_[timestamp].xml
 *    - Índice dos arquivos: /logs/soap_responses_index.txt
 * 
 * 2. ANALISAR ESTRUTURA DO XML REAL:
 *    - Abrir o arquivo XML salvo
 *    - Identificar as tags que contêm as inscrições
 *    - Observar a estrutura: <tag>valor</tag>
 * 
 * 3. ATUALIZAR OS PADRÕES NO PARSER:
 *    - Localizar a array 'padroesPossveis' na função 'processarRespostaSoap'
 *    - Adicionar novos padrões regex baseados na estrutura real
 *    - Exemplo: se o XML tem <inscricao_municipal>12345</inscricao_municipal>
 *      Adicionar: /<inscricao_municipal[^>]*>([^<]+)<\/inscricao_municipal>/gi
 * 
 * 4. TESTAR E VALIDAR:
 *    - Fazer uma consulta de teste
 *    - Verificar se o novo padrão captura os dados corretamente
 *    - Ajustar o tipo de inscrição na lógica de determinação de tipo
 * 
 * 5. PADRÕES COMUNS PARA ADICIONAR:
 *    - Tags específicas: /<nome_tag[^>]*>([^<]+)<\/nome_tag>/gi
 *    - Tags com atributos: /<nome_tag[^>]*tipo="municipal"[^>]*>([^<]+)<\/nome_tag>/gi
 *    - Valores em atributos: /nome_tag="([^"]+)"/gi
 * 
 * LOGS DETALHADOS:
 * - Todos os XMLs são automaticamente salvos em arquivos
 * - Logs completos são exibidos no console
 * - Indicadores de erro/sucesso são analisados automaticamente
 * 
 * =================== FIM GUIA PARA ATUALIZAÇÃO ===================
 */
class CadastroGeralService {
  constructor() {
    this.wsdlUrl = "https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apwsretornopertences?wsdl";
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutos
    
    // Garantir que a pasta de logs existe
    this.logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
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
      'consultar dados',
      'quero consultar',
      'consultar inscrição',
      'consulta inscrição',
      'meu cpf',
      'meu cnpj',
      'verificar cpf',
      'verificar cnpj',
      'dados do cpf',
      'dados do cnpj'
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
    
    // LOGS DETALHADOS - Salvar XML completo ANTES de qualquer processamento
    this.salvarXmlParaAnalise(response.data, documento);
    
    // Processar resposta XML
    return this.processarRespostaSoap(response.data);
  }

  /**
   * Função utilitária para salvar XML completo para análise
   */
  salvarXmlParaAnalise(xmlData, documento) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `soap_response_${documento}_${timestamp}.xml`;
    const filePath = path.join(this.logsDir, fileName);
    
    try {
      // Salvar arquivo XML completo
      fs.writeFileSync(filePath, xmlData, 'utf8');
      
      // Log detalhado no console
      console.log(`[CadastroGeralService] =================== INÍCIO XML COMPLETO ===================`);
      console.log(`[CadastroGeralService] Documento: ${documento}`);
      console.log(`[CadastroGeralService] Timestamp: ${new Date().toISOString()}`);
      console.log(`[CadastroGeralService] Arquivo salvo: ${fileName}`);
      console.log(`[CadastroGeralService] Tamanho do XML: ${xmlData.length} caracteres`);
      console.log(`[CadastroGeralService] ----- XML COMPLETO -----`);
      console.log(xmlData);
      console.log(`[CadastroGeralService] ----- FIM XML COMPLETO -----`);
      console.log(`[CadastroGeralService] =================== FIM XML COMPLETO ===================`);
      
      // Arquivo de índice para facilitar localização
      const indexPath = path.join(this.logsDir, 'soap_responses_index.txt');
      const indexEntry = `${new Date().toISOString()} - ${documento} - ${fileName}\n`;
      fs.appendFileSync(indexPath, indexEntry, 'utf8');
      
    } catch (error) {
      console.error(`[CadastroGeralService] Erro ao salvar XML para análise:`, error);
    }
  }

  /**
   * Processa a resposta SOAP XML
   */
  processarRespostaSoap(xmlData) {
    console.log(`[CadastroGeralService] Processando resposta SOAP`);
    
    // Log da resposta para debug - AGORA MOSTRA XML COMPLETO
    console.log(`[CadastroGeralService] =================== PROCESSAMENTO XML ===================`);
    console.log(`[CadastroGeralService] XML completo recebido:`, xmlData);
    console.log(`[CadastroGeralService] =================== FIM PROCESSAMENTO XML ===================`);
    
    const inscricoes = [];
    
    try {
      // Normalizar XML removendo quebras de linha e espaços extras
      const xmlLimpo = xmlData.replace(/\s+/g, ' ').trim();
      
      // PARSER FLEXÍVEL - Buscar por diferentes padrões possíveis na resposta XML
      // Este parser é adaptativo e pode ser facilmente modificado quando recebermos exemplos reais
      const padroesPossveis = [
        // Padrões mais específicos (baseados em nomes conhecidos)
        /<inscricao[^>]*>([^<]+)<\/inscricao>/gi,
        /<inscricao_municipal[^>]*>([^<]+)<\/inscricao_municipal>/gi,
        /<inscricao_imobiliaria[^>]*>([^<]+)<\/inscricao_imobiliaria>/gi,
        /<municipal[^>]*>([^<]+)<\/municipal>/gi,
        /<imobiliaria[^>]*>([^<]+)<\/imobiliaria>/gi,
        
        // Padrões mais genéricos (capturam variações)
        /<[^>]*inscr[^>]*>([^<]+)<\/[^>]*>/gi,
        /<[^>]*munic[^>]*>([^<]+)<\/[^>]*>/gi,
        /<[^>]*imob[^>]*>([^<]+)<\/[^>]*>/gi,
        
        // Padrões para capturar códigos/números em tags genéricas
        /<codigo[^>]*>([^<]+)<\/codigo>/gi,
        /<numero[^>]*>([^<]+)<\/numero>/gi,
        /<id[^>]*>([^<]+)<\/id>/gi,
        
        // Buscar qualquer número que pareça uma inscrição (6+ dígitos)
        />(\d{6,})</g,
        
        // Padrões para diferentes formatos de resposta que podem vir
        /<return[^>]*>([^<]+)<\/return>/gi,
        /<result[^>]*>([^<]+)<\/result>/gi,
        /<response[^>]*>([^<]+)<\/response>/gi
      ];
      
      for (const padrao of padroesPossveis) {
        let match;
        while ((match = padrao.exec(xmlLimpo)) !== null) {
          const valor = match[1].trim();
          
          // Filtrar valores válidos (evitar números muito pequenos ou muito grandes)
          if (valor && valor.length >= 3 && valor.length <= 20 && /^\d+$/.test(valor)) {
            // Determinar tipo baseado no padrão encontrado
            let tipo = 'Municipal'; // Padrão
            
            if (padrao.source.includes('imob')) {
              tipo = 'Imobiliária';
            }
            
            // Evitar duplicatas
            const jaExiste = inscricoes.some(insc => insc.numero === valor);
            if (!jaExiste) {
              inscricoes.push({
                tipo: tipo,
                numero: valor
              });
            }
          }
        }
      }
      
      // ANÁLISE CONTEXTUAL DA RESPOSTA - Verificar diferentes tipos de resposta
      const xmlLimpoLower = xmlLimpo.toLowerCase();
      
      // Verificar se há indicação de erro na resposta
      const temErro = xmlLimpoLower.includes('erro') || 
                     xmlLimpoLower.includes('error') ||
                     xmlLimpoLower.includes('falha') ||
                     xmlLimpoLower.includes('fault') ||
                     xmlLimpoLower.includes('exception') ||
                     xmlLimpoLower.includes('nao encontrado') ||
                     xmlLimpoLower.includes('não encontrado') ||
                     xmlLimpoLower.includes('invalid') ||
                     xmlLimpoLower.includes('inválido');
      
      // Verificar se há indicação de sucesso mas sem dados
      const temSucesso = xmlLimpoLower.includes('sucesso') || 
                        xmlLimpoLower.includes('success') ||
                        xmlLimpoLower.includes('ok') ||
                        xmlLimpoLower.includes('true') ||
                        xmlLimpoLower.includes('válido') ||
                        xmlLimpoLower.includes('valido');
      
      // Verificar se é uma resposta vazia/nula
      const temResposta = xmlLimpoLower.includes('return') ||
                         xmlLimpoLower.includes('response') ||
                         xmlLimpoLower.includes('result') ||
                         xmlLimpoLower.includes('body');
      
      if (inscricoes.length === 0) {
        if (temErro) {
          console.log(`[CadastroGeralService] Resposta indica erro no webservice`);
          return {
            inscricoes: [],
            encontrado: false,
            erro: 'Erro reportado pelo webservice',
            xmlOriginal: xmlData
          };
        } else if (temSucesso) {
          console.log(`[CadastroGeralService] Resposta indica sucesso mas sem dados`);
          return {
            inscricoes: [],
            encontrado: false,
            semDados: true,
            xmlOriginal: xmlData
          };
        } else {
          console.log(`[CadastroGeralService] =================== ESTRUTURA XML NÃO RECONHECIDA ===================`);
          console.log(`[CadastroGeralService] Não foi possível extrair dados com os padrões atuais`);
          console.log(`[CadastroGeralService] Indicadores encontrados:`);
          console.log(`[CadastroGeralService] - Tem erro: ${temErro}`);
          console.log(`[CadastroGeralService] - Tem sucesso: ${temSucesso}`);
          console.log(`[CadastroGeralService] - Tem resposta: ${temResposta}`);
          console.log(`[CadastroGeralService] - Tamanho XML: ${xmlData.length} caracteres`);
          console.log(`[CadastroGeralService] XML já foi salvo em arquivo para análise detalhada`);
          console.log(`[CadastroGeralService] =================== FIM ANÁLISE ESTRUTURA ===================`);
          
          return {
            inscricoes: [],
            encontrado: false,
            estruturaNaoReconhecida: true,
            xmlOriginal: xmlData,
            indicadores: {
              temErro,
              temSucesso,
              temResposta,
              tamanhoXml: xmlData.length
            }
          };
        }
      }
      
      console.log(`[CadastroGeralService] Encontradas ${inscricoes.length} inscrições:`, inscricoes);
      
      return {
        inscricoes: inscricoes,
        encontrado: inscricoes.length > 0,
        xmlOriginal: xmlData
      };
      
    } catch (error) {
      console.error(`[CadastroGeralService] Erro ao processar XML:`, error);
      return {
        inscricoes: [],
        encontrado: false,
        erro: error.message,
        xmlOriginal: xmlData
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
      let mensagemEspecifica = "Nenhuma inscrição ativa encontrada para este documento.";
      let detalhesAdicionais = `${EMOJIS.DICA} *Isso pode significar:*
• O documento não possui inscrições no sistema
• As inscrições estão inativas
• O documento foi digitado incorretamente`;

      // Personalizar mensagem baseada no tipo de resposta
      if (dados.erro) {
        mensagemEspecifica = "Erro ao consultar o sistema. Tente novamente em alguns minutos.";
        detalhesAdicionais = `${EMOJIS.FERRAMENTA} *Detalhes técnicos:*
• Sistema temporariamente indisponível
• Verifique sua conexão com a internet`;
      } else if (dados.estruturaNaoReconhecida) {
        mensagemEspecifica = "Consulta realizada com sucesso, mas a resposta precisa ser analisada.";
        detalhesAdicionais = `${EMOJIS.INFO} *O que aconteceu:*
• A consulta foi enviada ao sistema da Ábaco
• A resposta foi recebida mas está em formato diferente do esperado
• Nossa equipe técnica analisará a estrutura da resposta

${EMOJIS.TELEFONE} *Contate o suporte para análise:*
smfaz@arapiraca.al.gov.br`;
      } else if (dados.semDados) {
        mensagemEspecifica = "Sistema consultado com sucesso - nenhuma inscrição vinculada.";
        detalhesAdicionais = `${EMOJIS.SUCESSO} *Confirmação:*
• Consulta realizada com sucesso
• O documento não possui inscrições ativas no momento`;
      }

      return {
        type: 'text',
        text: `${EMOJIS.BUSCA} *Consulta de Cadastro Geral*

${EMOJIS.DOCUMENTO} *${tipoDocumento}:* ${documentoFormatado}

${EMOJIS.INFO} *Resultado:*
${mensagemEspecifica}

${detalhesAdicionais}

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
