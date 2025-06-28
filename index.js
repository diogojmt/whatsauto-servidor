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
            tflf2025: colunas[8]
          });
        }
      }
    }
    console.log(`✅ Carregados ${dadosTFLF.length} registros da TFLF`);
  } catch (error) {
    console.error("❌ Erro ao carregar dados da TFLF:", error);
  }
}

// Função para buscar por CNAE (desconsiderando letras iniciais)
function buscarPorCNAE(digitosCNAE) {
  if (!digitosCNAE || digitosCNAE.length < 4) {
    return null;
  }
  
  const resultados = dadosTFLF.filter(item => {
    // Remove letras do início da CNAE e mantém só números
    const cnaeNumeros = item.cnae.replace(/^[A-Za-z]+/, "");
    return cnaeNumeros.includes(digitosCNAE);
  });
  
  return resultados;
}

// Carregar dados na inicialização
carregarDadosTFLF();

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
*3* - 🧾 NFSe
*4* - 📋 Lista de Substitutos Tributários
*5* - 💰 TFLF 2025
*0* - 👋 Encerrar Atendimento

Digite o número da opção desejada ou descreva sua dúvida.`;
}

// ---------- Função para gerar respostas automáticas ----------
function gerarResposta(message, sender) {
  const nome = sender || "cidadão";
  const msgLimpa = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos

  // Retorno ao menu principal - palavra-chave "menu"
  if (msgLimpa.includes("menu") || msgLimpa.includes("inicio")) {
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
    return gerarMenuPrincipal(nome);
  }

  // Navegação com "1" - retorna ao menu DAMs se digitado sozinho
  if (msgLimpa.trim() === "1") {
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

  // Navegação com "3" - retorna ao menu NFSe se digitado sozinho
  if (msgLimpa.trim() === "3") {
    return `🧾 *NFSe*

${nome}, escolha uma das opções abaixo digitando o número:

*3.1* - 🌐 Acesso ao Site para Emissão
*3.2* - ❓ Dúvidas e Reclamações
*3.3* - 📖 Manuais de Utilização do Sistema

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  // Navegação por números - opção 3 do menu principal
  if (msgLimpa.includes("opcao 3")) {
    return `🧾 *NFSe*

${nome}, escolha uma das opções abaixo digitando o número:

*3.1* - 🌐 Acesso ao Site para Emissão
*3.2* - ❓ Dúvidas e Reclamações
*3.3* - 📖 Manuais de Utilização do Sistema

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
  if (
    msgLimpa.includes("opcao 3.3") ||
    msgLimpa.includes("manuais nfse")
  ) {
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
    return `💰 *TFLF 2025*

${nome}, escolha uma das opções abaixo digitando o número:

*5.1* - 🔍 Consultar Valores por CNAE
*5.2* - 📋 Baixar Anexo I do CTM (Planilha Geral)

Digite *menu* para voltar ao menu principal ou *0* para encerrar.`;
  }

  if (msgLimpa.trim() === "5.1" || msgLimpa.includes("opcao 5.1")) {
    return `🔍 *Consultar Valores por CNAE*

${nome}, para consultar o valor da TFLF por atividade:

📝 *Digite o código CNAE da sua atividade:*
• Mínimo 4 dígitos
• Exemplo: 4711 (para comércio varejista)
• Apenas números, sem letras

O sistema buscará todas as atividades que contenham esses dígitos.

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

  // Verificar se é um código CNAE (números com pelo menos 4 dígitos)
  const codigoCNAE = msgLimpa.replace(/[^0-9]/g, "");
  if (codigoCNAE.length >= 4 && dadosTFLF.length > 0) {
    const resultados = buscarPorCNAE(codigoCNAE);
    
    if (resultados && resultados.length > 0) {
      if (resultados.length === 1) {
        const item = resultados[0];
        return `📊 *Valores da TFLF - CNAE ${item.cnae}*

${nome}, aqui estão os valores para a atividade:

🏷️ *Descrição:* ${item.descricao}

💰 *Valores da TFLF:*
• 2020: R$ ${parseFloat(item.tflf2020.replace(',', '.')).toFixed(2).replace('.', ',')}
• 2021: R$ ${parseFloat(item.tflf2021.replace(',', '.')).toFixed(2).replace('.', ',')}
• 2022: R$ ${parseFloat(item.tflf2022.replace(',', '.')).toFixed(2).replace('.', ',')}
• 2023: R$ ${parseFloat(item.tflf2023.replace(',', '.')).toFixed(2).replace('.', ',')}
• 2024: R$ ${parseFloat(item.tflf2024.replace(',', '.')).toFixed(2).replace('.', ',')}
• 2025: R$ ${parseFloat(item.tflf2025.replace(',', '.')).toFixed(2).replace('.', ',')}

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
💰 TFLF 2025: R$ ${parseFloat(item.tflf2025.replace(',', '.')).toFixed(2).replace('.', ',')}

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

  // Navegação específica de volta aos menus anteriores
  if (msgLimpa.includes("voltar") || msgLimpa.includes("anterior")) {
    return gerarMenuPrincipal(nome);
  }

  // Navegação com "0" - sempre encerra no menu principal
  if (msgLimpa.trim() === "0" || msgLimpa.includes("opcao 0") || msgLimpa.includes("encerrar")) {
    return `👋 *Encerrando Atendimento*

${nome}, agradecemos por utilizar nossos serviços digitais!

🏛️ *Prefeitura de Arapiraca - Secretaria da Fazenda*

Para um novo atendimento, digite *menu* ou inicie uma nova conversa.

Tenha um ótimo dia! 😊`;
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

  if (msgLimpa.includes("nota fiscal") || msgLimpa.includes("nfse") || msgLimpa.includes("nfs-e")) {
    return `${nome}, digite *3* para ver todas as opções sobre NFSe.`;
  }

  if (msgLimpa.includes("substituto tributario") || msgLimpa.includes("substitutos")) {
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

  const resposta = gerarResposta(message, sender);

  res.json({
    reply: resposta,
  }); 
});

// GET simples
app.get("/", (_, res) =>
  res.send("✅ Servidor WhatsAuto ativo – envie POST para testar.")
);

app.listen(3000, () => console.log("\n🚀 Servidor de testes na porta 3000\n"));
