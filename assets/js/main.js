// main.js — inicialização, prefetch e roteamento
// Arquitetura: 2 chamadas HTTP (empenho + geral), toda a computação é client-side

import { SECTION_TITLES, MESES } from './config.js?v=5';
import { api, clearCache } from './api.js?v=5';
import { renderKpis } from './kpis.js?v=5';
import {
  renderChartMensalBarras,
  renderChartMensalLinha,
  renderChartOrgaos,
  renderChartDesmembrado,
  renderChartProgressao,
} from './charts.js?v=5';
import {
  getUnidades,
  filterByUnidade,
  computeKpis,
  computeAgrupado,
  computeMensal,
  computeDiario,
  parseDDMMYYYY,
} from './compute.js?v=5';
import {
  initTableOrgaos,    renderTableOrgaos,
  initTableAcoes,     renderTableAcoes,
  initTableElementos, renderTableElementos,
  initTableMensal,    renderTableMensal,
  initTableEmpenho,   renderTableEmpenho,
  initTableGeral,     renderTableGeral,
  setRowClickHandler,
} from './tables.js?v=5';
import { initDetail, openDetail } from './detail.js?v=5';

/* ── Estado global ── */
const appState = {
  activeSection: null,
  data: {},
  desmembrado: { tipo: 'acoes', chartType: 'bar' },
};

const PAINEL_SUBSECTIONS = new Set(['orgaos', 'acoes', 'elementos', 'mensal']);

/* ── Utilitários de UI ── */
function hideLoadingScreen() {
  document.getElementById('loadingScreen')?.classList.add('hidden');
}

function showError(msg) {
  const toast = document.getElementById('errorToast');
  const msgEl = document.getElementById('errorMessage');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.classList.remove('hidden');
}

function hideError() {
  document.getElementById('errorToast')?.classList.add('hidden');
}

function setHeaderStatus(text) {
  const el = document.getElementById('headerUpdate');
  if (el) el.textContent = text;
}

/* ── Helpers de filtragem para o drawer ── */

/** Retorna as linhas filtradas atualmente visíveis no painel. */
function getCurrent() {
  return {
    emp: appState.data.currentEmpRows ?? [],
    ger: appState.data.currentGerRows ?? [],
  };
}

/**
 * Abre o drawer filtrando por um valor-chave em colunas específicas de emp/ger.
 * Elimina a repetição do mesmo padrão em 5 lugares diferentes.
 */
function openDetailByKey(key, empColIdx, gerColIdx, sub, bannerClass) {
  const { emp, ger } = getCurrent();
  openDetail({
    title: key,
    sub,
    bannerClass,
    empRows: emp.filter(r => String(r[empColIdx] ?? '') === key),
    gerRows: ger.filter(r => String(r[gerColIdx] ?? '') === key),
  });
}

/** Abre o drawer com todos os registros de um determinado dia. */
function openDetailDia(data) {
  const { emp, ger } = getCurrent();
  openDetail({
    title: data,
    sub: 'Detalhes do dia',
    bannerClass: 'section-banner--amber',
    // empenhado pelo dia de empenho
    empRows: emp.filter(r => String(r[6]  ?? '').trim() === data),
    // liquidação pelo dia de liquidação OU dia de pagamento
    gerRows: ger.filter(r =>
      String(r[1]  ?? '').trim() === data ||   // DATA_LIQ
      String(r[10] ?? '').trim() === data      // DATA_PGTO
    ),
  });
}

/** Abre o drawer com todos os registros de um determinado mês. */
function openDetailMes(mes) {
  const { emp, ger } = getCurrent();
  openDetail({
    title: MESES[(mes ?? 1) - 1] ?? `Mês ${mes}`,
    sub: 'Detalhes mensais',
    bannerClass: 'section-banner--amber',
    empRows: emp.filter(r => parseDDMMYYYY(r[6])?.getMonth() + 1 === mes),
    gerRows: ger.filter(r => parseDDMMYYYY(r[1])?.getMonth() + 1 === mes),
  });
}

/* ── Gráfico unificado ── */
function renderDesmembradoChart() {
  const { tipo, chartType } = appState.desmembrado;
  const dados    = tipo === 'acoes' ? appState.data.acoes : appState.data.elementos;
  const keyName  = tipo === 'acoes' ? 'acao' : 'elemento';
  const empIdx   = tipo === 'acoes' ? 13 : 14;
  const gerIdx   = tipo === 'acoes' ? 17 : 18;
  const sub      = tipo === 'acoes' ? 'Por Ação' : 'Por Elemento';
  const banner   = tipo === 'acoes' ? 'section-banner--green' : 'section-banner--purple';
  if (!dados) return;

  renderChartDesmembrado(dados, keyName, chartType, d =>
    openDetailByKey(String(d[keyName] ?? ''), empIdx, gerIdx, sub, banner)
  );
}

