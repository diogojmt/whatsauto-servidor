/**
 * WhatsAuto Admin Dashboard
 * Responsável por gerenciar a interface administrativa do chatbot
 * @author Copilot
 * @version 2.0.0
 */

class DashboardApp {
  // Configurações iniciais
  static CONFIG = {
    ITEMS_PER_PAGE: 50,
    TOKEN_KEY: "admin_token",
    CHART_COLORS: {
      primary: "#36A2EB",
      success: "#4BC0C0",
      warning: "#FFCE56",
      danger: "#FF6384",
      purple: "#9966FF",
      orange: "#FF9F40",
      gray: "#C9CBCF",
    },
  };

  /**
   * Construtor da aplicação
   */
  constructor() {
    // Estado da aplicação
    this.state = {
      token: localStorage.getItem(DashboardApp.CONFIG.TOKEN_KEY),
      currentPage: 1,
      charts: new Map(),
      apiBase: this.determineApiBase(),
    };

    this.init();
  }

  /**
   * Determina a base da API baseado na porta
   */
  determineApiBase() {
    return "/api/dashboard";
  }

  /**
   * Inicializa a aplicação
   */
  init() {
    this.state.token ? this.showDashboard() : this.showLogin();
    this.setupEventListeners();
  }

  /**
   * Configura os event listeners da aplicação
   */
  setupEventListeners() {
    // Autenticação
    this.setupAuthListeners();

    // Navegação
    this.setupNavigationListeners();

    // Filtros
    this.setupFilterListeners();
  }

