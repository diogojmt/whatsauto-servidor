const express = require("express");
const qs = require("querystring"); // módulo nativo do Node
const fs = require("fs");
const app = express();

// ---------- Carregar dados da TFLF ----------
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

// ---------- Carregar dados do ISS ----------
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

// Função para buscar por CNAE (desconsiderando letras iniciais)
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

// Função para buscar por código de serviço (item da Lei Complementar 116/2003)
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

// Função para buscar por descrição de serviço
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

// Função para buscar por descrição de CNAE
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

// Carregar dados na inicialização
carregarDadosTFLF();
carregarDadosISS();

// ---------- LOG bruto ----------
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

// ---------- Tenta JSON -----------
app.use(express.json());

// ---------- Se falhar, não aborta ----------
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.warn("⚠️ JSON malformado – seguir para parse manual");
    return next(); // segue adiante
  }
  next(err);
});

// ---------- Função para gerar menu de opções ----------
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

// ---------- Controle de Estados do Atendimento ----------
const estadosUsuario = new Map(); // Armazena o estado atual de cada usuário

function obterEstadoUsuario(sender) {
  return estadosUsuario.get(sender) || 'menu_principal';
}

function definirEstadoUsuario(sender, estado) {
  estadosUsuario.set(sender, estado);
}

// ---------- Função para gerar respostas automáticas ----------
function gerarResposta(message, sender) {
  const nome = sender || "cidadão";
  const msgLimpa = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos
  
  const estadoAtual = obterEstadoUsuario(sender);

  // Verificar mensagens de agradecimento para encerrar cordialmente
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

  // Retorno ao menu principal - palavra-chave "menu"
  if (msgLimpa.includes("menu") || msgLimpa.includes("inicio")) {
    definirEstadoUsuario(sender, 'menu_principal');
    return gerarMenuPrincipal(nome);
  }

  // Menu principal - saudações e palavras-chave
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
    definirEstadoUsuario(sender, 'menu_principal');
    return gerarMenuPrincipal(nome);
  }

  // Navegação com "1" - retorna ao menu DAMs se digitado sozinho
  if (msgLimpa.trim() === "1") {
    definirEstadoUsuario(sender, 'opcao_1_dams');
    return `📄 *Segunda via de DAM's*

${nome}, escolha uma das opções abaixo digitando o número:

*1.1* - 🏠 IPTU 2025
*1.2* - 🏪 TFLF 2025
*1.3* - 🧾 ISSQN Próprio 2025
*1.4* - 📋 ISSQN Retido 2025
*1.5* - 💰 Outras Taxas/Encargos 2025
*1.6* - 📊 Outras Dívidas Diversas 2025
*1.7* - ⚖️ Débitos Inscritos em Dívida Ativa

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  // Navegação por números - opção 1 do menu principal
  if (msgLimpa.includes("opcao 1")) {
    definirEstadoUsuario(sender, 'opcao_1_dams');
    return `📄 *Segunda via de DAM's*

${nome}, escolha uma das opções abaixo digitando o número:

*1.1* - 🏠 IPTU 2025
*1.2* - 🏪 TFLF 2025
*1.3* - 🧾 ISSQN Próprio 2025
*1.4* - 📋 ISSQN Retido 2025
*1.5* - 💰 Outras Taxas/Encargos 2025
*1.6* - 📊 Outras Dívidas Diversas 2025
*1.7* - ⚖️ Débitos Inscritos em Dívida Ativa

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "1.1" ||
    msgLimpa.includes("opcao 1.1") ||
    msgLimpa.includes("iptu 2025")
  ) {
    return `🏠 *IPTU 2025*

${nome}, para emitir a segunda via do IPTU 2025:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?12,iptu

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número da Inscrição do Imóvel

Digite *1* para voltar às opções de DAM's, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "1.2" ||
    msgLimpa.includes("opcao 1.2") ||
    msgLimpa.includes("tflf 2025")
  ) {
    return `🏪 *TFLF 2025*

${nome}, para emitir a segunda via do TFLF 2025:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?15,tflf

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número da Inscrição Municipal, CPF ou CNPJ

Digite *1* para voltar às opções de DAM's, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "1.3" ||
    msgLimpa.includes("opcao 1.3") ||
    msgLimpa.includes("issqn proprio")
  ) {
    return `🧾 *ISSQN Próprio 2025*

${nome}, para emitir a segunda via do ISSQN Próprio 2025:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?13,issqn

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número da Inscrição Municipal, CPF ou CNPJ

Digite *1* para voltar às opções de DAM's, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "1.4" ||
    msgLimpa.includes("opcao 1.4") ||
    msgLimpa.includes("issqn retido")
  ) {
    return `📋 *ISSQN Retido 2025*

${nome}, para emitir a segunda via do ISSQN Retido 2025:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?14,substituicao-tributaria

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número da Inscrição Municipal, CPF ou CNPJ

Digite *1* para voltar às opções de DAM's, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "1.5" ||
    msgLimpa.includes("opcao 1.5") ||
    msgLimpa.includes("outras taxas")
  ) {
    return `💰 *Outras Taxas/Encargos 2025*

${nome}, para emitir a segunda via de Outras Taxas/Encargos 2025:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?16,taxas-enc-pecuniarios

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número do CPF ou CNPJ

Digite *1* para voltar às opções de DAM's, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "1.6" ||
    msgLimpa.includes("opcao 1.6") ||
    msgLimpa.includes("dividas diversas")
  ) {
    return `📊 *Outras Dívidas Diversas 2025*

${nome}, para emitir a segunda via de Outras Dívidas Diversas 2025:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?43,divida-diversa

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos o número do CPF ou CNPJ

Digite *1* para voltar às opções de DAM's, *menu* para o menu principal ou *0* para encerrar.`;
  }

  if (
    msgLimpa.trim() === "1.7" ||
    msgLimpa.includes("opcao 1.7") ||
    msgLimpa.includes("divida ativa")
  ) {
    return `⚖️ *Débitos Inscritos em Dívida Ativa*

${nome}, para emitir a segunda via de Débitos Inscritos em Dívida Ativa:

🔗 *Link de acesso:*
https://arapiraca.abaco.com.br/eagata/servlet/hwtportalcontribuinte?11,divida-ativa

📝 *Orientações ao contribuinte:*
Para facilitar a consulta tenha em mãos a Inscrição do Imóvel ou a Inscrição Municipal

Digite *1* para voltar às opções de DAM's, *menu* para o menu principal ou *0* para encerrar.`;
  }

  // Navegação com "2" - retorna ao menu Certidões se digitado sozinho
  if (msgLimpa.trim() === "2") {
    definirEstadoUsuario(sender, 'opcao_2_certidoes');
    return `📄 *Certidões de Regularidade Fiscal*

${nome}, escolha uma das opções abaixo digitando o número:

*2.1* - 🏘️ Certidão Imobiliária
*2.2* - 📋 Certidão Geral  
*2.3* - ✅ Autenticidade

🌐 Portal do Contribuinte: https://arapiraca.abaco.com.br/eagata/portal/

Para dúvidas, procure a Secretaria da Fazenda:
📍 Rua Samaritana, 1.180 - Bairro Santa Edwiges - Próximo ao Shopping
🗺️ https://maps.google.com/?q=Rua+Samaritana,+1180,+Arapiraca,+AL

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  // Navegação por números - opção 2 do menu principal
  if (msgLimpa.includes("opcao 2")) {
    definirEstadoUsuario(sender, 'opcao_2_certidoes');
    return `📄 *Certidões de Regularidade Fiscal*

${nome}, escolha uma das opções abaixo digitando o número:

*2.1* - 🏘️ Certidão Imobiliária
*2.2* - 📋 Certidão Geral  
*2.3* - ✅ Autenticidade

🌐 Portal do Contribuinte: https://arapiraca.abaco.com.br/eagata/portal/

Para dúvidas, procure a Secretaria da Fazenda:
📍 Rua Samaritana, 1.180 - Bairro Santa Edwiges - Próximo ao Shopping
🗺️ https://maps.google.com/?q=Rua+Samaritana,+1180,+Arapiraca,+AL

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

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

  // Navegação com "3" - retorna ao menu NFSe e ISSQN se digitado sozinho
  if (msgLimpa.trim() === "3") {
    definirEstadoUsuario(sender, 'opcao_3_nfse');
    return `🧾 *NFSe e ISSQN*

${nome}, escolha uma das opções abaixo digitando o número:

*3.1* - 🌐 Acesso ao Site para Emissão
*3.2* - ❓ Dúvidas e Reclamações
*3.3* - 📖 Manuais de Utilização do Sistema
*3.4* - 📊 Alíquota, Deduções e Local de Tributação

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  // Navegação por números - opção 3 do menu principal
  if (msgLimpa.includes("opcao 3")) {
    definirEstadoUsuario(sender, 'opcao_3_nfse');
    return `🧾 *NFSe e ISSQN*

${nome}, escolha uma das opções abaixo digitando o número:

*3.1* - 🌐 Acesso ao Site para Emissão
*3.2* - ❓ Dúvidas e Reclamações
*3.3* - 📖 Manuais de Utilização do Sistema
*3.4* - 📊 Alíquota, Deduções e Local de Tributação

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

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

  // Navegação com "3.3" - retorna ao menu de manuais se digitado sozinho
  if (msgLimpa.trim() === "3.3") {
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

  // Navegação por números - opção 3.3 do menu NFSe
  if (msgLimpa.includes("opcao 3.3") || msgLimpa.includes("manuais nfse")) {
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

  if (msgLimpa.trim() === "3.4" || msgLimpa.includes("opcao 3.4")) {
    definirEstadoUsuario(sender, 'consulta_iss');
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

  if (msgLimpa.trim() === "4" || msgLimpa.includes("opcao 4")) {
    return `📋 *Lista de Substitutos Tributários*

${nome}, para consultar a lista de substitutos tributários:

🔗 *Link de acesso:*
https://web.arapiraca.al.gov.br/wp-content/uploads/2021/01/DECRETOSUBSTITUTOTRIBUTARIO2023-2.pdf

📝 *Orientações ao contribuinte:*
Decreto 2.842/2023 - Dispõe sobre o regíme de responsabilidade supletiva, sobre contribuintes e/ou responsáveis tributários e adota providências correlatas.

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "5" || msgLimpa.includes("opcao 5")) {
    definirEstadoUsuario(sender, 'opcao_5_tflf');
    return `💰 *TFLF 2025*

${nome}, escolha uma das opções abaixo digitando o número:

*5.1* - 🔍 Consultar Valores por CNAE
*5.2* - 📋 Baixar Anexo I do CTM (Planilha Geral)

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "5.1" || msgLimpa.includes("opcao 5.1")) {
    definirEstadoUsuario(sender, 'consulta_cnae');
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

  // Verificar se é uma busca por descrição de serviço (texto com pelo menos 3 caracteres e não apenas números)
  // SOMENTE quando o usuário estiver na opção 3.4 (consulta_iss)
  const contemLetras = /[a-zA-Z]/.test(msgLimpa);
  if (contemLetras && msgLimpa.length >= 3 && dadosISS.length > 0 && estadoAtual === 'consulta_iss') {
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

  // Verificar se é um código de serviço ISS (números com 3 dígitos exatos para verificar primeiro)
  // SOMENTE quando o usuário estiver na opção 3.4 (consulta_iss)
  const codigoNumeros = msgLimpa.replace(/[^0-9]/g, "");
  if (codigoNumeros.length === 3 && dadosISS.length > 0 && estadoAtual === 'consulta_iss') {
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

        const max = Math.min(resultados.length, 8); // Limita a 8 resultados
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

  // Verificar se é uma busca por descrição de CNAE (texto com pelo menos 3 caracteres e não apenas números)
  // SOMENTE quando o usuário estiver na opção 5.1 (consulta_cnae)
  if (contemLetras && msgLimpa.length >= 3 && dadosTFLF.length > 0 && estadoAtual === 'consulta_cnae') {
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

  // Verificar se é um código CNAE (números com pelo menos 4 dígitos)
  // SOMENTE quando o usuário estiver na opção 5.1 (consulta_cnae)
  const codigoCNAE = msgLimpa.replace(/[^0-9]/g, "");
  if (codigoCNAE.length >= 4 && dadosTFLF.length > 0 && estadoAtual === 'consulta_cnae') {
    const resultados = buscarPorCNAE(codigoCNAE);

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
        let resposta = `🔍 *Resultados da busca por "${codigoCNAE}"*

${nome}, encontrei ${resultados.length} atividades que contêm esses dígitos:

`;

        const max = Math.min(resultados.length, 10); // Limita a 10 resultados
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

${nome}, não encontrei nenhuma atividade com o código "${codigoCNAE}".

💡 *Dicas:*
• Verifique se digitou pelo menos 4 dígitos
• Use apenas números (sem letras)
• Exemplo: 4711 para comércio varejista

Digite *5.2* para baixar a planilha completa, *5.1* para nova consulta ou *menu* para o menu principal.`;
    }
  }

  // Verificar se é um código de serviço ISS com 4 dígitos (após tentar CNAE)
  // SOMENTE quando o usuário estiver na opção 3.4 (consulta_iss)
  if (codigoCNAE.length === 4 && dadosISS.length > 0 && estadoAtual === 'consulta_iss') {
    // Primeiro tenta busca exata
    let resultadosISS = buscarPorCodigoServico(codigoCNAE, true);

    if (resultadosISS && resultadosISS.length > 0) {
      // Encontrou resultado exato
      const item = resultadosISS[0];
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
      resultadosISS = buscarPorCodigoServico(codigoCNAE, false);

      if (resultadosISS && resultadosISS.length > 0) {
        let resposta = `🔍 *Resultados da busca ISS por "${codigoCNAE}"*

${nome}, não encontrei um código exato "${codigoCNAE}", mas encontrei ${resultadosISS.length} serviços que contêm esses dígitos:

`;

        const max = Math.min(resultadosISS.length, 8); // Limita a 8 resultados
        for (let i = 0; i < max; i++) {
          const item = resultadosISS[i];
          resposta += `*${i + 1}.* Item ${item.codigoSubitem}
${item.descricaoSubitem}
💰 Alíquota: ${(parseFloat(item.aliquota.replace(",", ".")) * 100).toFixed(1)}%

`;
        }

        if (resultadosISS.length > 8) {
          resposta += `... e mais ${resultadosISS.length - 8} serviços.

`;
        }

        resposta += `Para ver as informações completas de um serviço específico, digite o código do subitem completo.

Digite *3.4* para nova consulta, *3* para menu NFSe e ISSQN, *menu* para menu principal ou *0* para encerrar.`;

        return resposta;
      }
    }
  }

  // Navegação específica de volta aos menus anteriores
  if (msgLimpa.includes("voltar") || msgLimpa.includes("anterior")) {
    return gerarMenuPrincipal(nome);
  }

  // Navegação com "0" - sempre encerra no menu principal
  if (
    msgLimpa.trim() === "0" ||
    msgLimpa.includes("opcao 0") ||
    msgLimpa.includes("encerrar")
  ) {
    return `👋 *Encerrando Atendimento*

${nome}, agradecemos por utilizar nossos serviços digitais!

🏛️ *Prefeitura de Arapiraca - Secretaria da Fazenda*

Para um novo atendimento, digite *menu* ou inicie uma nova conversa.

Tenha um ótimo dia! 😊`;
  }

  // Mensagens de agradecimento - encerra o atendimento
  if (
    msgLimpa.includes("obrigado") ||
    msgLimpa.includes("obrigada") ||
    msgLimpa.includes("valeu") ||
    msgLimpa.includes("muito obrigado") ||
    msgLimpa.includes("muito obrigada") ||
    msgLimpa.includes("brigado") ||
    msgLimpa.includes("brigada") ||
    msgLimpa.includes("gracas") ||
    msgLimpa.includes("agradeco")
  ) {
    return `😊 *De nada, ${nome}!*

Foi um prazer ajudá-lo(a) hoje!

🏛️ *Prefeitura de Arapiraca - Secretaria da Fazenda*

Para um novo atendimento, digite *menu* ou inicie uma nova conversa.

Tenha um ótimo dia! 👋`;
  }

  if (msgLimpa.includes("atendente")) {
    return `👨‍💼 *Solicitação de Atendimento Humano*

${nome}, para falar com um atendente, procure diretamente:

📍 *Secretaria da Fazenda Municipal*
Rua Samaritana, 1.180 - Bairro Santa Edwiges - Próximo ao Shopping
🗺️ https://maps.google.com/?q=Rua+Samaritana,+1180,+Arapiraca,+AL

⏱️ *Horário de atendimento:*
Segunda a Sexta: 8h às 14h
📧 smfaz@arapiraca.al.gov.br

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  // Detecção por palavras-chave (mantida para compatibilidade)
  if (msgLimpa.includes("iptu")) {
    return `${nome}, digite *1* para ver todas as opções sobre IPTU ou segunda via de DAM's.`;
  }

  if (msgLimpa.includes("certidao") || msgLimpa.includes("negativa")) {
    return `${nome}, digite *2* para ver todas as opções sobre certidões ou acesse o Portal do Contribuinte.`;
  }

  if (
    msgLimpa.includes("nota fiscal") ||
    msgLimpa.includes("nfse") ||
    msgLimpa.includes("nfs-e") ||
    msgLimpa.includes("issqn") ||
    msgLimpa.includes("iss")
  ) {
    return `${nome}, digite *3* para ver todas as opções sobre NFSe e ISSQN.`;
  }

  if (
    msgLimpa.includes("substituto tributario") ||
    msgLimpa.includes("substitutos")
  ) {
    return `${nome}, digite *4* para consultar a Lista de Substitutos Tributários.`;
  }

  if (msgLimpa.includes("valor tflf") || msgLimpa.includes("tflf 2025")) {
    return `${nome}, digite *5* para acessar as opções da TFLF 2025: consultar por CNAE ou baixar planilha completa.`;
  }

  // Resposta padrão para mensagens não reconhecidas
  return `${nome}, não consegui entender sua mensagem. 

🤖 *Para continuar, você pode:*

• Digite *menu* para ver todas as opções disponíveis
• Digite *1* para Segunda via de DAM's
• Digite *2* para Certidões de Regularidade Fiscal
• Digite *3* para NFSe
• Digite *4* para Lista de Substitutos Tributários
• Digite *5* para TFLF 2025
• Digite *0* para encerrar o atendimento

🏛️ *Ou compareça pessoalmente:*
Secretaria da Fazenda Municipal
📍 Rua Samaritana, 1.180 - Bairro Santa Edwiges
🗺️ https://maps.google.com/?q=Rua+Samaritana,+1180,+Arapiraca,+AL
📧 smfaz@arapiraca.al.gov.br
⏱️ Segunda a Sexta: 8h às 14h`;
}

// ---------- Rota principal ----------
app.post("/", (req, res) => {
  // Se JSON falhou, tenta decodificar req.rawBody como urlencoded
  if (!req.body || Object.keys(req.body).length === 0) {
    req.body = qs.parse(req.rawBody);
  }

  const sender = decodeURIComponent(req.body.sender || "Usuário");
  const message = decodeURIComponent(req.body.message || "(sem mensagem)");

  console.log("✅ Interpretado:", { sender, message });

  // Verificar se a mensagem é do próprio sistema (para evitar loop)
  const mensagensDoSistema = [
    'Olá', 'Seja bem-vindo', 'Digite menu', 'Escolha uma das opções',
    'Segunda via', 'Certidões', 'NFSe', 'TFLF', 'Substitutos Tributários'
  ];
  
  const ehMensagemDoSistema = mensagensDoSistema.some(termo => 
    message.includes(termo) && message.includes('📄')
  );
  
  // Se for mensagem do sistema, não responder (evitar loop)
  if (ehMensagemDoSistema) {
    console.log('🔄 Mensagem do sistema detectada - Não respondendo para evitar loop');
    return res.status(200).end(); // Não envia resposta para evitar loop
  }

  const resposta = gerarResposta(message, sender);

  res.json({
    reply: resposta,
  });
});

// Endpoint POST para integração com WhatsAuto
app.post("/mensagem", (req, res) => {
  const { sender, message } = req.body || qs.parse(req.rawBody);
  
  // Verificar se a mensagem é do próprio sistema (para evitar loop)
  const mensagensDoSistema = [
    'Olá', 'Seja bem-vindo', 'Digite menu', 'Escolha uma das opções',
    'Segunda via', 'Certidões', 'NFSe', 'TFLF', 'Substitutos Tributários'
  ];
  
  const ehMensagemDoSistema = mensagensDoSistema.some(termo => 
    message.includes(termo) && message.includes('📄')
  );
  
  // Se for mensagem do sistema, não responder (evitar loop)
  if (ehMensagemDoSistema) {
    console.log('🔄 Mensagem do sistema detectada - Não respondendo para evitar loop');
    return res.status(200).end(); // Não envia resposta para evitar loop
  }
  
  const resposta = gerarResposta(message, sender);
  res.send(resposta);
});

// GET simples para health-check
app.get("/", (_, res) =>
  res.send("✅ Servidor WhatsAuto ativo – envie POST para testar.")
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
