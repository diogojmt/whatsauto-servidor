const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { EMOJIS, ESTADOS } = require("../config/constants");
const { definirEstadoUsuario, obterEstadoUsuario } = require("./stateService");
const { validarCPF, validarCNPJ } = require("../utils/validationUtils");

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
    this.wsdlUrl =
      "https://homologacao.abaco.com.br/arapiraca_proj_hml_eagata/servlet/apwsretornopertences?wsdl";
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutos

    // Garantir que a pasta de logs existe
    this.logsDir = path.join(__dirname, "../../logs");
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
      "consulta cadastro",
      "consultar cadastro",
      "cadastro geral",
      "consultar inscricao",
      "consulta inscricao",
      "consultar cpf",
      "consulta cpf",
      "consultar cnpj",
      "consulta cnpj",
      "inscricao municipal",
      "inscricao imobiliaria",
      "vinculos",
      "consultar dados",
      "quero consultar",
      "consultar inscrição",
      "consulta inscrição",
      "meu cpf",
      "meu cnpj",
      "verificar cpf",
      "verificar cnpj",
      "dados do cpf",
      "dados do cnpj",
    ];

    return palavrasChave.some((palavra) => msgLimpa.includes(palavra));
  }

  /**
   * Inicia o fluxo de consulta de cadastro geral
   */
  iniciarConsultaCadastroGeral(sender, nome) {
    console.log(`[CadastroGeralService] Iniciando consulta para ${sender}`);

    definirEstadoUsuario(sender, ESTADOS.OPCAO_9_CADASTRO_GERAL);

    return {
      type: "text",
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

Digite *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Processa a etapa atual do fluxo
   */
  async processarEtapa(sender, message) {
    const estado = obterEstadoUsuario(sender);
    const msgLimpa = message.toLowerCase().trim();

    console.log(
      `[CadastroGeralService] Processando etapa - Estado: ${estado}, Mensagem: ${msgLimpa}`
    );

    // Verificar se usuário quer sair
    if (this.verificarComandoSaida(msgLimpa)) {
      return {
        type: "redirect",
        action: "menu_principal",
      };
    }

    if (estado === ESTADOS.OPCAO_9_CADASTRO_GERAL) {
      return await this.processarCpfCnpj(sender, message);
    }

    return {
      type: "text",
      text: `${EMOJIS.ERRO} Estado não reconhecido. Digite *menu* para voltar ao menu principal.`,
    };
  }

  /**
   * Processa o CPF/CNPJ informado pelo usuário
   */
  async processarCpfCnpj(sender, message) {
    const documento = message.replace(/\D/g, ""); // Remove caracteres não numéricos

    console.log(`[CadastroGeralService] Processando documento: ${documento}`);

    // Validar se o documento foi informado
    if (!documento) {
      return {
        type: "text",
        text: `${EMOJIS.ERRO} *Documento inválido*

Por favor, informe apenas os números do CPF ou CNPJ:

${EMOJIS.PESSOA} *CPF:* 11 dígitos
${EMOJIS.EMPRESA} *CNPJ:* 14 dígitos

${EMOJIS.EXEMPLO} *Exemplo:* 12345678901`,
      };
    }

    // Validar CPF (11 dígitos)
    if (documento.length === 11) {
      if (!validarCPF(documento)) {
        return {
          type: "text",
          text: `${EMOJIS.ERRO} *CPF inválido*

O CPF informado não possui um formato válido.

${EMOJIS.DICA} Verifique se digitou corretamente os 11 dígitos.`,
        };
      }
    }
    // Validar CNPJ (14 dígitos)
    else if (documento.length === 14) {
      if (!validarCNPJ(documento)) {
        return {
          type: "text",
          text: `${EMOJIS.ERRO} *CNPJ inválido*

O CNPJ informado não possui um formato válido.

${EMOJIS.DICA} Verifique se digitou corretamente os 14 dígitos.`,
        };
      }
    }
    // Documento com tamanho inválido
    else {
      return {
        type: "text",
        text: `${EMOJIS.ERRO} *Documento inválido*

${EMOJIS.PESSOA} *CPF:* deve ter 11 dígitos
${EMOJIS.EMPRESA} *CNPJ:* deve ter 14 dígitos

${EMOJIS.INFO} Você digitou ${documento.length} dígitos.`,
      };
    }

    // Verificar cache
    const chaveCache = `cadastro_${documento}`;
    const dadosCache = this.cache.get(chaveCache);

    if (dadosCache && Date.now() - dadosCache.timestamp < this.cacheTTL) {
      console.log(
        `[CadastroGeralService] Retornando dados do cache para ${documento}`
      );
      return this.formatarResposta(dadosCache.data, documento);
    }

    // Realizar consulta SOAP
    try {
      console.log(
        `[CadastroGeralService] Realizando consulta SOAP para ${documento}`
      );

      const resultados = await this.consultarCadastroGeral(documento);

      // Armazenar no cache
      this.cache.set(chaveCache, {
        data: resultados,
        timestamp: Date.now(),
      });

      return this.formatarResposta(resultados, documento);
    } catch (error) {
      console.error(`[CadastroGeralService] Erro na consulta:`, error);

      return {
        type: "text",
        text: `${EMOJIS.ERRO} *Erro na consulta*

Não foi possível realizar a consulta no momento.

${EMOJIS.DICA} *Tente novamente em alguns minutos ou:*
• Verifique se o documento está correto
• Acesse o portal: https://arapiraca.abaco.com.br/eagata/portal/

${EMOJIS.TELEFONE} *Suporte:* smfaz@arapiraca.al.gov.br`,
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
      method: "post",
      url: this.wsdlUrl,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "PWSRetornoPertences.Execute",
      },
      data: soapEnvelope,
      timeout: 30000, // 30 segundos
    };

    console.log(
      `[CadastroGeralService] Enviando requisição SOAP para ${this.wsdlUrl}`
    );

    const response = await axios(config);

    console.log(
      `[CadastroGeralService] Resposta recebida - Status: ${response.status}`
    );

    // LOGS DETALHADOS - Salvar XML completo ANTES de qualquer processamento
    this.salvarXmlParaAnalise(response.data, documento);

    // Processar resposta XML
    return this.processarRespostaSoap(response.data);
  }

  /**
   * Função utilitária para salvar XML completo para análise
   */
  salvarXmlParaAnalise(xmlData, documento) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `soap_response_${documento}_${timestamp}.xml`;
    const filePath = path.join(this.logsDir, fileName);

    try {
      // Salvar arquivo XML completo
      fs.writeFileSync(filePath, xmlData, "utf8");

      // Log detalhado no console
      console.log(
        `[CadastroGeralService] =================== INÍCIO XML COMPLETO ===================`
      );
      console.log(`[CadastroGeralService] Documento: ${documento}`);
      console.log(
        `[CadastroGeralService] Timestamp: ${new Date().toISOString()}`
      );
      console.log(`[CadastroGeralService] Arquivo salvo: ${fileName}`);
      console.log(
        `[CadastroGeralService] Tamanho do XML: ${xmlData.length} caracteres`
      );
      console.log(`[CadastroGeralService] ----- XML COMPLETO -----`);
      console.log(xmlData);
      console.log(`[CadastroGeralService] ----- FIM XML COMPLETO -----`);
      console.log(
        `[CadastroGeralService] =================== FIM XML COMPLETO ===================`
      );

      // Arquivo de índice para facilitar localização
      const indexPath = path.join(this.logsDir, "soap_responses_index.txt");
      const indexEntry = `${new Date().toISOString()} - ${documento} - ${fileName}\n`;
      fs.appendFileSync(indexPath, indexEntry, "utf8");
    } catch (error) {
      console.error(
        `[CadastroGeralService] Erro ao salvar XML para análise:`,
        error
      );
    }
  }

  /**
   * Processa a resposta SOAP XML - PARSER APRIMORADO
   */
  processarRespostaSoap(xmlData) {
    console.log(`[CadastroGeralService] Processando resposta SOAP`);

    // Log da resposta para debug - AGORA MOSTRA XML COMPLETO
    console.log(
      `[CadastroGeralService] =================== PROCESSAMENTO XML ===================`
    );
    console.log(`[CadastroGeralService] XML completo recebido:`, xmlData);
    console.log(
      `[CadastroGeralService] =================== FIM PROCESSAMENTO XML ===================`
    );

    try {
      // Normalizar XML removendo quebras de linha e espaços extras
      const xmlLimpo = xmlData.replace(/\s+/g, " ").trim();

      // PARSER APRIMORADO - Extrair informações completas do contribuinte
      const dadosCompletos = this.extrairDadosCompletos(xmlLimpo);

      // ANÁLISE CONTEXTUAL DA RESPOSTA - Verificar diferentes tipos de resposta
      const xmlLimpoLower = xmlLimpo.toLowerCase();

      // Verificar se há indicação de erro na resposta
      const temErro =
        xmlLimpoLower.includes("erro") ||
        xmlLimpoLower.includes("error") ||
        xmlLimpoLower.includes("falha") ||
        xmlLimpoLower.includes("fault") ||
        xmlLimpoLower.includes("exception") ||
        xmlLimpoLower.includes("nao encontrado") ||
        xmlLimpoLower.includes("não encontrado") ||
        xmlLimpoLower.includes("invalid") ||
        xmlLimpoLower.includes("inválido");

      // Verificar se há indicação de sucesso mas sem dados
      const temSucesso =
        xmlLimpoLower.includes("sucesso") ||
        xmlLimpoLower.includes("success") ||
        xmlLimpoLower.includes("ok") ||
        xmlLimpoLower.includes("true") ||
        xmlLimpoLower.includes("válido") ||
        xmlLimpoLower.includes("valido");

      // Verificar se é uma resposta vazia/nula
      const temResposta =
        xmlLimpoLower.includes("return") ||
        xmlLimpoLower.includes("response") ||
        xmlLimpoLower.includes("result") ||
        xmlLimpoLower.includes("body");

      if (!dadosCompletos.encontrado) {
        if (temErro) {
          console.log(
            `[CadastroGeralService] Resposta indica erro no webservice`
          );
          return {
            encontrado: false,
            erro: "Erro reportado pelo webservice",
            xmlOriginal: xmlData,
          };
        } else if (temSucesso) {
          console.log(
            `[CadastroGeralService] Resposta indica sucesso mas sem dados`
          );
          return {
            encontrado: false,
            semDados: true,
            xmlOriginal: xmlData,
          };
        } else {
          console.log(
            `[CadastroGeralService] =================== ESTRUTURA XML NÃO RECONHECIDA ===================`
          );
          console.log(
            `[CadastroGeralService] Não foi possível extrair dados com os padrões atuais`
          );
          console.log(`[CadastroGeralService] Indicadores encontrados:`);
          console.log(`[CadastroGeralService] - Tem erro: ${temErro}`);
          console.log(`[CadastroGeralService] - Tem sucesso: ${temSucesso}`);
          console.log(`[CadastroGeralService] - Tem resposta: ${temResposta}`);
          console.log(
            `[CadastroGeralService] - Tamanho XML: ${xmlData.length} caracteres`
          );
          console.log(
            `[CadastroGeralService] XML já foi salvo em arquivo para análise detalhada`
          );
          console.log(
            `[CadastroGeralService] =================== FIM ANÁLISE ESTRUTURA ===================`
          );

          return {
            encontrado: false,
            estruturaNaoReconhecida: true,
            xmlOriginal: xmlData,
            indicadores: {
              temErro,
              temSucesso,
              temResposta,
              tamanhoXml: xmlData.length,
            },
          };
        }
      }

      console.log(`[CadastroGeralService] Dados extraídos:`, dadosCompletos);

      return {
        ...dadosCompletos,
        encontrado: true,
        xmlOriginal: xmlData,
      };
    } catch (error) {
      console.error(`[CadastroGeralService] Erro ao processar XML:`, error);
      return {
        encontrado: false,
        erro: error.message,
        xmlOriginal: xmlData,
      };
    }
  }

  /**
   * Extrai dados completos do XML de resposta
   */
  extrairDadosCompletos(xmlLimpo) {
    const contribuinte = {
      nome: null,
      cpfCnpj: null,
      codigo: null,
    };

    const imoveis = [];
    let encontrado = false;

    // PADRÕES PARA EXTRAIR INFORMAÇÕES BÁSICAS DO CONTRIBUINTE
    const padroesDadosBasicos = [
      // Nome do contribuinte
      /<nome[^>]*>([^<]+)<\/nome>/gi,
      /<nome_contribuinte[^>]*>([^<]+)<\/nome_contribuinte>/gi,
      /<razao_social[^>]*>([^<]+)<\/razao_social>/gi,
      /<denominacao[^>]*>([^<]+)<\/denominacao>/gi,

      // CPF/CNPJ
      /<cpf[^>]*>([^<]+)<\/cpf>/gi,
      /<cnpj[^>]*>([^<]+)<\/cnpj>/gi,
      /<documento[^>]*>([^<]+)<\/documento>/gi,

      // Código do contribuinte
      /<codigo[^>]*>([^<]+)<\/codigo>/gi,
      /<codigo_contribuinte[^>]*>([^<]+)<\/codigo_contribuinte>/gi,
      /<cod_contribuinte[^>]*>([^<]+)<\/cod_contribuinte>/gi,
      /<id_contribuinte[^>]*>([^<]+)<\/id_contribuinte>/gi,
    ];

    // Extrair dados básicos
    for (const padrao of padroesDadosBasicos) {
      let match;
      while ((match = padrao.exec(xmlLimpo)) !== null) {
        const valor = match[1].trim();

        if (valor && valor.length > 0) {
          const source = padrao.source.toLowerCase();

          if (
            source.includes("nome") ||
            source.includes("razao") ||
            source.includes("denominacao")
          ) {
            if (!contribuinte.nome) {
              contribuinte.nome = valor;
              encontrado = true;
            }
          } else if (
            source.includes("cpf") ||
            source.includes("cnpj") ||
            source.includes("documento")
          ) {
            if (!contribuinte.cpfCnpj && /^\d+$/.test(valor)) {
              contribuinte.cpfCnpj = valor;
              encontrado = true;
            }
          } else if (
            source.includes("codigo") ||
            source.includes("cod") ||
            source.includes("id")
          ) {
            if (!contribuinte.codigo && /^\d+$/.test(valor)) {
              contribuinte.codigo = valor;
              encontrado = true;
            }
          }
        }
      }
    }

    // PADRÕES PARA EXTRAIR INFORMAÇÕES DOS IMÓVEIS
    const padroesImoveis = [
      // Inscrições imobiliárias
      /<inscricao[^>]*>([^<]+)<\/inscricao>/gi,
      /<inscricao_municipal[^>]*>([^<]+)<\/inscricao_municipal>/gi,
      /<inscricao_imobiliaria[^>]*>([^<]+)<\/inscricao_imobiliaria>/gi,
      /<municipal[^>]*>([^<]+)<\/municipal>/gi,
      /<imobiliaria[^>]*>([^<]+)<\/imobiliaria>/gi,

      // Variações de inscrições
      /<[^>]*inscr[^>]*>([^<]+)<\/[^>]*>/gi,
      /<[^>]*munic[^>]*>([^<]+)<\/[^>]*>/gi,
      /<[^>]*imob[^>]*>([^<]+)<\/[^>]*>/gi,

      // Números genéricos que podem ser inscrições
      /<numero[^>]*>([^<]+)<\/numero>/gi,
      /<id[^>]*>([^<]+)<\/id>/gi,

      // Padrões para diferentes formatos de resposta
      /<return[^>]*>([^<]+)<\/return>/gi,
      /<result[^>]*>([^<]+)<\/result>/gi,
      /<response[^>]*>([^<]+)<\/response>/gi,

      // Buscar qualquer número que pareça uma inscrição (6+ dígitos)
      />(\d{6,})</g,
    ];

    // Extrair informações dos imóveis
    for (const padrao of padroesImoveis) {
      let match;
      while ((match = padrao.exec(xmlLimpo)) !== null) {
        const valor = match[1].trim();

        // Filtrar valores válidos
        if (
          valor &&
          valor.length >= 3 &&
          valor.length <= 20 &&
          /^\d+$/.test(valor)
        ) {
          // Evitar duplicar o próprio CPF/CNPJ como inscrição
          if (contribuinte.cpfCnpj && valor === contribuinte.cpfCnpj) {
            continue;
          }

          // Determinar tipo baseado no padrão encontrado
          let tipo = "Municipal"; // Padrão

          if (padrao.source.includes("imob")) {
            tipo = "Imobiliária";
          }

          // Evitar duplicatas
          const jaExiste = imoveis.some((imovel) => imovel.inscricao === valor);
          if (!jaExiste) {
            imoveis.push({
              inscricao: valor,
              tipo: tipo,
              endereco: null,
              tipoImovel: null,
              tipoProprietario: null,
              possuiDebito: null,
              statusDebito: null,
            });
            encontrado = true;
          }
        }
      }
    }

    // EXTRAIR INFORMAÇÕES ADICIONAIS DOS IMÓVEIS
    this.extrairInformacoesDetalhadas(xmlLimpo, imoveis);

    return {
      encontrado,
      contribuinte,
      imoveis,
    };
  }

  /**
   * Extrai informações detalhadas dos imóveis - COM TRATAMENTO DE ERROS E RESILIÊNCIA
   */
  extrairInformacoesDetalhadas(xmlLimpo, imoveis) {
    try {
      // PADRÕES PARA EXTRAIR INFORMAÇÕES DETALHADAS
      const padroesDetalhados = [
        // Endereços
        /<endereco[^>]*>([^<]+)<\/endereco>/gi,
        /<logradouro[^>]*>([^<]+)<\/logradouro>/gi,
        /<rua[^>]*>([^<]+)<\/rua>/gi,
        /<avenida[^>]*>([^<]+)<\/avenida>/gi,
        /<bairro[^>]*>([^<]+)<\/bairro>/gi,
        /<cidade[^>]*>([^<]+)<\/cidade>/gi,
        /<cep[^>]*>([^<]+)<\/cep>/gi,

        // Tipos de imóvel
        /<tipo_imovel[^>]*>([^<]+)<\/tipo_imovel>/gi,
        /<categoria[^>]*>([^<]+)<\/categoria>/gi,
        /<predial[^>]*>([^<]+)<\/predial>/gi,
        /<terreno[^>]*>([^<]+)<\/terreno>/gi,

        // Tipos de proprietário
        /<tipo_proprietario[^>]*>([^<]+)<\/tipo_proprietario>/gi,
        /<proprietario[^>]*>([^<]+)<\/proprietario>/gi,
        /<principal[^>]*>([^<]+)<\/principal>/gi,
        /<coproprietario[^>]*>([^<]+)<\/coproprietario>/gi,

        // Débitos
        /<debito[^>]*>([^<]+)<\/debito>/gi,
        /<possui_debito[^>]*>([^<]+)<\/possui_debito>/gi,
        /<tem_debito[^>]*>([^<]+)<\/tem_debito>/gi,
        /<status_debito[^>]*>([^<]+)<\/status_debito>/gi,
        /<situacao_debito[^>]*>([^<]+)<\/situacao_debito>/gi,
        /<suspenso[^>]*>([^<]+)<\/suspenso>/gi,
        /<ativo[^>]*>([^<]+)<\/ativo>/gi,
        /<pendente[^>]*>([^<]+)<\/pendente>/gi,

        // PADRÕES EXPANDIDOS PARA MAIOR COMPATIBILIDADE
        // (Adicionados para capturar variações futuras)
        /<endereco_completo[^>]*>([^<]+)<\/endereco_completo>/gi,
        /<endereco_imovel[^>]*>([^<]+)<\/endereco_imovel>/gi,
        /<nome_logradouro[^>]*>([^<]+)<\/nome_logradouro>/gi,
        /<desc_endereco[^>]*>([^<]+)<\/desc_endereco>/gi,
        /<tipo_propriedade[^>]*>([^<]+)<\/tipo_propriedade>/gi,
        /<classificacao[^>]*>([^<]+)<\/classificacao>/gi,
        /<situacao[^>]*>([^<]+)<\/situacao>/gi,
        /<divida[^>]*>([^<]+)<\/divida>/gi,
        /<inadimplente[^>]*>([^<]+)<\/inadimplente>/gi,
        /<regular[^>]*>([^<]+)<\/regular>/gi,
        /<irregular[^>]*>([^<]+)<\/irregular>/gi,
      ];

      // Extrair informações detalhadas com tratamento de erros
      for (const padrao of padroesDetalhados) {
        try {
          let match;
          while ((match = padrao.exec(xmlLimpo)) !== null) {
            const valor = this.limparValor(match[1]);

            if (valor && valor.length > 0) {
              const source = padrao.source.toLowerCase();

              // Aplicar informações aos imóveis com verificação de segurança
              if (Array.isArray(imoveis)) {
                imoveis.forEach((imovel) => {
                  if (imovel && typeof imovel === "object") {
                    this.aplicarInformacaoAoImovel(imovel, source, valor);
                  }
                });
              }
            }
          }
        } catch (regexError) {
          // Log erro específico do regex mas continue processando
          console.error(
            `[CadastroGeralService] Erro ao processar padrão ${padrao.source}:`,
            regexError
          );
        }
      }

      // EXTRAIR INFORMAÇÕES ESTRUTURADAS (listas, arrays, objetos)
      this.extrairInformacoesEstruturadas(xmlLimpo, imoveis);
    } catch (error) {
      console.error(
        `[CadastroGeralService] Erro ao extrair informações detalhadas:`,
        error
      );
      // Não interromper o processamento - continuar com dados básicos
    }
  }

  /**
   * Limpa e valida valores extraídos
   */
  limparValor(valor) {
    if (!valor || typeof valor !== "string") return null;

    // Remove espaços extras, quebras de linha e caracteres especiais
    const valorLimpo = valor
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\r\n\t]/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Filtrar valores que não são úteis
    const valoresInvalidos = [
      "null",
      "undefined",
      "nan",
      "",
      " ",
      "n/a",
      "na",
      "none",
      "empty",
    ];

    if (valoresInvalidos.includes(valorLimpo.toLowerCase())) {
      return null;
    }

    return valorLimpo;
  }

  /**
   * Aplica informação específica ao imóvel
   */
  aplicarInformacaoAoImovel(imovel, source, valor) {
    try {
      // Classificar tipo de informação baseado no padrão
      if (
        source.includes("endereco") ||
        source.includes("logradouro") ||
        source.includes("rua") ||
        source.includes("avenida") ||
        source.includes("bairro") ||
        source.includes("cidade") ||
        source.includes("cep") ||
        source.includes("desc_endereco")
      ) {
        if (!imovel.endereco) {
          imovel.endereco = valor;
        } else if (valor !== imovel.endereco) {
          // Combinar endereços se diferentes
          imovel.endereco = `${imovel.endereco}, ${valor}`;
        }
      } else if (
        source.includes("tipo_imovel") ||
        source.includes("categoria") ||
        source.includes("predial") ||
        source.includes("terreno") ||
        source.includes("tipo_propriedade") ||
        source.includes("classificacao")
      ) {
        if (!imovel.tipoImovel) {
          imovel.tipoImovel = valor;
        }
      } else if (
        source.includes("tipo_proprietario") ||
        source.includes("proprietario") ||
        source.includes("principal") ||
        source.includes("coproprietario")
      ) {
        if (!imovel.tipoProprietario) {
          imovel.tipoProprietario = valor;
        }
      } else if (
        source.includes("debito") ||
        source.includes("possui_debito") ||
        source.includes("tem_debito") ||
        source.includes("divida") ||
        source.includes("inadimplente")
      ) {
        if (!imovel.possuiDebito) {
          imovel.possuiDebito = valor;
        }
      } else if (
        source.includes("status_debito") ||
        source.includes("situacao_debito") ||
        source.includes("suspenso") ||
        source.includes("ativo") ||
        source.includes("pendente") ||
        source.includes("situacao") ||
        source.includes("regular") ||
        source.includes("irregular")
      ) {
        if (!imovel.statusDebito) {
          imovel.statusDebito = valor;
        }
      }
    } catch (error) {
      console.error(
        `[CadastroGeralService] Erro ao aplicar informação ao imóvel:`,
        error
      );
    }
  }

  /**
   * Extrai informações estruturadas (listas, arrays, objetos complexos)
   */
  extrairInformacoesEstruturadas(xmlLimpo, imoveis) {
    try {
      // PADRÕES PARA CAPTURAR LISTAS E ARRAYS
      const padroesListas = [
        // Listas de imóveis
        /<lista_imoveis[^>]*>(.*?)<\/lista_imoveis>/gi,
        /<imoveis[^>]*>(.*?)<\/imoveis>/gi,
        /<propriedades[^>]*>(.*?)<\/propriedades>/gi,

        // Listas de endereços
        /<lista_enderecos[^>]*>(.*?)<\/lista_enderecos>/gi,
        /<enderecos[^>]*>(.*?)<\/enderecos>/gi,

        // Listas de débitos
        /<lista_debitos[^>]*>(.*?)<\/lista_debitos>/gi,
        /<debitos[^>]*>(.*?)<\/debitos>/gi,
        /<dividas[^>]*>(.*?)<\/dividas>/gi,

        // Arrays genéricos
        /<array[^>]*>(.*?)<\/array>/gi,
        /<lista[^>]*>(.*?)<\/lista>/gi,
        /<items[^>]*>(.*?)<\/items>/gi,
      ];

      for (const padrao of padroesListas) {
        try {
          let match;
          while ((match = padrao.exec(xmlLimpo)) !== null) {
            const conteudoLista = match[1];
            if (conteudoLista && conteudoLista.trim().length > 0) {
              // Processar conteúdo da lista recursivamente
              this.processarConteudoLista(conteudoLista, imoveis);
            }
          }
        } catch (error) {
          console.error(
            `[CadastroGeralService] Erro ao processar lista:`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        `[CadastroGeralService] Erro ao extrair informações estruturadas:`,
        error
      );
    }
  }

  /**
   * Processa conteúdo de listas XML
   */
  processarConteudoLista(conteudo, imoveis) {
    try {
      // Buscar itens individuais na lista
      const padroesItem = [
        /<item[^>]*>(.*?)<\/item>/gi,
        /<registro[^>]*>(.*?)<\/registro>/gi,
        /<entrada[^>]*>(.*?)<\/entrada>/gi,
        /<elemento[^>]*>(.*?)<\/elemento>/gi,
      ];

      for (const padrao of padroesItem) {
        let match;
        while ((match = padrao.exec(conteudo)) !== null) {
          const conteudoItem = match[1];
          if (conteudoItem && conteudoItem.trim().length > 0) {
            // Processar item individual
            this.processarItemLista(conteudoItem, imoveis);
          }
        }
      }
    } catch (error) {
      console.error(
        `[CadastroGeralService] Erro ao processar conteúdo da lista:`,
        error
      );
    }
  }

  /**
   * Processa item individual de lista
   */
  processarItemLista(itemXml, imoveis) {
    try {
      // Aplicar padrões de extração ao item
      this.extrairInformacoesDetalhadas(itemXml, imoveis);
    } catch (error) {
      console.error(
        `[CadastroGeralService] Erro ao processar item da lista:`,
        error
      );
    }
  }

  /**
   * Formata a resposta para o usuário - APRESENTAÇÃO APRIMORADA
   */
  formatarResposta(dados, documento) {
    const tipoDocumento = documento.length === 11 ? "CPF" : "CNPJ";
    const documentoFormatado = this.formatarDocumento(documento);

    if (!dados.encontrado || (dados.imoveis && dados.imoveis.length === 0)) {
      let mensagemEspecifica =
        "Nenhuma inscrição ativa encontrada para este documento.";
      let detalhesAdicionais = `${EMOJIS.DICA} *Isso pode significar:*
• O documento não possui inscrições no sistema
• As inscrições estão inativas
• O documento foi digitado incorretamente`;

      // Personalizar mensagem baseada no tipo de resposta
      if (dados.erro) {
        mensagemEspecifica =
          "Erro ao consultar o sistema. Tente novamente em alguns minutos.";
        detalhesAdicionais = `${EMOJIS.FERRAMENTA} *Detalhes técnicos:*
• Sistema temporariamente indisponível
• Verifique sua conexão com a internet`;
      } else if (dados.estruturaNaoReconhecida) {
        mensagemEspecifica =
          "Consulta realizada com sucesso, mas a resposta precisa ser analisada.";
        detalhesAdicionais = `${EMOJIS.INFO} *O que aconteceu:*
• A consulta foi enviada ao sistema da Ábaco
• A resposta foi recebida mas está em formato diferente do esperado
• Nossa equipe técnica analisará a estrutura da resposta

${EMOJIS.TELEFONE} *Contate o suporte para análise:*
smfaz@arapiraca.al.gov.br`;
      } else if (dados.semDados) {
        mensagemEspecifica =
          "Sistema consultado com sucesso - nenhuma inscrição vinculada.";
        detalhesAdicionais = `${EMOJIS.SUCESSO} *Confirmação:*
• Consulta realizada com sucesso
• O documento não possui inscrições ativas no momento`;
      }

      return {
        type: "text",
        text: `${EMOJIS.BUSCA} *Consulta de Cadastro Geral*

${EMOJIS.DOCUMENTO} *${tipoDocumento}:* ${documentoFormatado}

${EMOJIS.INFO} *Resultado:*
${mensagemEspecifica}

${detalhesAdicionais}

${EMOJIS.INTERNET} *Portal do Contribuinte:*
https://arapiraca.abaco.com.br/eagata/portal/

Digite *menu* para voltar ao menu principal.`,
      };
    }

    // RESPOSTA COMPLETA COM DADOS APRIMORADOS
    let textoResposta = `${EMOJIS.SUCESSO} *Consulta de Cadastro Geral*\n\n`;

    // INFORMAÇÕES DO CONTRIBUINTE
    if (dados.contribuinte) {
      const { nome, cpfCnpj, codigo } = dados.contribuinte;

      if (nome) {
        textoResposta += `${EMOJIS.PESSOA} *Nome:* ${nome}\n`;
      }

      textoResposta += `${EMOJIS.DOCUMENTO} *${tipoDocumento}:* ${documentoFormatado}\n`;

      if (codigo) {
        textoResposta += `${EMOJIS.NUMERO} *Código do Contribuinte:* ${codigo}\n`;
      }

      textoResposta += `\n`;
    }

    // INFORMAÇÕES DOS IMÓVEIS
    if (dados.imoveis && dados.imoveis.length > 0) {
      textoResposta += `${EMOJIS.CASA} *Imóveis vinculados:*\n`;

      dados.imoveis.forEach((imovel, index) => {
        const numero = index + 1;
        textoResposta += `\n*${numero}.* **Inscrição ${imovel.tipo}:** ${imovel.inscricao}\n`;

        if (imovel.endereco) {
          textoResposta += `   ${EMOJIS.LOCALIZACAO} *Endereço:* ${imovel.endereco}\n`;
        }

        if (imovel.tipoImovel) {
          textoResposta += `   ${EMOJIS.CASA} *Tipo do imóvel:* ${imovel.tipoImovel}\n`;
        }

        if (imovel.tipoProprietario) {
          textoResposta += `   ${EMOJIS.PESSOA} *Proprietário:* ${imovel.tipoProprietario}\n`;
        }

        if (imovel.possuiDebito) {
          const iconeDebito = this.interpretarStatusDebito(imovel.possuiDebito)
            ? EMOJIS.ALERTA
            : EMOJIS.SUCESSO;
          const textoDebito = this.interpretarStatusDebito(imovel.possuiDebito)
            ? "Sim"
            : "Não";
          textoResposta += `   ${iconeDebito} *Possui débitos:* ${textoDebito}\n`;
        }

        if (imovel.statusDebito) {
          textoResposta += `   ${EMOJIS.INFO} *Status:* ${imovel.statusDebito}\n`;
        }
      });
    } else {
      // Fallback para formato antigo (compatibilidade)
      const inscricoesMunicipais = dados.inscricoes
        ? dados.inscricoes.filter((i) => i.tipo === "Municipal")
        : [];
      const inscricoesImobiliarias = dados.inscricoes
        ? dados.inscricoes.filter((i) => i.tipo === "Imobiliária")
        : [];

      if (inscricoesMunicipais.length > 0) {
        textoResposta += `\n${EMOJIS.EMPRESA} *Inscrições Municipais:*\n`;
        inscricoesMunicipais.forEach((inscricao) => {
          textoResposta += `• ${inscricao.numero}\n`;
        });
      }

      if (inscricoesImobiliarias.length > 0) {
        textoResposta += `\n${EMOJIS.CASA} *Inscrições Imobiliárias:*\n`;
        inscricoesImobiliarias.forEach((inscricao) => {
          textoResposta += `• ${inscricao.numero}\n`;
        });
      }
    }

    // INFORMAÇÕES ADICIONAIS
    textoResposta += `\n${EMOJIS.INFO} *Para mais detalhes:*
• Acesse o Portal do Contribuinte
• Digite *1* para segunda via de DAM
• Digite *2* para certidões

${EMOJIS.INTERNET} *Portal:*
https://arapiraca.abaco.com.br/eagata/portal/

${EMOJIS.DICA} *Obs.:* Use a inscrição imobiliária ou código do contribuinte para acessar outros serviços do sistema.

Digite *menu* para voltar ao menu principal.`;

    return {
      type: "text",
      text: textoResposta,
    };
  }

  /**
   * Interpreta o status de débito
   */
  interpretarStatusDebito(statusDebito) {
    if (!statusDebito) return false;

    const status = statusDebito.toLowerCase();

    // Indicadores de que possui débito
    const possuiDebito = [
      "sim",
      "yes",
      "true",
      "1",
      "ativo",
      "pendente",
      "possui",
      "tem",
    ];

    // Indicadores de que não possui débito
    const naopossuiDebito = [
      "não",
      "nao",
      "no",
      "false",
      "0",
      "inativo",
      "quitado",
      "pago",
    ];

    if (possuiDebito.some((indicador) => status.includes(indicador))) {
      return true;
    }

    if (naopossuiDebito.some((indicador) => status.includes(indicador))) {
      return false;
    }

    // Se não conseguir determinar, assumir que possui débito por segurança
    return true;
  }

  /**
   * Formata o documento para exibição
   */
  formatarDocumento(documento) {
    if (documento.length === 11) {
      // CPF: 123.456.789-01
      return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (documento.length === 14) {
      // CNPJ: 12.345.678/0001-23
      return documento.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5"
      );
    }
    return documento;
  }

  /**
   * Verifica se é um comando de saída
   */
  verificarComandoSaida(msgLimpa) {
    const comandosSaida = ["menu", "voltar", "cancelar", "sair"];
    return comandosSaida.some((comando) => msgLimpa.includes(comando));
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
