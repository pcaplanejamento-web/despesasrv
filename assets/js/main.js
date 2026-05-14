// main.js — inicialização, roteamento entre seções e orquestração dos módulos

import { SECTION_TITLES } from './config.js';
import { api, clearCache } from './api.js';
import { renderKpis } from './kpis.js';
import {
  renderChartMensalBarras,
  renderChartMensalLinha,
  renderChartOrgaos,
  renderChartAcoes,
  renderChartElementos,
  renderChartProgressao,
} from './charts.js';
import {
  initTableOrgaos,    renderTableOrgaos,
  initTableAcoes,     renderTableAcoes,
  initTableElementos, renderTableElementos,
  initTableMensal,    renderTableMensal,
  initTableEmpenho,   renderTableEmpenho,
  initTableGeral,     renderTableGeral,
} from './tables.js';

/* ── Estado global ── */
const appState = {
  activeSection: null,
  loaded: new Set(),
  data: {},
};

/* ── Utils UI ── */
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

function setHeaderUpdate(date = new Date()) {
  const el = document.getElementById('headerUpdate');
  if (!el) return;
  el.textContent = `Atualizado em ${date.toLocaleString('pt-BR')}`;
}

/* ── Navegação entre seções ── */
function navigateTo(section) {
  if (!section || appState.activeSection === section) return;

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));

  document.getElementById(`section-${section}`)?.classList.add('active');
  document.querySelector(`.nav-link[data-section="${section}"]`)?.classList.add('active');

  const titleEl = document.getElementById('headerTitle');
  if (titleEl) titleEl.textContent = SECTION_TITLES[section] ?? section;

  appState.activeSection = section;
  history.pushState({ section }, '', `#${section}`);

  loadSection(section);
  closeSidebar();
}

/* ── Carregamento por seção ── */
async function loadSection(section) {
  if (appState.loaded.has(section)) return;

  try {
    hideError();

    switch (section) {
      case 'painel':    await loadPainel();    break;
      case 'orgaos':    await loadOrgaos();    break;
      case 'acoes':     await loadAcoes();     break;
      case 'elementos': await loadElementos(); break;
      case 'mensal':    await loadMensal();    break;
      case 'brutos':    await loadBrutos();    break;
    }

    appState.loaded.add(section);
    setHeaderUpdate();
  } catch (err) {
    const updateEl = document.getElementById('headerUpdate');
    if (updateEl) updateEl.textContent = 'Erro ao carregar dados';
    showError(`Falha ao buscar dados: ${err.message}. Configure a URL do Apps Script em assets/js/config.js.`);
    console.error('[DespesasPMRV]', err);
  }
}

async function loadPainel() {
  const [kpis, mensal] = await Promise.all([api.kpis(), api.mensal()]);
  appState.data.kpis   = kpis;
  appState.data.mensal = mensal.simples;
  appState.data.mensalAcum = mensal.acumulado;
  appState.data.mensalPct  = mensal.percentual;

  renderKpis(kpis);
  renderChartMensalBarras(mensal.simples);
  renderChartMensalLinha(mensal.acumulado);
}

async function loadOrgaos() {
  const dados = await api.orgaos();
  appState.data.orgaos = dados;
  renderChartOrgaos(dados);
  renderTableOrgaos(dados);
}

async function loadAcoes() {
  const dados = await api.acoes();
  appState.data.acoes = dados;
  renderChartAcoes(dados);
  renderTableAcoes(dados);
}

async function loadElementos() {
  const dados = await api.elementos();
  appState.data.elementos = dados;
  renderChartElementos(dados);
  renderTableElementos(dados);
}

async function loadMensal() {
  if (!appState.data.mensalPct) {
    const resp = await api.mensal();
    appState.data.mensal     = resp.simples;
    appState.data.mensalAcum = resp.acumulado;
    appState.data.mensalPct  = resp.percentual;
  }
  renderChartProgressao(appState.data.mensalPct);
  renderTableMensal(appState.data.mensalPct);
}

async function loadBrutos() {
  const [empenho, geral] = await Promise.all([api.empenho(), api.geral()]);
  renderTableEmpenho(empenho.rows);
  renderTableGeral(geral.rows);
}

/* ── Tabs (Dados Brutos) ── */
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

/* ── Sidebar toggle (mobile) ── */
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
}

function initSidebar() {
  document.getElementById('btnMenu')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  });
}

/* ── Refresh ── */
function initRefresh() {
  document.getElementById('btnRefresh')?.addEventListener('click', () => {
    clearCache();
    appState.loaded.clear();
    appState.data = {};
    loadSection(appState.activeSection);
  });
}

/* ── Toast ── */
function initToast() {
  document.getElementById('toastClose')?.addEventListener('click', hideError);
}

/* ── Roteamento inicial (hash) ── */
function resolveInitialSection() {
  const hash = location.hash.replace('#', '');
  return Object.keys(SECTION_TITLES).includes(hash) ? hash : 'painel';
}

/* ── Bootstrap ── */
function init() {
  initSidebar();
  initTabs();
  initRefresh();
  initToast();

  initTableOrgaos();
  initTableAcoes();
  initTableElementos();
  initTableMensal();
  initTableEmpenho();
  initTableGeral();

  window.addEventListener('popstate', e => {
    const section = e.state?.section ?? resolveInitialSection();
    navigateTo(section);
  });

  const initial = resolveInitialSection();
  navigateTo(initial);
}

document.addEventListener('DOMContentLoaded', init);
