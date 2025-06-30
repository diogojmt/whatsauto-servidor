const express = require("express");
const qs = require("querystring");
const path = require("path");

// Importar módulos refatorados
const { carregarDadosTFLF, carregarDadosISS } = require("./src/utils/dataLoader");
const { processarMensagem } = require("./src/handlers/messageHandler");
const { ehMensagemDoSistema } = require("./src/utils/mediaUtils");

const app = express();

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

// ---------- Função para processar resposta ----------
function processarResposta(req, res, sender, message) {
  // Verificar se é mensagem do sistema para evitar loop
  if (ehMensagemDoSistema(message)) {
    console.log("🔄 Mensagem do sistema detectada - Não respondendo para evitar loop");
    return res.status(200).end();
  }

  const resposta = processarMensagem(message, sender, dadosTFLF, dadosISS, req);
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
app.post("/", (req, res) => {
  // Se JSON falhou, tenta decodificar req.rawBody como urlencoded
  if (!req.body || Object.keys(req.body).length === 0) {
    req.body = qs.parse(req.rawBody);
  }

  const sender = decodeURIComponent(req.body.sender || "Usuário");
  const message = decodeURIComponent(req.body.message || "(sem mensagem)");

  console.log("✅ Interpretado:", { sender, message });

  processarResposta(req, res, sender, message);
});

// ---------- Endpoint POST para integração com WhatsAuto ----------
app.post("/mensagem", (req, res) => {
  const { sender, message } = req.body || qs.parse(req.rawBody);

  // Verificar se é mensagem do sistema para evitar loop
  if (ehMensagemDoSistema(message)) {
    console.log("🔄 Mensagem do sistema detectada - Não respondendo para evitar loop");
    return res.status(200).end();
  }

  const resposta = processarMensagem(message, sender, dadosTFLF, dadosISS);

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
      dadosISS: dadosISS.length 
    });
  } catch (error) {
    console.error("❌ Erro ao recarregar dados:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao recarregar dados",
      error: error.message 
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
    memory: process.memoryUsage()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log(`🔄 Reload: POST http://localhost:${PORT}/reload`);
});
