// Desabilitar link preview para evitar erro link-preview-js
require('./disable-link-preview');

const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal"); // <– Adiciona o pacote de QR code
const { processarMensagemComMetricas } = require("./src/handlers/messageHandlerWithMetrics");
const {
  carregarDadosTFLF,
  carregarDadosISS,
} = require("./src/utils/dataLoader");
const { MetricsCollector } = require("./src/services/metricsCollector");
const { globalMetrics } = require("./src/utils/globalMetrics");

// Carregue dados na inicialização (igual ao Express)
let dadosTFLF = carregarDadosTFLF();
let dadosISS = carregarDadosISS();

// Inicializar collector de métricas
let metricsCollector = null;

async function inicializarMetricas() {
  try {
    metricsCollector = new MetricsCollector();
    await metricsCollector.init();
    globalMetrics.setCollector(metricsCollector);
    console.log("✅ Collector de métricas inicializado no Baileys!");
  } catch (error) {
    console.error("❌ Erro ao inicializar metrics collector:", error);
    console.log("⚠️ Continuando sem coleta de métricas...");
  }
}

async function startBot() {
  // Inicializar métricas primeiro
  await inicializarMetricas();
  
  // Persistência de autenticação (mantém login em arquivo)
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  // Cria conexão com WhatsApp Web
  const sock = makeWASocket({ auth: state }); // REMOVA printQRInTerminal

  // Evento para exibir o QR code no terminal
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log("📱 Escaneie o QR code acima com o WhatsApp!");
      
      // Registrar evento de QR code gerado
      if (metricsCollector) {
        await metricsCollector.registrarMetricaSistema(
          'baileys', 
          'qr_code_gerado', 
          1, 
          { timestamp: new Date().toISOString() }
        );
      }
    }
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      
      // Registrar desconexão
      if (metricsCollector) {
        await metricsCollector.registrarMetricaSistema(
          'baileys', 
          'desconexao', 
          1, 
          { reason, timestamp: new Date().toISOString() }
        );
      }
      
      if (reason !== DisconnectReason.loggedOut) {
        console.log("Desconectou, tentando reconectar...");
        startBot();
      } else {
        console.log("Sessão encerrada.");
      }
    } else if (connection === "open") {
      console.log("✅ BOT Online!");
      
      // Registrar conexão bem-sucedida
      if (metricsCollector) {
        await metricsCollector.registrarMetricaSistema(
          'baileys', 
          'conexao_estabelecida', 
          1, 
          { timestamp: new Date().toISOString() }
        );
      }
    }
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

      // Extrair nome do usuário se disponível
      const nomeUsuario = msg.pushName || msg.verifiedBizName || "Cidadão";

      // Use handler com métricas!
      const resposta = await processarMensagemComMetricas(
        texto,
        sender,
        dadosTFLF,
        dadosISS,
        null, // req não disponível no Baileys
        nomeUsuario,
        metricsCollector
      );

      // Responde igual ao Express (texto ou mídia)
      try {
        if (typeof resposta === "object" && resposta.type === "media") {
          await sock.sendMessage(sender, {
            image: { url: resposta.media },
            caption: resposta.text,
          });
          
          // Registrar envio de mídia
          if (metricsCollector) {
            await metricsCollector.registrarMetricaSistema(
              'baileys', 
              'mensagem_midia_enviada', 
              1, 
              { sender, tipo: 'image' }
            );
          }
        } else {
          // Garantir que sempre temos uma string válida
          const textoParaEnviar = typeof resposta === 'string' && resposta.trim() 
            ? resposta 
            : "⚠️ Ocorreu um erro ao processar sua solicitação. Digite *menu* para voltar ao menu principal.";
          
          await sock.sendMessage(sender, { text: textoParaEnviar });
          
          // Registrar envio de texto
          if (metricsCollector) {
            await metricsCollector.registrarMetricaSistema(
              'baileys', 
              'mensagem_texto_enviada', 
              1, 
              { sender, caracteres: textoParaEnviar.length }
            );
          }
        }
      } catch (error) {
        console.error('[ERRO ENVIO MENSAGEM]', error);
        
        // Registrar erro de envio
        if (metricsCollector) {
          await metricsCollector.registrarMetricaSistema(
            'baileys', 
            'erro_envio_mensagem', 
            1, 
            { sender, erro: error.message }
          );
        }
        
        try {
          await sock.sendMessage(sender, { 
            text: "⚠️ Ocorreu um erro ao processar sua solicitação. Digite *menu* para voltar ao menu principal." 
          });
        } catch (fallbackError) {
          console.error('[ERRO ENVIO MENSAGEM FALLBACK]', fallbackError);
          
          // Registrar erro crítico
          if (metricsCollector) {
            await metricsCollector.registrarMetricaSistema(
              'baileys', 
              'erro_critico_envio', 
              1, 
              { sender, erro: fallbackError.message }
            );
          }
        }
      }
    }
  });

  // Atualiza credenciais quando necessário
  sock.ev.on("creds.update", saveCreds);
}

startBot();