/* ── Agrega dados brutos e renderiza tudo no painel ── */
function renderPainelAll(empRows, gerRows) {
  appState.data.currentEmpRows = empRows;
  appState.data.currentGerRows = gerRows;

  const kpis     = computeKpis(empRows, gerRows);
  const mensal   = computeMensal(empRows, gerRows);
  const diario   = computeDiario(empRows, gerRows);
  const orgaos   = computeAgrupado(empRows, gerRows, 1,  2,  'orgao');
  const acoes    = computeAgrupado(empRows, gerRows, 13, 17, 'acao');
  const elementos= computeAgrupado(empRows, gerRows, 14, 18, 'elemento');

  appState.data.acoes    = acoes;
  appState.data.elementos= elementos;

  renderKpis(kpis);

  const onDiarioClick = d => openDetailDia(d.data);
  const onMensalClick = d => openDetailMes(d.mes);
  renderChartMensalBarras(diario.simples,   onDiarioClick);
  renderChartMensalLinha(diario.acumulado,  onDiarioClick);
  renderChartProgressao(mensal.percentual,  onMensalClick);
  renderChartOrgaos(orgaos, d =>
    openDetailByKey(String(d.orgao ?? ''), 1, 2, 'Por Órgão', 'section-banner--blue')
  );
  renderDesmembradoChart();

  renderTableMensal(mensal.percentual);
  renderTableOrgaos(orgaos);
  renderTableAcoes(acoes);
  renderTableElementos(elementos);
}

function populateUnitFilter(empRows, gerRows) {
  const sel = document.getElementById('filterUnidade');
  if (!sel) return;
  getUnidades(empRows, gerRows).forEach(u => {
    const opt = document.createElement('option');
    opt.value = u;
    opt.textContent = u;
    sel.appendChild(opt);
  });
  sel.disabled = false;
}

/* ── Registra handlers de clique nas linhas das tabelas ── */
function setupDetailHandlers() {
  // Tabelas agregadas — o handler apenas extrai a chave (row[0]) e delega
  setRowClickHandler('tableOrgaos', row =>
    openDetailByKey(String(row[0] ?? ''), 1, 2, 'Por Órgão', 'section-banner--blue')
  );
  setRowClickHandler('tableAcoes', row =>
    openDetailByKey(String(row[0] ?? ''), 13, 17, 'Por Ação', 'section-banner--green')
  );
  setRowClickHandler('tableElementos', row =>
    openDetailByKey(String(row[0] ?? ''), 14, 18, 'Por Elemento', 'section-banner--purple')
  );

  // Tabela mensal — row[8] guarda o número do mês (oculto, inserido em tables.js)
  setRowClickHandler('tableMensal', row => {
    const mes = Number(row[8]);
    if (mes >= 1 && mes <= 12) openDetailMes(mes);
  });

  // Tabelas brutas — busca por contrato (row[0]) em todos os dados
  const openDetailContrato = (contrato, sub) => {
    const allEmp = appState.data.empenhoRows ?? [];
    const allGer = appState.data.geralRows   ?? [];
    openDetail({
      title: `Contrato ${contrato}`,
      sub,
      bannerClass: 'section-banner--rose',
      empRows: allEmp.filter(r => String(r[0] ?? '') === contrato),
      gerRows: allGer.filter(r => String(r[0] ?? '') === contrato),
    });
  };

  setRowClickHandler('tableEmpenho', row =>
    openDetailContrato(String(row[0] ?? ''), 'Dados de Empenho')
  );
  setRowClickHandler('tableGeral', row =>
    openDetailContrato(String(row[0] ?? ''), 'Dados de Liquidação / Pagamento')
  );
}

