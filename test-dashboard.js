const express = require('express');
const path = require('path');

const app = express();

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Rota de teste
app.post('/api/dashboard/login', (req, res) => {
  console.log('🔐 Login request body:', req.body);
  console.log('🔐 Login headers:', req.headers);
  
  const { username, password } = req.body || {};
  
  if (username === 'admin' && password === 'admin123') {
    res.json({
      token: 'fake_token_{"id":1,"username":"admin"}',
      user: { id: 1, username: 'admin', email: 'admin@test.com' }
    });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// Stats de teste
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    atendimentosHoje: { total: 25 },
    atendimentosSemana: { total: 156 },
    taxaSucesso: { taxa_sucesso: 87.5 },
    usuariosUnicos: { total: 89 }
  });
});

// Charts de teste
app.get('/api/dashboard/charts', (req, res) => {
  res.json({
    atendimentosPorDia: [
      { data: '2025-01-01', total: 12, sucessos: 10 },
      { data: '2025-01-02', total: 18, sucessos: 16 },
      { data: '2025-01-03', total: 25, sucessos: 22 }
    ],
    atendimentosPorHora: [
      { hora: 8, total: 5 },
      { hora: 9, total: 12 },
      { hora: 10, total: 18 },
      { hora: 14, total: 20 }
    ],
    tiposAtendimento: [
      { tipo_atendimento: 'debitos', total: 45, sucessos: 42, tempo_medio: 35 },
      { tipo_atendimento: 'certidoes', total: 32, sucessos: 30, tempo_medio: 55 }
    ],
    intencoes: [
      { intencao_detectada: 'DEBITOS', total: 45 },
      { intencao_detectada: 'CERTIDOES', total: 32 }
    ]
  });
});

// Atendimentos de teste
app.get('/api/dashboard/atendimentos', (req, res) => {
  res.json({
    atendimentos: [
      {
        id: 1,
        usuario_id: '5511999887766',
        tipo_atendimento: 'debitos',
        status: 'finalizado',
        inicio_timestamp: new Date().toISOString(),
        duracao_segundos: 45
      }
    ],
    pagination: { page: 1, limit: 50, total: 1, pages: 1 }
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'Dashboard de teste funcionando!' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Dashboard de teste rodando em http://localhost:${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}/admin`);
  console.log(`🔐 Login: admin / admin123`);
});
