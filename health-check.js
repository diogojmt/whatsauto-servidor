// Health check para monitoramento do Replit
const http = require('http');

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}/status`;

function healthCheck() {
  console.log('🔍 Verificando saúde da aplicação...');
  
  const req = http.get(URL, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Aplicação está funcionando!');
    } else {
      console.log(`⚠️ Status não OK: ${res.statusCode}`);
    }
  });

  req.on('error', (err) => {
    console.log('❌ Erro na verificação:', err.message);
  });

  req.setTimeout(5000, () => {
    console.log('⏰ Timeout na verificação');
    req.destroy();
  });
}

// Verificar a cada 5 minutos
setInterval(healthCheck, 5 * 60 * 1000);

// Verificação inicial após 30 segundos
setTimeout(healthCheck, 30000);

console.log('🏥 Monitor de saúde iniciado');