  /**
   * Configura listeners relacionados à autenticação
   */
  setupAuthListeners() {
    const loginForm = document.getElementById("loginForm");
    const logoutBtn = document.getElementById("logoutBtn");

    loginForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    logoutBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleLogout();
    });
  }

  /**
   * Configura listeners de navegação
   */
  setupNavigationListeners() {
    document.querySelectorAll("[data-section]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const section = e.target.closest("[data-section]").dataset.section;
        this.showSection(section);
      });
    });
  }

  /**
   * Configura listeners dos filtros
   */
  setupFilterListeners() {
    ["filtroTipo", "filtroStatus"].forEach((filterId) => {
      document.getElementById(filterId)?.addEventListener("change", () => {
        this.state.currentPage = 1;
        this.carregarAtendimentos();
      });
    });
  }

  /**
   * Gerencia o processo de login
   */
  async handleLogin() {
    const credentials = {
      username: document.getElementById("username").value,
      password: document.getElementById("password").value,
    };

    try {
      const response = await this.apiRequest("/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (response?.token) {
        this.state.token = response.token;
        localStorage.setItem(DashboardApp.CONFIG.TOKEN_KEY, response.token);
        this.showDashboard();
      }
    } catch (error) {
      this.showLoginError(error.message || "Erro ao fazer login");
    }
  }

  /**
   * Gerencia o processo de logout
   */
  handleLogout() {
    this.state.token = null;
    localStorage.removeItem(DashboardApp.CONFIG.TOKEN_KEY);
    this.showLogin();
  }

  /**
   * Exibe erro de login
   */
  showLoginError(message) {
    const errorElement = document.getElementById("loginError");
    if (errorElement) {
      errorElement.style.display = "block";
      errorElement.textContent = message;
    }
  }

  /**
   * Alterna para a tela de login
   */
  showLogin() {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("dashboardScreen").style.display = "none";
  }

  /**
   * Alterna para o dashboard
   */
  showDashboard() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("dashboardScreen").style.display = "block";
    this.loadInitialData();
  }

  /**
   * Carrega os dados iniciais do dashboard
   */
  async loadInitialData() {
    await Promise.all([this.loadStats(), this.loadChartData()]);
  }

  /**
   * Exibe uma seção específica do dashboard
   */
  showSection(sectionName) {
    this.updateSectionVisibility(sectionName);
    this.updateNavigationState(sectionName);
    this.loadSectionData(sectionName);
  }

  /**
   * Atualiza a visibilidade das seções
   */
  updateSectionVisibility(sectionName) {
    document.querySelectorAll(".content-section").forEach((section) => {
      section.style.display = "none";
    });
    document.getElementById(sectionName + "Section").style.display = "block";
  }

  /**
   * Atualiza o estado da navegação
   */
  updateNavigationState(sectionName) {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });
    document
      .querySelector(`[data-section="${sectionName}"]`)
      ?.classList.add("active");
  }

  /**
   * Carrega dados específicos da seção
   */
  async loadSectionData(section) {
    const sectionLoaders = {
      overview: async () => {
        await Promise.all([this.loadStats(), this.loadChartData()]);
      },
      analytics: () => this.loadChartData(),
      atendimentos: () => this.carregarAtendimentos(),
      usuarios: () => {
        /* Implementação futura */
      },
      relatorios: () => {
        /* Não requer carregamento */
      },
    };

    await sectionLoaders[section]?.();
  }

  /**
   * Realiza uma requisição à API
   */
  async apiRequest(endpoint, options = {}) {
    const config = {
      headers: {
        Authorization: `Bearer ${this.state.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.state.apiBase}${endpoint}`, config);

      if (response.status === 401) {
        this.handleLogout();
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Erro na requisição:", error);
      throw error;
    }
  }

  /**
   * Carrega as estatísticas do dashboard
   */
  async loadStats() {
    try {
      const stats = await this.apiRequest("/stats");
      if (stats) {
        this.updateDashboardStats(stats);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }

  /**
   * Atualiza as estatísticas no dashboard
   */
  updateDashboardStats(stats) {
    const statElements = {
      atendimentosHoje: stats.atendimentosHoje?.total || 0,
      atendimentosSemana: stats.atendimentosSemana?.total || 0,
      taxaSucesso: `${stats.taxaSucesso?.taxa_sucesso || 0}%`,
      usuariosUnicos: stats.usuariosUnicos?.total || 0,
    };

    Object.entries(statElements).forEach(([id, value]) => {
      document.getElementById(id).textContent = value;
    });
  }

  /**
   * Carrega dados para os gráficos
   */
  async loadChartData() {
    try {
      const chartData = await this.apiRequest("/charts");
      console.log("Dados recebidos da API:", chartData);
      if (chartData) {
        this.createCharts(chartData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados dos gráficos:", error);
    }
  }

  /**
   * Cria ou atualiza os gráficos do dashboard
   */
  createCharts(data) {
    console.log("Criando gráficos com dados:", data);
    const chartCreators = {
      tiposPopulares: () => {
        console.log("Dados para tipos populares:", data.tiposAtendimento);
        this.createTiposPopularesChart(data.tiposAtendimento);
      },
      atendimentosHora: () => {
        console.log(
          "Dados para atendimentos por hora:",
          data.atendimentosPorHora
        );
        this.createAtendimentosHoraChart(data.atendimentosPorHora);
      },
      atendimentosDia: () =>
        this.createAtendimentosDiaChart(data.atendimentosPorDia),
      performance: () => this.createPerformanceChart(data.tiposAtendimento),
      intencoes: () => this.createIntencoesChart(data.intencoes),
    };

    Object.entries(chartCreators).forEach(([key, creator]) => {
      creator();
    });
  }

  /**
   * Cria o gráfico de tipos populares
   */
  createTiposPopularesChart(data) {
    this.createChart("tiposPopularesChart", {
      type: "pie",
      data: {
        labels: data.map((item) => item.tipo_atendimento),
        datasets: [
          {
            data: data.map((item) => item.total),
            backgroundColor: Object.values(DashboardApp.CONFIG.CHART_COLORS),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  }

  /**
   * Cria o gráfico de atendimentos por hora
   */
  createAtendimentosHoraChart(data) {
    const horasCompletas = this.generateHourlyData(data);

    this.createChart("atendimentosHoraChart", {
      type: "bar",
      data: {
        labels: horasCompletas.map((item) => `${item.hora}:00`),
        datasets: [
          {
            label: "Atendimentos",
            data: horasCompletas.map((item) => item.total),
            backgroundColor: DashboardApp.CONFIG.CHART_COLORS.primary,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  /**
   * Gera dados horários completos
   */
  generateHourlyData(data) {
    return Array.from({ length: 24 }, (_, i) => ({
      hora: i,
      total: data.find((d) => d.hora === i)?.total || 0,
    }));
  }

  /**
   * Cria o gráfico de atendimentos por dia
   */
  createAtendimentosDiaChart(data) {
    this.createChart("atendimentosDiaChart", {
      type: "line",
      data: {
        labels: data.map((item) =>
          new Date(item.data).toLocaleDateString("pt-BR")
        ),
        datasets: [
          {
            label: "Total de Atendimentos",
            data: data.map((item) => item.total),
            borderColor: DashboardApp.CONFIG.CHART_COLORS.primary,
            fill: false,
          },
          {
            label: "Atendimentos com Sucesso",
            data: data.map((item) => item.sucessos),
            borderColor: DashboardApp.CONFIG.CHART_COLORS.success,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  /**
   * Cria o gráfico de performance
   */
  createPerformanceChart(data) {
    this.createChart("performanceChart", {
      type: "bar",
      data: {
        labels: data.map((item) => item.tipo_atendimento),
        datasets: [
          {
            label: "Taxa de Sucesso (%)",
            data: data.map((item) => this.calculateSuccessRate(item)),
            backgroundColor: DashboardApp.CONFIG.CHART_COLORS.success,
          },
          {
            label: "Tempo Médio (s)",
            data: data.map((item) => item.tempo_medio || 0),
            backgroundColor: DashboardApp.CONFIG.CHART_COLORS.orange,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            position: "left",
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            beginAtZero: true,
          },
        },
      },
    });
  }

  /**
   * Calcula a taxa de sucesso
   */
  calculateSuccessRate(item) {
    return item.total > 0 ? ((item.sucessos / item.total) * 100).toFixed(1) : 0;
  }

  /**
   * Cria o gráfico de intenções
   */
  createIntencoesChart(data) {
    this.createChart("intencoesChart", {
      type: "doughnut",
      data: {
        labels: data.map((item) => item.intencao_detectada),
        datasets: [
          {
            data: data.map((item) => item.total),
            backgroundColor: Object.values(DashboardApp.CONFIG.CHART_COLORS),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  }

  /**
   * Função utilitária para criar/atualizar gráficos
   */
  createChart(canvasId, config) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.state.charts.has(canvasId)) {
      this.state.charts.get(canvasId).destroy();
    }

    this.state.charts.set(canvasId, new Chart(ctx, config));
  }

  /**
   * Carrega a lista de atendimentos
   */
  async carregarAtendimentos() {
    try {
      const params = this.buildAtendimentosParams();
      const data = await this.apiRequest(`/atendimentos?${params}`);

      if (data) {
        this.renderAtendimentos(data.atendimentos);
        this.renderPagination(data.pagination);
      }
    } catch (error) {
      console.error("Erro ao carregar atendimentos:", error);
    }
  }

  /**
   * Constrói os parâmetros para a busca de atendimentos
   */
  buildAtendimentosParams() {
    const params = new URLSearchParams({
      page: this.state.currentPage,
      limit: DashboardApp.CONFIG.ITEMS_PER_PAGE,
    });

    const filters = {
      tipo: document.getElementById("filtroTipo")?.value,
      status: document.getElementById("filtroStatus")?.value,
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    return params;
  }

  /**
   * Renderiza a tabela de atendimentos
   */
  renderAtendimentos(atendimentos) {
    const tbody = document.getElementById("atendimentosTableBody");
    if (!tbody) return;

    tbody.innerHTML = atendimentos.length
      ? this.generateAtendimentosRows(atendimentos)
      : this.generateEmptyTableRow();
  }

  /**
   * Gera as linhas da tabela de atendimentos
   */
  generateAtendimentosRows(atendimentos) {
    return atendimentos
      .map(
        (atendimento) => `
            <tr>
                <td>${atendimento.id}</td>
                <td>${atendimento.usuario_id}</td>
                <td>${atendimento.tipo_atendimento}</td>
                <td><span class="status-badge status-${atendimento.status}">${
          atendimento.status
        }</span></td>
                <td>${new Date(atendimento.inicio_timestamp).toLocaleString(
                  "pt-BR"
                )}</td>
                <td>${this.formatDuracao(atendimento.duracao_segundos)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.verDetalhesAtendimento(${
                      atendimento.id
                    })">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  /**
   * Gera linha para tabela vazia
   */
  generateEmptyTableRow() {
    return '<tr><td colspan="7" class="text-center">Nenhum atendimento encontrado</td></tr>';
  }

  /**
   * Formata a duração do atendimento
   */
  formatDuracao(segundos) {
    return segundos ? `${segundos}s` : "-";
  }

  /**
   * Renderiza a paginação
   */
  renderPagination(pagination) {
    const { nav, list } = this.getPaginationElements();
    if (!nav || !list) return;

    if (pagination.pages <= 1) {
      nav.style.display = "none";
      return;
    }

    nav.style.display = "block";
    list.innerHTML = this.generatePaginationHTML(pagination);
  }

  /**
   * Obtém os elementos de paginação
   */
  getPaginationElements() {
    return {
      nav: document.getElementById("paginationNav"),
      list: document.getElementById("paginationList"),
    };
  }

  /**
   * Gera o HTML da paginação
   */
  generatePaginationHTML(pagination) {
    const { page, pages } = pagination;
    let html = "";

    // Botão "Anterior"
    if (page > 1) {
      html += this.createPaginationButton(page - 1, "Anterior");
    }

    // Números das páginas
    for (let i = 1; i <= pages; i++) {
      html += this.createPaginationItem(i, page === i);
    }

    // Botão "Próximo"
    if (page < pages) {
      html += this.createPaginationButton(page + 1, "Próximo");
    }

    return html;
  }

  /**
   * Cria um botão de paginação
   */
  createPaginationButton(page, text) {
    return `
            <li class="page-item">
                <a class="page-link" href="#" onclick="dashboard.changePage(${page})">${text}</a>
            </li>
        `;
  }

  /**
   * Cria um item de paginação
   */
  createPaginationItem(page, isActive) {
    return isActive
      ? `<li class="page-item active"><span class="page-link">${page}</span></li>`
      : `<li class="page-item"><a class="page-link" href="#" onclick="dashboard.changePage(${page})">${page}</a></li>`;
  }

  /**
   * Muda a página atual
   */
  changePage(page) {
    this.state.currentPage = page;
    this.carregarAtendimentos();
  }

  /**
   * Exibe detalhes do atendimento
   */
  verDetalhesAtendimento(id) {
    alert(`Detalhes do atendimento ${id} - Em desenvolvimento`);
  }

  /**
   * Exporta relatório
   */
  async exportarRelatorio(tipo) {
    try {
      const response = await fetch(
        `${this.state.apiBase}/export?tipo=${tipo}`,
        {
          headers: {
            Authorization: `Bearer ${this.state.token}`,
          },
        }
      );

      if (response.ok) {
        await this.downloadRelatorio(response, tipo);
      } else {
        alert("Erro ao exportar relatório");
      }
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      alert("Erro ao exportar relatório");
    }
  }

  /**
   * Realiza o download do relatório
   */
  async downloadRelatorio(response, tipo) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `relatorio_${tipo}_${
      new Date().toISOString().split("T")[0]
    }.json`;

    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Inicializar dashboard
const dashboard = new DashboardApp();

// Funções globais para callbacks
window.carregarAtendimentos = () => dashboard.carregarAtendimentos();
window.exportarRelatorio = (tipo) => dashboard.exportarRelatorio(tipo);
