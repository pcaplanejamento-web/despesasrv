// main.js — inicialização, prefetch paralelo de todos os dados e roteamento entre seções

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
  data:     {},
  loaded:   new Set(), // seções com dados prontos
  rendered: new Set(), // seções com gráficos renderizados no canvas
};

// Grupos de carga (um grupo = uma ou mais chamadas de API correlacionadas)
const LOAD_GROUPS = ['painel', 'orgaos', 'acoes', 'elementos', 'brutos'];
let completedCount = 0;

/* ── Utilitários de UI ── */
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

/* ── Progresso de carregamento ── */
function onGroupComplete() {
  completedCount++;
  const success = LOAD_GROUPS.filter(g => appState.loaded.has(g)).length;
  const total   = LOAD_GROUPS.length;
  if (completedCount >= total) {
    if (success === total) {
      setHeaderStatus(`Atualizado em ${new Date().toLocaleString('pt-BR')}`);
      hideError();
    } else {
      setHeaderStatus(`Parcialmente atualizado — ${success} de ${total} seções`);
    }
  } else {
    setHeaderStatus(`Carregando… ${success} de ${total}`);
  }
}

function onGroupError(err, groupName) {
  console.error('[DespesasPMRV]', groupName, err);
  if (groupName === 'painel') {
    showError(`Erro ao carregar dados: ${err.message}`);
    setHeaderStatus('Erro ao carregar dados');
  } else {
    showSectionError(groupName, err.message);
  }
  onGroupComplete();
}

function showSectionError(groupName, msg) {
  const el = document.getElementById(`section-${groupName}`);
  if (!el || el.querySelector('.section-error')) return;
  const div = document.createElement('div');
  div.className = 'section-error';
  div.textContent = `Não foi possível carregar os dados desta seção: ${msg}`;
  el.prepend(div);
}

/* ── Renderização de gráficos (canvas precisa estar visível) ── */
function renderCharts(section) {
  if (appState.rendered.has(section)) return;
  switch (section) {
    case 'painel':
      renderChartMensalBarras(appState.data.mensal ?? []);
      renderChartMensalLinha(appState.data.mensalAcum ?? []);
      break;
    case 'orgaos':
      if (appState.data.orgaos) renderChartOrgaos(appState.data.orgaos);
      break;
    case 'acoes':
      if (appState.data.acoes) renderChartAcoes(appState.data.acoes);
      break;
    case 'elementos':
      if (appState.data.elementos) renderChartElementos(appState.data.elementos);
      break;
    case 'mensal':
      if (appState.data.mensalPct) renderChartProgressao(appState.data.mensalPct);
      break;
  }
  appState.rendered.add(section);
}

/* ── Prefetch paralelo — dispara tudo ao entrar na página ── */
function startPrefetch() {
  completedCount = 0;
  appState.loaded.clear();
  appState.rendered.clear();
  appState.data = {};
  document.querySelectorAll('.section-error').forEach(el => el.remove());
  setHeaderStatus('Carregando…');

  // Grupo 1: KPIs + Mensal (compartilham a chamada api.mensal)
  Promise.all([api.kpis(), api.mensal()])
    .then(([kpis, mensalData]) => {
      appState.data.kpis       = kpis;
      appState.data.mensal     = mensalData.simples;
      appState.data.mensalAcum = mensalData.acumulado;
      appState.data.mensalPct  = mensalData.percentual;
      appState.loaded.add('painel');
      appState.loaded.add('mensal');
      renderKpis(kpis);
      renderTableMensal(mensalData.percentual);
      if (appState.activeSection === 'painel') renderCharts('painel');
      if (appState.activeSection === 'mensal') renderCharts('mensal');
      onGroupComplete();
    })
    .catch(err => onGroupError(err, 'painel'));

  // Grupo 2: Por Órgão
  api.orgaos()
    .then(dados => {
      appState.data.orgaos = dados;
      appState.loaded.add('orgaos');
      renderTableOrgaos(dados);
      if (appState.activeSection === 'orgaos') renderCharts('orgaos');
      onGroupComplete();
    })
    .catch(err => onGroupError(err, 'orgaos'));

  // Grupo 3: Por Ação
  api.acoes()
    .then(dados => {
      appState.data.acoes = dados;
      appState.loaded.add('acoes');
      renderTableAcoes(dados);
      if (appState.activeSection === 'acoes') renderCharts('acoes');
      onGroupComplete();
    })
    .catch(err => onGroupError(err, 'acoes'));

  // Grupo 4: Por Elemento
  api.elementos()
    .then(dados => {
      appState.data.elementos = dados;
      appState.loaded.add('elementos');
      renderTableElementos(dados);
      if (appState.activeSection === 'elementos') renderCharts('elementos');
      onGroupComplete();
    })
    .catch(err => onGroupError(err, 'elementos'));

  // Grupo 5: Dados Brutos (empenho + geral)
  Promise.all([api.empenho(), api.geral()])
    .then(([empenho, geral]) => {
      appState.data.empenhoRows = empenho.rows;
      appState.data.geralRows   = geral.rows;
      appState.loaded.add('brutos');
      renderTableEmpenho(empenho.rows);
      renderTableGeral(geral.rows);
      onGroupComplete();
    })
    .catch(err => onGroupError(err, 'brutos'));
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

  // Dados já prontos: renderizar gráficos (canvas precisa estar visível)
  if (appState.loaded.has(section)) renderCharts(section);

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
    navigateTo(e.state?.section ?? resolveInitialSection());
  });

  navigateTo(resolveInitialSection());
  startPrefetch(); // dispara todos os fetches em paralelo imediatamente
}

document.addEventListener('DOMContentLoaded', init);