/* ── Prefetch: apenas 2 chamadas HTTP ── */
function startPrefetch() {
  appState.data = {};
  document.querySelectorAll('.section-error').forEach(el => el.remove());
  setHeaderStatus('Carregando…');

  const sel = document.getElementById('filterUnidade');
  if (sel) {
    sel.value = '';
    sel.disabled = true;
    while (sel.options.length > 1) sel.remove(1);
  }

  Promise.all([api.empenho(), api.geral()])
    .then(([empenho, geral]) => {
      appState.data.empenhoRows = empenho.rows;
      appState.data.geralRows   = geral.rows;

      renderTableEmpenho(empenho.rows);
      renderTableGeral(geral.rows);
      populateUnitFilter(empenho.rows, geral.rows);
      renderPainelAll(empenho.rows, geral.rows);

      setHeaderStatus(`Atualizado em ${new Date().toLocaleString('pt-BR')}`);
      hideError();
      hideLoadingScreen();
    })
    .catch(err => {
      console.error('[DespesasPMRV]', err);
      showError(`Erro ao carregar dados: ${err.message}`);
      setHeaderStatus('Erro ao carregar dados');
      hideLoadingScreen();
    });
}

/* ── Navegação entre seções ── */
function navigateTo(section) {
  if (!section) return;
  const parentSection = PAINEL_SUBSECTIONS.has(section) ? 'painel' : section;

  if (parentSection !== appState.activeSection) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${parentSection}`)?.classList.add('active');
    appState.activeSection = parentSection;
  }

  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  document.querySelector(`.nav-link[data-section="${section}"]`)?.classList.add('active');

  const titleEl = document.getElementById('headerTitle');
  if (titleEl) titleEl.textContent = SECTION_TITLES[section] ?? section;

  history.pushState({ section }, '', `#${section}`);

  if (PAINEL_SUBSECTIONS.has(section)) {
    setTimeout(() => {
      document.getElementById(`painel-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  closeSidebar();
}

/* ── Tabs internas (Dados Brutos) ── */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`)?.classList.add('active');
    });
  });
}

/* ── Sidebar toggle ── */
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('menuOverlay')?.classList.remove('open');
}

function initSidebar() {
  document.getElementById('btnMenu')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('menuOverlay')?.classList.toggle('open');
  });
  document.getElementById('menuOverlay')?.addEventListener('click', closeSidebar);
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  });
}

/* ── Filtro de Unidade ── */
function initUnitFilter() {
  document.getElementById('filterUnidade')?.addEventListener('change', e => {
    const unidade = e.target.value;
    if (!appState.data.empenhoRows) return;
    const { empRows, gerRows } = filterByUnidade(
      appState.data.empenhoRows,
      appState.data.geralRows,
      unidade,
    );
    renderPainelAll(empRows, gerRows);
  });
}

/* ── Gráfico unificado (dropdown + toggle barras/pizza) ── */
function initDesmembrado() {
  document.getElementById('desmembradoTipo')?.addEventListener('change', e => {
    appState.desmembrado.tipo = e.target.value;
    renderDesmembradoChart();
  });
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.desmembrado.chartType = btn.dataset.type;
      renderDesmembradoChart();
    });
  });
}

/* ── Refresh ── */
function initRefresh() {
  document.getElementById('btnRefresh')?.addEventListener('click', () => {
    clearCache();
    startPrefetch();
  });
}

/* ── Toast ── */
function initToast() {
  document.getElementById('toastClose')?.addEventListener('click', hideError);
}

/* ── Hash inicial ── */
function resolveInitialSection() {
  const hash = location.hash.replace('#', '');
  return Object.keys(SECTION_TITLES).includes(hash) ? hash : 'painel';
}

/* ── Tema claro / escuro ── */
function initTheme() {
  const saved = localStorage.getItem('pmrv-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const active = saved ?? (prefersDark ? 'dark' : 'light');
  if (active === 'dark') document.documentElement.dataset.theme = 'dark';

  document.getElementById('btnTheme')?.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    if (isDark) {
      delete document.documentElement.dataset.theme;
      localStorage.setItem('pmrv-theme', 'light');
    } else {
      document.documentElement.dataset.theme = 'dark';
      localStorage.setItem('pmrv-theme', 'dark');
    }
    // Re-renderiza gráficos com as novas cores do tema
    const { currentEmpRows, currentGerRows } = appState.data;
    if (currentEmpRows && currentGerRows) {
      renderPainelAll(currentEmpRows, currentGerRows);
    }
  });
}

/* ── Bootstrap ── */
function init() {
  initTheme();
  initSidebar();
  initTabs();
  initDesmembrado();
  initRefresh();
  initToast();
  initUnitFilter();
  initDetail();

  initTableOrgaos();
  initTableAcoes();
  initTableElementos();
  initTableMensal();
  initTableEmpenho();
  initTableGeral();

  setupDetailHandlers();

  window.addEventListener('popstate', e => {
    navigateTo(e.state?.section ?? resolveInitialSection());
  });

  navigateTo(resolveInitialSection());
  startPrefetch();
}

document.addEventListener('DOMContentLoaded', init);
