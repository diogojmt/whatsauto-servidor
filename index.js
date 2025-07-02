const express = require("express");
const qs = require("querystring");
const path = require("path");

// Importar módulos refatorados
const {
  carregarDadosTFLF,
  carregarDadosISS,
} = require("./src/utils/dataLoader");
const { processarMensagem } = require("./src/handlers/messageHandler");
const { ehMensagemDoSistema } = require("./src/utils/mediaUtils");
const { DebitosService } = require("./src/services/debitosService");

const app = express();

// Instanciar serviço de débitos
const debitosService = new DebitosService();

// ---------- Carregar dados na inicialização ----------
let dadosTFLF = [];
let dadosISS = [];

function inicializarDados() {
  console.log("🔄 Carregando dados...");
  dadosTFLF = carregarDadosTFLF();
  dadosISS = carregarDadosISS();
  console.log("✅ Dados carregados com sucesso!");
}

// Carregar dados na inicialização
inicializarDados();

// ---------- Servir arquivos estáticos (imagens) ----------
app.use("/imagens", express.static(path.join(__dirname)));

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

// ---------- Função auxiliar para extrair nome do usuário ----------
function extrairNomeUsuario(body) {
  if (!body) return "Cidadão";

  // Tentar diferentes campos onde o nome pode estar
  const possiveisNomes = [
    body.pushName,
    body.notifyName,
    body.contact_name,
    body.contactName,
    body.name,
    body.user?.name,
    body.contact?.name,
    body.contact?.pushname,
    body.profile?.name,
    body.sender_name,
    body.from_name,
  ];

  // Encontrar o primeiro nome válido
  for (const nome of possiveisNomes) {
    if (nome && typeof nome === "string" && nome.trim() !== "") {
      const nomeDecodificado = decodeURIComponent(nome).trim();
      if (nomeDecodificado !== "" && !nomeDecodificado.includes("@")) {
        return nomeDecodificado;
      }
    }
  }

  return "Cidadão";
}

// ---------- Função para processar resposta ----------
async function processarResposta(
  req,
  res,
  sender,
  message,
  nomeUsuario = "Cidadão"
) {
  // Verificar se é mensagem do sistema para evitar loop
  if (ehMensagemDoSistema(message)) {
    console.log(
      "🔄 Mensagem do sistema detectada - Não respondendo para evitar loop"
    );
    return res.status(200).end();
  }

  const resposta = await processarMensagem(
    message,
    sender,
    dadosTFLF,
    dadosISS,
    req,
    nomeUsuario
  );
  console.log("🎯 Resposta gerada:", resposta);

  // Verificar se a resposta inclui mídia
  if (typeof resposta === "object" && resposta.type === "media") {
    console.log("📸 Enviando resposta com mídia:", {
      reply: resposta.text,
      media: resposta.media,
      media_type: "image",
    });
    res.json({
      reply: resposta.text,
      media: resposta.media,
      media_type: "image",
    });
  } else {
    console.log("💬 Enviando resposta de texto:", resposta);
    res.json({
      reply: resposta,
    });
  }
}

// ---------- Rota principal ----------
app.post("/", async (req, res) => {
  // Se JSON falhou, tenta decodificar req.rawBody como urlencoded
  if (!req.body || Object.keys(req.body).length === 0) {
    req.body = qs.parse(req.rawBody);
  }

  // Log dos dados recebidos para debug (remover em produção se necessário)
  console.log("📋 Dados recebidos:", {
    sender: req.body.sender,
    message: req.body.message,
    pushName: req.body.pushName,
    notifyName: req.body.notifyName,
    contact_name: req.body.contact_name,
    name: req.body.name,
  });

  const sender = decodeURIComponent(req.body.sender || "Usuário");
  const message = decodeURIComponent(req.body.message || "(sem mensagem)");

  // Extrair o nome do usuário dos dados recebidos
  const nomeUsuario = extrairNomeUsuario(req.body);

  console.log("✅ Interpretado:", {
    sender,
    message,
    nomeUsuario: nomeUsuario,
    tipoNome: typeof nomeUsuario,
  });

  await processarResposta(req, res, sender, message, nomeUsuario);
});

