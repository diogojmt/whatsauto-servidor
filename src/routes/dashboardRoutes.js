const express = require('express');
const { DashboardController } = require('../controllers/dashboardController');

const router = express.Router();
const dashboardController = new DashboardController();

// Bind do contexto para os métodos
const authenticate = dashboardController.authenticate.bind(dashboardController);

// Rota pública para login
router.post('/login', dashboardController.login.bind(dashboardController));

// Rota para criar primeiro admin (apenas para setup inicial)
router.post('/setup-admin', dashboardController.createAdmin.bind(dashboardController));

// Rotas protegidas
router.use(authenticate);

// Estatísticas gerais
router.get('/stats', dashboardController.getStats.bind(dashboardController));

// Dados para gráficos
router.get('/charts', dashboardController.getChartData.bind(dashboardController));

// Lista de atendimentos
router.get('/atendimentos', dashboardController.getAtendimentos.bind(dashboardController));

// Eventos de usuário específico
router.get('/eventos/:usuarioId', dashboardController.getEventosUsuario.bind(dashboardController));

// Métricas de sistema
router.get('/metricas', dashboardController.getMetricasSistema.bind(dashboardController));

// Exportar relatórios
router.get('/export', dashboardController.exportRelatorio.bind(dashboardController));

module.exports = router;
