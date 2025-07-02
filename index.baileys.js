const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
// Importe seu handler principal normalmente!
const { processarMensagem } = require("./src/handlers/messageHandler");
const {
  carregarDadosTFLF,
  carregarDadosISS,
} = require("./src/utils/dataLoader");

// Carregue dados na inicialização (igual ao Express)
let dadosTFLF = carregarDadosTFLF();
let dadosISS = carregarDadosISS();

async function startBot() {
  // Persistência de autenticação (mantém login em arquivo)
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  // Cria conexão com WhatsApp Web
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Mostra QR code no terminal na primeira vez
  });

  // Evento para receber mensagens
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg.message) return;

    const sender = msg.key.remoteJid;
    const texto =
      msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (texto) {
      console.log(`📩 Mensagem de ${sender}: ${texto}`);

      // Use seu handler igual ao Express!
      const resposta = await processarMensagem(
        texto,
        sender,
        dadosTFLF,
        dadosISS
      );

      // Responde igual ao Express (texto ou mídia)
      if (typeof resposta === "object" && resposta.type === "media") {
        await sock.sendMessage(sender, {
          image: { url: resposta.media },
          caption: resposta.text,
        });
      } else {
        await sock.sendMessage(sender, { text: resposta });
      }
    }
  });

  // Atualiza credenciais quando necessário
  sock.ev.on("creds.update", saveCreds);

  // Reconnect & log
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log("Desconectou, tentando reconectar...");
        startBot();
      } else {
        console.log("Sessão encerrada.");
      }
    } else if (connection === "open") {
      console.log("✅ BOT Online!");
    }
  });
}

startBot();
