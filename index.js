const express = require("express");
const qs = require("querystring");
const fs = require("fs");
const path = require("path");
const app = express();

// ═══════════════════════════════════════════════════════════════════════════════════════
//                            📊 DADOS DA TFLF (TAX DATA LOADING)
// ═══════════════════════════════════════════════════════════════════════════════════════

let dadosTFLF = [];

function carregarDadosTFLF() {
  try {
    const conteudo = fs.readFileSync("vlr_tlf_20_25.txt", "utf8");
    const linhas = conteudo.split("\n");
    dadosTFLF = [];

    // Pula a primeira linha (cabeçalho)
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (linha) {
        const colunas = linha.split("|");
        if (colunas.length >= 9) {
          dadosTFLF.push({
            codigo: colunas[0],
            cnae: colunas[1],
            descricao: colunas[2],
            tflf2020: colunas[3],
            tflf2021: colunas[4],
            tflf2022: colunas[5],
            tflf2023: colunas[6],
            tflf2024: colunas[7],
            tflf2025: colunas[8],
          });
        }
      }
    }
    console.log(`✅ Carregados ${dadosTFLF.length} registros da TFLF`);
  } catch (error) {
    console.error("❌ Erro ao carregar dados da TFLF:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
//                             📋 DADOS DO ISS (TAX DATA LOADING)
// ═══════════════════════════════════════════════════════════════════════════════════════

let dadosISS = [];

function carregarDadosISS() {
  try {
    const conteudo = fs.readFileSync("ISS_Arapiraca.txt", "utf8");
    const linhas = conteudo.split("\n");
    dadosISS = [];

    // Pula a primeira linha (cabeçalho)
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (linha) {
        const colunas = linha.split("|");
        if (colunas.length >= 7) {
          dadosISS.push({
            codigoItem: colunas[0],
            descricaoItem: colunas[1],
            codigoSubitem: colunas[2],
            descricaoSubitem: colunas[3],
            aliquota: colunas[4],
            percentualDeducao: colunas[5],
            tributacaoForaArapiraca: colunas[6],
          });
        }
      }
    }
    console.log(`✅ Carregados ${dadosISS.length} registros do ISS`);
  } catch (error) {
    console.error("❌ Erro ao carregar dados do ISS:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
//                              🔍 FUNÇÕES DE BUSCA
// ═══════════════════════════════════════════════════════════════════════════════════════

function buscarPorCNAE(digitosCNAE) {
  if (!digitosCNAE || digitosCNAE.length < 4) {
    return null;
  }

  const resultados = dadosTFLF.filter((item) => {
    // Remove letras do início da CNAE e mantém só números
    const cnaeNumeros = item.cnae.replace(/^[A-Za-z]+/, "");
    return cnaeNumeros.includes(digitosCNAE);
  });

  return resultados;
}

function buscarPorCodigoServico(digitosServico, buscaExata = false) {
  if (!digitosServico || digitosServico.length < 3) {
    return null;
  }

  const resultados = dadosISS.filter((item) => {
    if (buscaExata) {
      // Busca exata pelo código do subitem
      return item.codigoSubitem === digitosServico;
    } else {
      // Busca que contém os dígitos
      return item.codigoSubitem.includes(digitosServico);
    }
  });

  return resultados;
}

function buscarPorDescricaoServico(termoBusca) {
  if (!termoBusca || termoBusca.length < 3) {
    return null;
  }

  const termo = termoBusca
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos

  const resultados = dadosISS.filter((item) => {
    const descricaoLimpa = item.descricaoSubitem
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return descricaoLimpa.includes(termo);
  });

  return resultados;
}

function buscarPorDescricaoCNAE(termoBusca) {
  if (!termoBusca || termoBusca.length < 3) {
    return null;
  }

  const termo = termoBusca
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos

  const resultados = dadosTFLF.filter((item) => {
    const descricaoLimpa = item.descricao
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return descricaoLimpa.includes(termo);
  });

  return resultados;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
//                          ⚙️ CONFIGURAÇÕES DO SERVIDOR EXPRESS
// ═══════════════════════════════════════════════════════════════════════════════════════

// Carregar dados na inicialização
carregarDadosTFLF();
carregarDadosISS();

// Servir arquivos estáticos (imagens)
app.use("/imagens", express.static(path.join(__dirname)));

// Middleware para log das requisições
app.use((req, res, next) => {
  console.log("\n🟡 NOVA REQUISIÇÃO");
  console.log("➡️ Método:", req.method);
  console.log("➡️ Headers:", req.headers);

  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    console.log("➡️ Corpo bruto:", raw);
    req.rawBody = raw;
    next();
  });
});

// Middleware para parse JSON e form-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para tratamento de erros JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.warn("⚠️ JSON malformado – seguir para parse manual");
    return next(); // segue adiante
  }
  next(err);
});