// ---------- Endpoint POST para integração com WhatsAuto ----------
app.post("/mensagem", async (req, res) => {
  const { sender, message } = req.body || qs.parse(req.rawBody);

  // Extrair o nome do usuário dos dados recebidos
  const nomeUsuario = extrairNomeUsuario(req.body || qs.parse(req.rawBody));

  // Log dos dados recebidos para debug
  console.log("📋 Endpoint /mensagem - Dados recebidos:", {
    sender,
    message,
    nomeUsuario: nomeUsuario,
    dadosCompletos: req.body || qs.parse(req.rawBody),
  });

  // Verificar se é mensagem do sistema para evitar loop
  if (ehMensagemDoSistema(message)) {
    console.log(
      "🔄 Mensagem do sistema detectada - Não respondendo para evitar loop"
    );
    return res.status(200).end();
  }

  const resposta = await processarMensagem(
    message,
    sender,
    dadosTFLF,
    dadosISS,
    null,
    nomeUsuario
  );

  // Verificar se a resposta inclui mídia
  if (typeof resposta === "object" && resposta.type === "media") {
    res.json({
      reply: resposta.text,
      media: resposta.media,
      media_type: "image",
    });
  } else {
    res.send(resposta);
  }
});

// ---------- Health check ----------
app.get("/", (_, res) =>
  res.send("✅ Servidor WhatsAuto ativo – envie POST para testar.")
);

// ---------- Endpoint para recarregar dados ----------
app.post("/reload", (req, res) => {
  try {
    inicializarDados();
    res.json({
      success: true,
      message: "Dados recarregados com sucesso",
      dadosTFLF: dadosTFLF.length,
      dadosISS: dadosISS.length,
    });
  } catch (error) {
    console.error("❌ Erro ao recarregar dados:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao recarregar dados",
      error: error.message,
    });
  }
});

// ---------- Endpoint para status ----------
app.get("/status", (req, res) => {
  res.json({
    status: "ativo",
    dadosTFLF: dadosTFLF.length,
    dadosISS: dadosISS.length,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: {
      emissaoCertidoes: true,
      consultaPorCpfCnpj: false, // API Ábaco não suporta
      fluxoOtimizado: true,
      capturaAutomaticaNome: true, // Nova feature
    },
  });
});

// ---------- Endpoint para testar API da Ábaco ----------
app.get("/test-cpf/:cpf", async (req, res) => {
  res.json({
    cpf: req.params.cpf,
    suporte: false,
    motivo: "API Ábaco exige inscrição como parâmetro obrigatório",
    fluxo: "CPF/CNPJ + Inscrição → Certidão",
    timestamp: new Date().toISOString(),
  });
});

// ---------- Endpoint para debug de nomes (remover em produção) ----------
app.post("/debug-nome", (req, res) => {
  const nomeExtraido = extrairNomeUsuario(req.body);

  res.json({
    nomeExtraido: nomeExtraido,
    dadosRecebidos: req.body,
    camposVerificados: {
      pushName: req.body?.pushName,
      notifyName: req.body?.notifyName,
      contact_name: req.body?.contact_name,
      contactName: req.body?.contactName,
      name: req.body?.name,
      user_name: req.body?.user?.name,
      contact_name_nested: req.body?.contact?.name,
      contact_pushname: req.body?.contact?.pushname,
      profile_name: req.body?.profile?.name,
      sender_name: req.body?.sender_name,
      from_name: req.body?.from_name,
    },
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log(`🔄 Reload: POST http://localhost:${PORT}/reload`);
  console.log(`🐛 Debug Nome: POST http://localhost:${PORT}/debug-nome`);
  console.log(`🌐 Deploy: Aplicação pronta para deploy no Replit`);
  console.log(`👤 Captura automática de nome: ATIVADA`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Recebido SIGTERM, fazendo shutdown graceful...");
  server.close(() => {
    console.log("✅ Servidor encerrado com sucesso");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 Recebido SIGINT, fazendo shutdown graceful...");
  server.close(() => {
    console.log("✅ Servidor encerrado com sucesso");
    process.exit(0);
  });
});

// Keep alive para Replit
setInterval(() => {
  console.log(`⏰ Keep alive - ${new Date().toISOString()}`);
}, 5 * 60 * 1000); // A cada 5 minutos
