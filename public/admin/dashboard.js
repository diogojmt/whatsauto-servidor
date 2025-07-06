// Dashboard JavaScript
class DashboardApp {
    constructor() {
        this.token = localStorage.getItem('admin_token');
        this.apiBase = window.location.port === '3001' ? '/api/dashboard' : '/api/dashboard';
        this.charts = {};
        this.currentPage = 1;
        this.itemsPerPage = 50;
        
        this.init();
    }

    init() {
        if (this.token) {
            this.showDashboard();
        } else {
            this.showLogin();
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('[data-section]').dataset.section;
                this.showSection(section);
            });
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Filtros
        document.getElementById('filtroTipo')?.addEventListener('change', () => {
            this.currentPage = 1;
            this.carregarAtendimentos();
        });

        document.getElementById('filtroStatus')?.addEventListener('change', () => {
            this.currentPage = 1;
            this.carregarAtendimentos();
        });
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('admin_token', this.token);
                this.showDashboard();
            } else {
                document.getElementById('loginError').style.display = 'block';
                document.getElementById('loginError').textContent = data.error || 'Erro ao fazer login';
            }
        } catch (error) {
            console.error('Erro no login:', error);
            document.getElementById('loginError').style.display = 'block';
            document.getElementById('loginError').textContent = 'Erro de conexão';
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('admin_token');
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboardScreen').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'block';
        this.loadInitialData();
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected section
        document.getElementById(sectionName + 'Section').style.display = 'block';
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        // Load section data
        this.loadSectionData(sectionName);
    }

    async loadInitialData() {
        await this.loadStats();
        await this.loadChartData();
    }

    async loadSectionData(section) {
        switch (section) {
            case 'overview':
                await this.loadStats();
                await this.loadChartData();
                break;
            case 'analytics':
                await this.loadChartData();
                break;
            case 'atendimentos':
                await this.carregarAtendimentos();
                break;
            case 'usuarios':
                // Implementar análise de usuários
                break;
            case 'relatorios':
                // Seção de relatórios não precisa carregar dados
                break;
        }
    }

    async apiRequest(endpoint, options = {}) {
        const config = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        const response = await fetch(`${this.apiBase}${endpoint}`, config);
        
        if (response.status === 401) {
            this.logout();
            return null;
        }
        
        return response.json();
    }

    async loadStats() {
        try {
            const stats = await this.apiRequest('/stats');
            if (stats) {
                document.getElementById('atendimentosHoje').textContent = stats.atendimentosHoje?.total || 0;
                document.getElementById('atendimentosSemana').textContent = stats.atendimentosSemana?.total || 0;
                document.getElementById('taxaSucesso').textContent = stats.taxaSucesso?.taxa_sucesso ? `${stats.taxaSucesso.taxa_sucesso}%` : '0%';
                document.getElementById('usuariosUnicos').textContent = stats.usuariosUnicos?.total || 0;
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    async loadChartData() {
        try {
            const chartData = await this.apiRequest('/charts');
            if (chartData) {
                this.createCharts(chartData);
            }
        } catch (error) {
            console.error('Erro ao carregar dados dos gráficos:', error);
        }
    }

    createCharts(data) {
        // Tipos populares
        if (data.tiposAtendimento) {
            this.createTiposPopularesChart(data.tiposAtendimento);
        }

        // Atendimentos por hora
        if (data.atendimentosPorHora) {
            this.createAtendimentosHoraChart(data.atendimentosPorHora);
        }

        // Atendimentos por dia
        if (data.atendimentosPorDia) {
            this.createAtendimentosDiaChart(data.atendimentosPorDia);
        }

        // Performance
        if (data.tiposAtendimento) {
            this.createPerformanceChart(data.tiposAtendimento);
        }

        // Intenções
        if (data.intencoes) {
            this.createIntencoesChart(data.intencoes);
        }
    }

    createTiposPopularesChart(data) {
        const ctx = document.getElementById('tiposPopularesChart');
        if (!ctx) return;

        if (this.charts.tiposPopulares) {
            this.charts.tiposPopulares.destroy();
        }

        this.charts.tiposPopulares = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.tipo_atendimento),
                datasets: [{
                    data: data.map(item => item.total),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createAtendimentosHoraChart(data) {
        const ctx = document.getElementById('atendimentosHoraChart');
        if (!ctx) return;

        if (this.charts.atendimentosHora) {
            this.charts.atendimentosHora.destroy();
        }

        // Preencher todas as horas do dia
        const horasCompletas = Array.from({length: 24}, (_, i) => {
            const item = data.find(d => d.hora === i);
            return {
                hora: i,
                total: item ? item.total : 0
            };
        });

        this.charts.atendimentosHora = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: horasCompletas.map(item => `${item.hora}:00`),
                datasets: [{
                    label: 'Atendimentos',
                    data: horasCompletas.map(item => item.total),
                    backgroundColor: '#36A2EB'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createAtendimentosDiaChart(data) {
        const ctx = document.getElementById('atendimentosDiaChart');
        if (!ctx) return;

        if (this.charts.atendimentosDia) {
            this.charts.atendimentosDia.destroy();
        }

        this.charts.atendimentosDia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => new Date(item.data).toLocaleDateString('pt-BR')),
                datasets: [{
                    label: 'Total de Atendimentos',
                    data: data.map(item => item.total),
                    borderColor: '#36A2EB',
                    fill: false
                }, {
                    label: 'Atendimentos com Sucesso',
                    data: data.map(item => item.sucessos),
                    borderColor: '#4BC0C0',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createPerformanceChart(data) {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        if (this.charts.performance) {
            this.charts.performance.destroy();
        }

        this.charts.performance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.tipo_atendimento),
                datasets: [{
                    label: 'Taxa de Sucesso (%)',
                    data: data.map(item => item.total > 0 ? (item.sucessos / item.total * 100).toFixed(1) : 0),
                    backgroundColor: '#4BC0C0'
                }, {
                    label: 'Tempo Médio (s)',
                    data: data.map(item => item.tempo_medio || 0),
                    backgroundColor: '#FF9F40',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left'
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createIntencoesChart(data) {
        const ctx = document.getElementById('intencoesChart');
        if (!ctx) return;

        if (this.charts.intencoes) {
            this.charts.intencoes.destroy();
        }

        this.charts.intencoes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.intencao_detectada),
                datasets: [{
                    data: data.map(item => item.total),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    async carregarAtendimentos() {
        try {
            const tipo = document.getElementById('filtroTipo')?.value || '';
            const status = document.getElementById('filtroStatus')?.value || '';
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage
            });
            
            if (tipo) params.append('tipo', tipo);
            if (status) params.append('status', status);
            
            const data = await this.apiRequest(`/atendimentos?${params}`);
            
            if (data) {
                this.renderAtendimentos(data.atendimentos);
                this.renderPagination(data.pagination);
            }
        } catch (error) {
            console.error('Erro ao carregar atendimentos:', error);
        }
    }

    renderAtendimentos(atendimentos) {
        const tbody = document.getElementById('atendimentosTableBody');
        if (!tbody) return;

        if (atendimentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum atendimento encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = atendimentos.map(atendimento => `
            <tr>
                <td>${atendimento.id}</td>
                <td>${atendimento.usuario_id}</td>
                <td>${atendimento.tipo_atendimento}</td>
                <td><span class="status-badge status-${atendimento.status}">${atendimento.status}</span></td>
                <td>${new Date(atendimento.inicio_timestamp).toLocaleString('pt-BR')}</td>
                <td>${atendimento.duracao_segundos ? `${atendimento.duracao_segundos}s` : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.verDetalhesAtendimento(${atendimento.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderPagination(pagination) {
        const nav = document.getElementById('paginationNav');
        const list = document.getElementById('paginationList');
        
        if (!nav || !list) return;

        if (pagination.pages <= 1) {
            nav.style.display = 'none';
            return;
        }

        nav.style.display = 'block';
        
        let paginationHTML = '';
        
        // Previous
        if (pagination.page > 1) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="dashboard.changePage(${pagination.page - 1})">Anterior</a>
                </li>
            `;
        }
        
        // Pages
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page) {
                paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="dashboard.changePage(${i})">${i}</a></li>`;
            }
        }
        
        // Next
        if (pagination.page < pagination.pages) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="dashboard.changePage(${pagination.page + 1})">Próximo</a>
                </li>
            `;
        }
        
        list.innerHTML = paginationHTML;
    }

    changePage(page) {
        this.currentPage = page;
        this.carregarAtendimentos();
    }

    verDetalhesAtendimento(id) {
        // Implementar modal de detalhes
        alert(`Detalhes do atendimento ${id} - Em desenvolvimento`);
    }

    async exportarRelatorio(tipo) {
        try {
            const response = await fetch(`${this.apiBase}/export?tipo=${tipo}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Erro ao exportar relatório');
            }
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            alert('Erro ao exportar relatório');
        }
    }
}

// Inicializar dashboard
const dashboard = new DashboardApp();

// Funções globais para callbacks
window.carregarAtendimentos = () => dashboard.carregarAtendimentos();
window.exportarRelatorio = (tipo) => dashboard.exportarRelatorio(tipo);