// ═══════════════════════════════════════════════════════════════════════════════════════
//                          🎯 CONTROLE DE ESTADOS DO ATENDIMENTO
// ═══════════════════════════════════════════════════════════════════════════════════════

const estadosUsuario = new Map(); // Armazena o estado atual de cada usuário

function obterEstadoUsuario(sender) {
  return estadosUsuario.get(sender) || "menu_principal";
}

function definirEstadoUsuario(sender, estado) {
  estadosUsuario.set(sender, estado);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
//                           🎨 FUNÇÕES DE INTERFACE DO USUÁRIO
// ═══════════════════════════════════════════════════════════════════════════════════════

function gerarMenuPrincipal(nome) {
  return `Olá ${nome}! 👋 Seja bem-vindo ao meu atendimento virtual!

Escolha uma das opções abaixo digitando o número:

*1* - 📄 Segunda via de DAM's
*2* - 📄 Certidões de Regularidade Fiscal
*3* - 🧾 NFSe e ISSQN
*4* - 📋 Lista de Substitutos Tributários
*5* - 💰 TFLF 2025
*0* - 👋 Encerrar Atendimento

Digite o número da opção desejada ou descreva sua dúvida.`;
}

function criarRespostaComMidia(texto, imagemPath = null, req = null) {
  if (imagemPath) {
    // Usar link direto do GitHub para a imagem
    let linkImagem = "";

    if (imagemPath === "Portal_2_vias.png") {
      linkImagem =
        "https://github.com/diogojmt/whatsauto-servidor/blob/main/imagens/Portal_2_vias.png?raw=true";
    }

    if (imagemPath === "Portal_3_vias.png") {
      linkImagem =
        "https://github.com/diogojmt/whatsauto-servidor/blob/main/imagens/Portal_3_vias.png?raw=true";
    }

    if (linkImagem) {
      return {
        type: "media",
        text: `${texto}

🖼️ *Clique aqui para ver a imagem de apoio*
${linkImagem}`,
        media: linkImagem,
      };
    }
  }
  return {
    type: "text",
    text: texto,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
//                    🤖 LÓGICA PRINCIPAL DE RESPOSTA AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════════════════════════════

function gerarResposta(message, sender, req = null) {
  const nome = sender || "cidadão";
  const msgLimpa = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos

  const estadoAtual = obterEstadoUsuario(sender);

  // ─────────────────────────────────────────────────────────────────────────────────────
  //                         💬 VERIFICAÇÕES DE AGRADECIMENTO
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  if (
    msgLimpa.includes("obrigado") ||
    msgLimpa.includes("obrigada") ||
    msgLimpa.includes("valeu") ||
    msgLimpa.includes("muito obrigado") ||
    msgLimpa.includes("muito obrigada") ||
    msgLimpa.includes("grato") ||
    msgLimpa.includes("grata") ||
    msgLimpa.includes("agradeco") ||
    msgLimpa.includes("brigado") ||
    msgLimpa.includes("brigada") ||
    msgLimpa.includes("thanks") ||
    msgLimpa.includes("thx") ||
    msgLimpa.includes("vlw") ||
    msgLimpa.includes("obg")
  ) {
    return `😊 *Atendimento Finalizado*

${nome}, foi um prazer ajudá-lo(a) hoje! 

✅ Sua consulta foi atendida com sucesso.

Caso precise de mais informações sobre tributos municipais, estarei sempre aqui para ajudar.

💡 *Lembre-se:*
• Portal do Contribuinte: https://arapiraca.abaco.com.br/eagata/portal/
• NFSe: https://www.e-nfs.com.br/arapiraca/portal/

Tenha um excelente dia! 👋

*Atendimento encerrado automaticamente*`;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  //                           🏠 NAVEGAÇÃO PARA MENU PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  if (msgLimpa.includes("menu") || msgLimpa.includes("inicio")) {
    definirEstadoUsuario(sender, "menu_principal");
    return gerarMenuPrincipal(nome);
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  //                              👋 SAUDAÇÕES INICIAIS
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  if (
    msgLimpa.includes("ola") ||
    msgLimpa.includes("oi") ||
    msgLimpa.includes("bom dia") ||
    msgLimpa.includes("boa tarde") ||
    msgLimpa.includes("boa noite") ||
    msgLimpa.includes("opcoes") ||
    msgLimpa.includes("ajuda") ||
    msgLimpa.trim() === "hi" ||
    msgLimpa.trim() === "hello"
  ) {
    definirEstadoUsuario(sender, "menu_principal");
    return gerarMenuPrincipal(nome);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                             📄 OPÇÃO 1 - SEGUNDA VIA DE DAM'S
  // ═══════════════════════════════════════════════════════════════════════════════════════

  if (msgLimpa.trim() === "1" || msgLimpa.includes("opcao 1")) {
    definirEstadoUsuario(sender, "menu_principal");
    return criarRespostaComMidia(
      `📄 *Segunda via de DAM's*

${nome}, para emitir a segunda via de DAMs, siga as instruções:

🔗 *Acesse o link:*
https://arapiraca.abaco.com.br/eagata/portal/

📋 *Instruções:*
• No portal, escolha uma das opções disponíveis para emissão de segunda via de DAMs
• Para facilitar a consulta tenha em mãos o CPF/CNPJ, Inscrição Municipal ou Inscrição Imobiliária do contribuinte

📧 *Dúvidas ou informações:*
smfaz@arapiraca.al.gov.br

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`,
      "Portal_2_vias.png",
      req
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                        📄 OPÇÃO 2 - CERTIDÕES DE REGULARIDADE FISCAL
  // ═══════════════════════════════════════════════════════════════════════════════════════

  if (msgLimpa.trim() === "2" || msgLimpa.includes("opcao 2")) {
    definirEstadoUsuario(sender, "menu_principal");
    return criarRespostaComMidia(
      `📄 *Certidões de Regularidade Fiscal e Autenticações*

${nome}, para emitir certidões e autenticações, siga as instruções:

🔗 *Acesse o link:*
https://arapiraca.abaco.com.br/eagata/portal/

📋 *Instruções:*
• No portal, escolha uma das opções disponíveis para Emissão de Certidões/Autenticações de Documentos
• Para facilitar a consulta tenha em mãos o CPF/CNPJ, Inscrição Municipal ou Inscrição Imobiliária do contribuinte

📧 *Dúvidas ou informações:*
smfaz@arapiraca.al.gov.br

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`,
      "Portal_3_vias.png",
      req
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  //                         SUBOPÇÕES DA OPÇÃO 2 (CERTIDÕES)
  // ─────────────────────────────────────────────────────────────────────────────────────

  if (
    msgLimpa.trim() === "2.1" ||
    msgLimpa.includes("opcao 2.1") ||
    msgLimpa.includes("certidao imobiliaria")
  ) {
    return `🏘️ *Certidão Imobiliária*

${nome}, para emitir sua certidão imobiliária:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?18,certidao-imobiliaria

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número da Inscrição do Imóvel

Digite *2* para voltar às opções de certidões, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "2.2" ||
    msgLimpa.includes("opcao 2.2") ||
    msgLimpa.includes("certidao geral")
  ) {
    return `📋 *Certidão Geral*

${nome}, para emitir sua certidão geral:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?20,certidao-geral

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número do CPF/CNPJ do Cidadão

Digite *2* para voltar às opções de certidões, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "2.3" ||
    msgLimpa.includes("opcao 2.3") ||
    msgLimpa.includes("autenticidade")
  ) {
    return `✅ *Autenticidade*

${nome}, para verificar a autenticidade de uma certidão:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?21,certidao-autenticacao

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o código de autenticidade da certidão.

Digite *2* para voltar às opções de certidões, *menu* para o menu principal ou *0* para encerrar.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                           🧾 OPÇÃO 3 - NFSE E ISSQN
  // ═══════════════════════════════════════════════════════════════════════════════════════

  if (msgLimpa.trim() === "3" || msgLimpa.includes("opcao 3")) {
    definirEstadoUsuario(sender, "opcao_3_nfse");
    return `🧾 *NFSe e ISSQN*

${nome}, escolha uma das opções abaixo digitando o número:

*3.1* - 🌐 Acesso ao Site para Emissão
*3.2* - ❓ Dúvidas e Reclamações
*3.3* - 📖 Manuais de Utilização do Sistema
*3.4* - 📊 Alíquota, Deduções e Local de Tributação

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  //                         SUBOPÇÕES DA OPÇÃO 3 (NFSE)
  // ─────────────────────────────────────────────────────────────────────────────────────

  if (
    msgLimpa.trim() === "3.1" ||
    msgLimpa.includes("opcao 3.1") ||
    msgLimpa.includes("emissao nfse")
  ) {
    return `🌐 *Acesso ao Site para Emissão*

${nome}, para acessar o site de emissão de NFSe:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/portal/

📝 *Orientações ao contribuinte:*
Escolha a opção Login Empresa/Autônomo

Digite *3* para voltar às opções de NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "3.2" ||
    msgLimpa.includes("opcao 3.2") ||
    msgLimpa.includes("duvidas nfse")
  ) {
    return `❓ *Dúvidas e Reclamações*

${nome}, para dúvidas e reclamações sobre NFSe:

📝 *Utilize um dos canais abaixo:*
📧 Via e-mail: atendimento@abaco.com.br
📞 Telefone: 0800 647 0777

Digite *3* para voltar às opções de NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  //                         OPÇÃO 3.3 - MANUAIS DE UTILIZAÇÃO
  // ─────────────────────────────────────────────────────────────────────────────────────

  if (msgLimpa.trim() === "3.3" || msgLimpa.includes("opcao 3.3") || msgLimpa.includes("manuais nfse")) {
    return `📖 *Manuais de Utilização do Sistema*

${nome}, escolha um dos manuais abaixo digitando o número:

*3.3.1* - 🎯 Tutorial Primeiro Acesso
*3.3.2* - 👥 Emissão de NFSE para tomadores cadastrados
*3.3.3* - 👤 Emissão de NFSE para tomadores não cadastrados
*3.3.4* - 💳 Emissão de Guias de Pagamento
*3.3.5* - ❌ Cancelar NFSE Emitidas
*3.3.6* - 🚫 Recusa de Notas Fiscais Eletrônicas de Serviços Recebidas
*3.3.7* - ✏️ Tutorial Carta de Correção
*3.3.8* - 🔄 Substituição de Nota Fiscal
*3.3.9* - 📝 Cadastro no Nota Fiscal Avulsa
*3.3.10* - 📋 Escrituração de Nota Avulsa

Digite *3* para voltar às opções de NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  // Manuais individuais (3.3.1 a 3.3.10)
  if (msgLimpa.trim() === "3.3.1" || msgLimpa.includes("opcao 3.3.1")) {
    return `🎯 *Tutorial Primeiro Acesso*

${nome}, para acessar o tutorial de primeiro acesso:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_291.ZIP

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.2" || msgLimpa.includes("opcao 3.3.2")) {
    return `👥 *Emissão de NFSE para tomadores cadastrados*

${nome}, para acessar o manual de emissão para tomadores cadastrados:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_250.PDF

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.3" || msgLimpa.includes("opcao 3.3.3")) {
    return `👤 *Emissão de NFSE para tomadores não cadastrados*

${nome}, para acessar o manual de emissão para tomadores não cadastrados:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_251.PDF

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.4" || msgLimpa.includes("opcao 3.3.4")) {
    return `💳 *Emissão de Guias de Pagamento*

${nome}, para acessar o manual de emissão de guias de pagamento:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_252.PDF

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.5" || msgLimpa.includes("opcao 3.3.5")) {
    return `❌ *Cancelar NFSE Emitidas*

${nome}, para acessar o manual de cancelamento de NFSE:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_259.PDF

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.6" || msgLimpa.includes("opcao 3.3.6")) {
    return `🚫 *Recusa de Notas Fiscais Eletrônicas de Serviços Recebidas*

${nome}, para acessar o manual de recusa de notas fiscais recebidas:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_284.PDF

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.7" || msgLimpa.includes("opcao 3.3.7")) {
    return `✏️ *Tutorial Carta de Correção*

${nome}, para acessar o tutorial de carta de correção:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_288.ZIP

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.8" || msgLimpa.includes("opcao 3.3.8")) {
    return `🔄 *Substituição de Nota Fiscal*

${nome}, para acessar o manual de substituição de nota fiscal:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_278.PDF

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.9" || msgLimpa.includes("opcao 3.3.9")) {
    return `📝 *Cadastro no Nota Fiscal Avulsa*

${nome}, para acessar o manual de cadastro de nota fiscal avulsa:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_279.PDF

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "3.3.10" || msgLimpa.includes("opcao 3.3.10")) {
    return `📋 *Escrituração de Nota Avulsa*

${nome}, para acessar o manual de escrituração de nota avulsa:

🔗 *Link de acesso:*
https://www.e-nfs.com.br/arapiraca/temp/DOC_294.PDF

Digite *3.3* para voltar aos manuais, *3* para NFSe, *menu* para o menu principal ou *0* para encerrar.`;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  //                      OPÇÃO 3.4 - ALÍQUOTA, DEDUÇÕES E TRIBUTAÇÃO
  // ─────────────────────────────────────────────────────────────────────────────────────

  if (msgLimpa.trim() === "3.4" || msgLimpa.includes("opcao 3.4")) {
    definirEstadoUsuario(sender, "consulta_iss");
    return `📊 *Alíquota, Deduções e Local de Tributação*

${nome}, para consultar informações sobre alíquotas, deduções e local de tributação:

📝 *Formas de consulta:*

🔢 *Por código do item de serviço:*
• Conforme Lei Complementar 116/2003
• Mínimo 3 dígitos
• Exemplo: 102 (para Programação)
• Exemplo: 1402 (para Assistência técnica)

📝 *Por descrição do serviço:*
• Digite parte da descrição da atividade
• Mínimo 3 caracteres
• Exemplo: "programação" ou "assistência"
• Exemplo: "medicina" ou "engenharia"

Digite *3* para voltar ao menu NFSe e ISSQN, *menu* para o menu principal ou *0* para encerrar.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                         📋 OPÇÃO 4 - LISTA DE SUBSTITUTOS TRIBUTÁRIOS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  if (msgLimpa.trim() === "4" || msgLimpa.includes("opcao 4")) {
    return `📋 *Lista de Substitutos Tributários*

${nome}, para consultar a lista de substitutos tributários:

🔗 *Link de acesso:*
https://web.arapiraca.al.gov.br/wp-content/uploads/2021/01/DECRETOSUBSTITUTOTRIBUTARIO2023-2.pdf

📝 *Orientações ao contribuinte:*
Decreto 2.842/2023 - Dispõe sobre o regíme de responsabilidade supletiva, sobre contribuintes e/ou responsáveis tributários e adota providências correlatas.

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                               💰 OPÇÃO 5 - TFLF 2025
  // ═══════════════════════════════════════════════════════════════════════════════════════

  if (msgLimpa.trim() === "5" || msgLimpa.includes("opcao 5")) {
    definirEstadoUsuario(sender, "opcao_5_tflf");
    return `💰 *TFLF 2025*

${nome}, escolha uma das opções abaixo digitando o número:

*5.1* - 🔍 Consultar Valores por CNAE
*5.2* - 📋 Baixar Anexo I do CTM (Planilha Geral)

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  //                         SUBOPÇÕES DA OPÇÃO 5 (TFLF)
  // ─────────────────────────────────────────────────────────────────────────────────────

  if (msgLimpa.trim() === "5.1" || msgLimpa.includes("opcao 5.1")) {
    definirEstadoUsuario(sender, "consulta_cnae");
    return `🔍 *Consultar Valores por CNAE*

${nome}, para consultar o valor da TFLF por atividade:

📝 *Formas de consulta:*

🔢 *Por código CNAE:*
• Mínimo 4 dígitos
• Exemplo: 4711 (para comércio varejista)
• Apenas números, sem letras

📝 *Por descrição da atividade:*
• Digite parte da descrição da atividade
• Mínimo 3 caracteres
• Exemplo: "comercio" ou "transporte"
• Exemplo: "servicos" ou "industria"

O sistema buscará todas as atividades que contenham os termos digitados.

Digite *5* para voltar ao menu TFLF, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "5.2" || msgLimpa.includes("opcao 5.2")) {
    return `📋 *Baixar Anexo I do CTM (Planilha Geral)*

${nome}, para consultar a planilha completa com todos os valores da TFLF 2025:

🔗 *Link de acesso:*
https://web.arapiraca.al.gov.br/wp-content/uploads/2021/01/TFLF2020a20251.pdf

📝 *Orientações ao contribuinte:*
Este documento contém o Anexo I da Lei 2.342/2003 - CTM de Arapiraca com todos os códigos de atividades e respectivos valores da Taxa de Funcionamento e Localização de Atividades (TFLF) de 2020 a 2025.

Digite *5* para voltar ao menu TFLF, *menu* para o menu principal ou *0* para encerrar.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                         🔍 LÓGICA DE BUSCA POR DESCRIÇÃO DE SERVIÇO
  // ═══════════════════════════════════════════════════════════════════════════════════════

  const contemLetras = /[a-zA-Z]/.test(msgLimpa);
  if (
    contemLetras &&
    msgLimpa.length >= 3 &&
    dadosISS.length > 0 &&
    estadoAtual === "consulta_iss"
  ) {
    const resultados = buscarPorDescricaoServico(msgLimpa);

    if (resultados && resultados.length > 0) {
      if (resultados.length === 1) {
        const item = resultados[0];
        return `📊 *Informações do ISS - Item ${item.codigoSubitem}*

${nome}, aqui estão as informações para o serviço:

🏷️ *Item:* ${item.codigoItem} - ${item.descricaoItem}
📝 *Subitem:* ${item.codigoSubitem} - ${item.descricaoSubitem}

💰 *Informações Tributárias:*
• Alíquota: ${(parseFloat(item.aliquota.replace(",", ".")) * 100).toFixed(1)}%
• Dedução da base de cálculo: ${item.percentualDeducao}
• Tributação fora de Arapiraca: ${item.tributacaoForaArapiraca}

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN, *menu* para menu principal ou *0* para encerrar.`;
      } else {
        let resposta = `🔍 *Resultados da busca por "${msgLimpa}"*

${nome}, encontrei ${resultados.length} serviços relacionados:

`;

        const max = Math.min(resultados.length, 10);
        for (let i = 0; i < max; i++) {
          const item = resultados[i];
          resposta += `*${i + 1}.* Item ${item.codigoSubitem} - ${
            item.descricaoSubitem
          }
💰 Alíquota: ${(parseFloat(item.aliquota.replace(",", ".")) * 100).toFixed(1)}%

`;
        }

        if (resultados.length > 10) {
          resposta += `... e mais ${resultados.length - 10} serviços.

`;
        }

        resposta += `Para ver as informações completas de um serviço específico, digite o código do item (ex: ${resultados[0].codigoSubitem}).

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN, *menu* para menu principal ou *0* para encerrar.`;

        return resposta;
      }
    } else {
      return `❌ *Nenhum serviço encontrado*

${nome}, não encontrei nenhum serviço com a descrição "${msgLimpa}".

💡 *Dicas:*
• Tente usar termos mais gerais (ex: "medicina" em vez de "médico")
• Verifique a grafia das palavras
• Use pelo menos 3 caracteres

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN ou *menu* para o menu principal.`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                         🔍 LÓGICA DE BUSCA POR CÓDIGO DE SERVIÇO ISS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  const codigoNumeros = msgLimpa.replace(/[^0-9]/g, "");
  if (
    codigoNumeros.length === 3 &&
    dadosISS.length > 0 &&
    estadoAtual === "consulta_iss"
  ) {
    // Primeiro tenta busca exata
    let resultados = buscarPorCodigoServico(codigoNumeros, true);

    if (resultados && resultados.length > 0) {
      // Encontrou resultado exato
      const item = resultados[0];
      return `📊 *Informações do ISS - Item ${item.codigoSubitem}*

${nome}, aqui estão as informações para o serviço:

🏷️ *Item:* ${item.codigoItem} - ${item.descricaoItem}
📝 *Subitem:* ${item.codigoSubitem} - ${item.descricaoSubitem}

💰 *Informações Tributárias:*
• Alíquota: ${(parseFloat(item.aliquota.replace(",", ".")) * 100).toFixed(1)}%
• Dedução da base de cálculo: ${item.percentualDeducao}
• Tributação fora de Arapiraca: ${item.tributacaoForaArapiraca}

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN, *menu* para menu principal ou *0* para encerrar.`;
    } else {
      // Se não encontrou busca exata, tenta busca que contém
      resultados = buscarPorCodigoServico(codigoNumeros, false);

      if (resultados && resultados.length > 0) {
        let resposta = `🔍 *Resultados da busca por "${codigoNumeros}"*

${nome}, não encontrei um código exato "${codigoNumeros}", mas encontrei ${resultados.length} serviços que contêm esses dígitos:

`;

        const max = Math.min(resultados.length, 8);
        for (let i = 0; i < max; i++) {
          const item = resultados[i];
          resposta += `*${i + 1}.* Item ${item.codigoSubitem}
${item.descricaoSubitem}
💰 Alíquota: ${(parseFloat(item.aliquota.replace(",", ".")) * 100).toFixed(1)}%

`;
        }

        if (resultados.length > 8) {
          resposta += `... e mais ${resultados.length - 8} serviços.

`;
        }

        resposta += `Para ver as informações completas de um serviço específico, digite o código do subitem completo.

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN, *menu* para menu principal ou *0* para encerrar.`;

        return resposta;
      } else {
        return `❌ *Nenhum serviço encontrado*

${nome}, não encontrei nenhum serviço com o código "${codigoNumeros}".

💡 *Dicas:*
• Verifique se digitou pelo menos 3 dígitos
• Use apenas números (sem letras)
• Exemplo: 102 para Programação
• Exemplo: 1402 para Assistência técnica

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN ou *menu* para o menu principal.`;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                         🔍 LÓGICA DE BUSCA POR DESCRIÇÃO DE CNAE
  // ═══════════════════════════════════════════════════════════════════════════════════════

  if (
    contemLetras &&
    msgLimpa.length >= 3 &&
    dadosTFLF.length > 0 &&
    estadoAtual === "consulta_cnae"
  ) {
    const resultados = buscarPorDescricaoCNAE(msgLimpa);

    if (resultados && resultados.length > 0) {
      if (resultados.length === 1) {
        const item = resultados[0];
        return `📊 *Valores da TFLF - CNAE ${item.cnae}*

${nome}, aqui estão os valores para a atividade:

🏷️ *Descrição:* ${item.descricao}

💰 *Valores da TFLF:*
• 2020: R$ ${parseFloat(item.tflf2020.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2021: R$ ${parseFloat(item.tflf2021.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2022: R$ ${parseFloat(item.tflf2022.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2023: R$ ${parseFloat(item.tflf2023.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2024: R$ ${parseFloat(item.tflf2024.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2025: R$ ${parseFloat(item.tflf2025.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}

Digite *5.1* para nova consulta, *5* para menu TFLF, *menu* para menu principal ou *0* para encerrar.`;
      } else {
        let resposta = `🔍 *Resultados da busca por "${msgLimpa}"*

${nome}, encontrei ${resultados.length} atividades relacionadas:

`;

        const max = Math.min(resultados.length, 10);
        for (let i = 0; i < max; i++) {
          const item = resultados[i];
          resposta += `*${i + 1}.* CNAE ${item.cnae}
${item.descricao}
💰 TFLF 2025: R$ ${parseFloat(item.tflf2025.replace(",", "."))
            .toFixed(2)
            .replace(".", ",")}

`;
        }

        if (resultados.length > 10) {
          resposta += `... e mais ${resultados.length - 10} atividades.

`;
        }

        resposta += `Para ver os valores completos de uma atividade específica, digite o código CNAE completo.

Digite *5.1* para nova consulta, *5* para menu TFLF, *menu* para menu principal ou *0* para encerrar.`;

        return resposta;
      }
    } else {
      return `❌ *Nenhuma atividade encontrada*

${nome}, não encontrei nenhuma atividade com a descrição "${msgLimpa}".

💡 *Dicas:*
• Tente usar termos mais gerais (ex: "comercio" em vez de "comercial")
• Verifique a grafia das palavras
• Use pelo menos 3 caracteres

Digite *5.1* para nova consulta, *5* para menu TFLF ou *menu* para o menu principal.`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                         🔍 LÓGICA DE BUSCA POR CÓDIGO CNAE
  // ═══════════════════════════════════════════════════════════════════════════════════════

  if (
    codigoNumeros.length >= 4 &&
    !contemLetras &&
    dadosTFLF.length > 0 &&
    estadoAtual === "consulta_cnae"
  ) {
    const resultados = buscarPorCNAE(codigoNumeros);

    if (resultados && resultados.length > 0) {
      if (resultados.length === 1) {
        const item = resultados[0];
        return `📊 *Valores da TFLF - CNAE ${item.cnae}*

${nome}, aqui estão os valores para a atividade:

🏷️ *Descrição:* ${item.descricao}

💰 *Valores da TFLF:*
• 2020: R$ ${parseFloat(item.tflf2020.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2021: R$ ${parseFloat(item.tflf2021.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2022: R$ ${parseFloat(item.tflf2022.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2023: R$ ${parseFloat(item.tflf2023.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2024: R$ ${parseFloat(item.tflf2024.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}
• 2025: R$ ${parseFloat(item.tflf2025.replace(",", "."))
          .toFixed(2)
          .replace(".", ",")}

Digite *5.1* para nova consulta, *5* para menu TFLF, *menu* para menu principal ou *0* para encerrar.`;
      } else {
        let resposta = `🔍 *Resultados da busca por CNAE "${codigoNumeros}"*

${nome}, encontrei ${resultados.length} atividades relacionadas:

`;

        const max = Math.min(resultados.length, 8);
        for (let i = 0; i < max; i++) {
          const item = resultados[i];
          resposta += `*${i + 1}.* CNAE ${item.cnae}
${item.descricao}
💰 TFLF 2025: R$ ${parseFloat(item.tflf2025.replace(",", "."))
            .toFixed(2)
            .replace(".", ",")}

`;
        }

        if (resultados.length > 8) {
          resposta += `... e mais ${resultados.length - 8} atividades.

`;
        }

        resposta += `Para ver os valores completos de uma atividade específica, digite o código CNAE completo.

Digite *5.1* para nova consulta, *5* para menu TFLF, *menu* para menu principal ou *0* para encerrar.`;

        return resposta;
      }
    } else {
      return `❌ *Nenhuma atividade encontrada*

${nome}, não encontrei nenhuma atividade com o código CNAE "${codigoNumeros}".

💡 *Dicas:*
• Verifique se digitou pelo menos 4 dígitos
• Use apenas números (sem letras)
• Exemplo: 4711 para comércio varejista
• Exemplo: 6201 para desenvolvimento de programas

Digite *5.1* para nova consulta, *5* para menu TFLF ou *menu* para o menu principal.`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                           🚪 ENCERRAMENTO DE ATENDIMENTO
  // ═══════════════════════════════════════════════════════════════════════════════════════

  if (msgLimpa.trim() === "0" || msgLimpa.includes("encerrar")) {
    return `👋 *Atendimento Encerrado*

${nome}, obrigado por utilizar nosso atendimento virtual!

Caso precise de mais informações, estarei sempre aqui para ajudar.

💡 *Links úteis:*
• Portal do Contribuinte: https://arapiraca.abaco.com.br/eagata/portal/
• NFSe: https://www.e-nfs.com.br/arapiraca/portal/

Tenha um excelente dia! 🌟

*Atendimento encerrado*`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  //                           ❓ RESPOSTA PADRÃO PARA MENSAGENS NÃO RECONHECIDAS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  return `❓ *Mensagem não reconhecida*

${nome}, desculpe, não entendi sua solicitação.

💡 *Dicas:*
• Digite *menu* para ver todas as opções disponíveis
• Use números para navegar (ex: 1, 2, 3, etc.)
• Para consultas específicas, certifique-se de estar na seção correta

Digite *menu* para ver o menu principal ou descreva sua dúvida de forma mais específica.`;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
//                           🌐 ENDPOINTS DA API DO SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════════════

// Rota raiz para requests GET
app.get("/", (req, res) => {
  res.json({
    status: "WhatsAuto Servidor Online",
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: "/webhook (POST)"
    }
  });
});

// Rota raiz para requests POST (caso o webhook seja enviado para /)
app.post("/", (req, res) => {
  console.log("📍 Requisição POST recebida na rota raiz - redirecionando para webhook");
  return processarWebhook(req, res);
});

app.post("/webhook", (req, res) => {
  console.log("📍 Requisição POST recebida no endpoint /webhook");
  return processarWebhook(req, res);
});

function processarWebhook(req, res) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("📥 WEBHOOK RECEBIDO");
  console.log("═══════════════════════════════════════════════════════════════");

  let data;

  try {
    if (req.body && Object.keys(req.body).length > 0) {
      console.log("✅ Usando req.body (JSON válido)");
      data = req.body;
    } else if (req.rawBody) {
      console.log("⚠️ Tentando parse manual do rawBody");
      const rawString = req.rawBody.toString();

      if (rawString.startsWith("{")) {
        try {
          data = JSON.parse(rawString);
          console.log("✅ Parse manual bem-sucedido");
        } catch (jsonErr) {
          console.log("❌ Falha no parse JSON manual:", jsonErr.message);
          try {
            data = qs.parse(rawString);
            console.log("✅ Parse como form-encoded bem-sucedido");
          } catch (qsErr) {
            console.log("❌ Falha no parse form-encoded:", qsErr.message);
            data = { message: rawString };
          }
        }
      } else {
        try {
          data = qs.parse(rawString);
          console.log("✅ Parse como form-encoded bem-sucedido");
        } catch (qsErr) {
          console.log("❌ Falha no parse form-encoded:", qsErr.message);
          data = { message: rawString };
        }
      }
    } else {
      console.log("❌ Nem req.body nem req.rawBody disponíveis");
      return res.status(400).json({ error: "Dados inválidos" });
    }

    console.log("📊 Dados processados:", JSON.stringify(data, null, 2));

    const message = data.message || data.Body || data.text || "";
    const sender = data.sender || data.From || data.number || "usuario";

    if (!message) {
      console.log("❌ Mensagem vazia ou inválida");
      return res.status(400).json({ error: "Mensagem não encontrada" });
    }

    console.log("📩 Mensagem recebida:", message);
    console.log("👤 Remetente:", sender);

    const resposta = gerarResposta(message, sender, req);

    console.log("📤 Resposta gerada:", typeof resposta === 'object' ? JSON.stringify(resposta, null, 2) : resposta);

    res.json({
      success: true,
      response: resposta,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Erro no processamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
//                           🚀 INICIALIZAÇÃO DO SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🚀                 SERVIDOR WHATSAUTO INICIADO                 🚀");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`🌐 Servidor rodando na porta: ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`📊 Dados TFLF carregados: ${dadosTFLF.length} registros`);
  console.log(`📋 Dados ISS carregados: ${dadosISS.length} registros`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("✅ Sistema pronto para receber mensagens!");
  console.log("═══════════════════════════════════════════════════════════════");
});
