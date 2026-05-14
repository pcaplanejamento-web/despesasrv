// tables.js — renderização de tabelas com paginação, busca, ordenação e exportação CSV

import { formatCurrency, formatDate, formatPercent, PAGE_SIZE, MESES } from './config.js';

// Estado por tabela
const state = {};

function getState(id) {
  if (!state[id]) {
    state[id] = { rows: [], filtered: [], page: 1, sortCol: null, sortDir: 1 };
  }
  return state[id];
}

/* ── Inicialização genérica ── */
function initTable({ id, tbodyId, paginationId, searchId, cols, exportBtn }) {
  const th = document.getElementById(id)?.querySelectorAll('th.sortable') ?? [];
  th.forEach((cell, idx) => {
    cell.addEventListener('click', () => {
      const s = getState(id);
      s.sortDir = s.sortCol === idx ? -s.sortDir : 1;
      s.sortCol = idx;
      s.page = 1;
      sortAndRender(id, tbodyId, paginationId, cols);
    });
  });

  if (searchId) {
    document.getElementById(searchId)?.addEventListener('input', e => {
      const s = getState(id);
      const q = e.target.value.toLowerCase();
      s.filtered = s.rows.filter(r => r.some(c => String(c).toLowerCase().includes(q)));
      s.page = 1;
      renderPage(id, tbodyId, paginationId, cols);
    });
  }

  if (exportBtn) {
    document.querySelector(`[data-table="${exportBtn}"]`)?.addEventListener('click', () => {
      exportCsv(id, cols);
    });
  }
}

function sortAndRender(id, tbodyId, paginationId, cols) {
  const s = getState(id);
  const colIdx = s.sortCol;

  const header = document.getElementById(id)?.querySelectorAll('th.sortable') ?? [];
  header.forEach((th, i) => {
    th.classList.toggle('sort-asc',  i === colIdx && s.sortDir === 1);
    th.classList.toggle('sort-desc', i === colIdx && s.sortDir === -1);
  });

  if (colIdx !== null) {
    s.filtered = [...s.filtered].sort((a, b) => {
      const va = a[colIdx];
      const vb = b[colIdx];
      const numA = Number(va);
      const numB = Number(vb);
      if (!isNaN(numA) && !isNaN(numB)) return (numA - numB) * s.sortDir;
      return String(va).localeCompare(String(vb)) * s.sortDir;
    });
  }

  renderPage(id, tbodyId, paginationId, cols);
}

function renderPage(id, tbodyId, paginationId, cols) {
  const s = getState(id);
  const tbody = document.getElementById(tbodyId);
  const pag = document.getElementById(paginationId);
  if (!tbody) return;

  const total = s.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  s.page = Math.min(s.page, totalPages);

  const start = (s.page - 1) * PAGE_SIZE;
  const slice = s.filtered.slice(start, start + PAGE_SIZE);

  if (slice.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols.length}">Nenhum registro encontrado.</td></tr>`;
  } else {
    tbody.innerHTML = slice.map(row => buildRow(row, cols)).join('');
  }

  if (pag) renderPagination(pag, s.page, totalPages, total, id, tbodyId, paginationId, cols);
}

function buildRow(row, cols) {
  const cells = cols.map((col, i) => {
    const val = row[i] ?? '';
    const formatted = col.format ? col.format(val) : val;
    const cls = col.num ? ' class="num"' : '';
    return `<td${cls}>${formatted}</td>`;
  });
  return `<tr>${cells.join('')}</tr>`;
}

function renderPagination(pag, page, totalPages, total, id, tbodyId, paginationId, cols) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  const pages = buildPageNumbers(page, totalPages);

  pag.innerHTML = `
    <span class="page-info">${start}–${end} de ${total}</span>
    <button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-pg="${page - 1}">&#8249;</button>
    ${pages.map(p => p === '…'
      ? `<button class="page-btn" disabled>…</button>`
      : `<button class="page-btn ${p === page ? 'active' : ''}" data-pg="${p}">${p}</button>`
    ).join('')}
    <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} data-pg="${page + 1}">&#8250;</button>
  `;

  pag.querySelectorAll('[data-pg]').forEach(btn => {
    btn.addEventListener('click', () => {
      getState(id).page = Number(btn.dataset.pg);
      renderPage(id, tbodyId, paginationId, cols);
    });
  });
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

function exportCsv(tableId, cols) {
  const s = getState(tableId);
  const header = cols.map(c => `"${c.label}"`).join(',');
  const rows = s.filtered.map(row =>
    cols.map((c, i) => `"${String(row[i] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableId}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────
   Tabela: Órgãos
───────────────────────────────────────────── */
const COLS_ORGAOS = [
  { label: 'Orgão' },
  { label: 'Empenhado',  num: true, format: formatCurrency },
  { label: 'Liquidado',  num: true, format: formatCurrency },
  { label: 'Anulado',    num: true, format: formatCurrency },
  { label: 'Retido',     num: true, format: formatCurrency },
  { label: 'Pago',       num: true, format: formatCurrency },
];

export function initTableOrgaos() {
  initTable({ id: 'tableOrgaos', tbodyId: 'tbodyOrgaos', paginationId: 'paginationOrgaos', searchId: 'searchOrgaos', cols: COLS_ORGAOS, exportBtn: 'orgaos' });
}

export function renderTableOrgaos(dados) {
  const s = getState('tableOrgaos');
  s.rows = dados.map(d => [d.orgao, d.empenhado, d.liquidado, d.anulado, d.retido, d.pago]);
  s.filtered = [...s.rows];
  s.page = 1;
  renderPage('tableOrgaos', 'tbodyOrgaos', 'paginationOrgaos', COLS_ORGAOS);
}

/* ─────────────────────────────────────────────
   Tabela: Ações
───────────────────────────────────────────── */
const COLS_ACOES = [
  { label: 'Ação' },
  { label: 'Empenhado',  num: true, format: formatCurrency },
  { label: 'Liquidado',  num: true, format: formatCurrency },
  { label: 'Anulado',    num: true, format: formatCurrency },
  { label: 'Retido',     num: true, format: formatCurrency },
  { label: 'Pago',       num: true, format: formatCurrency },
];

export function initTableAcoes() {
  initTable({ id: 'tableAcoes', tbodyId: 'tbodyAcoes', paginationId: 'paginationAcoes', searchId: 'searchAcoes', cols: COLS_ACOES, exportBtn: 'acoes' });
}

export function renderTableAcoes(dados) {
  const s = getState('tableAcoes');
  s.rows = dados.map(d => [d.acao, d.empenhado, d.liquidado, d.anulado, d.retido, d.pago]);
  s.filtered = [...s.rows];
  s.page = 1;
  renderPage('tableAcoes', 'tbodyAcoes', 'paginationAcoes', COLS_ACOES);
}

/* ─────────────────────────────────────────────
   Tabela: Elementos
───────────────────────────────────────────── */
const COLS_ELEMENTOS = [
  { label: 'Elemento' },
  { label: 'Empenhado',  num: true, format: formatCurrency },
  { label: 'Liquidado',  num: true, format: formatCurrency },
  { label: 'Anulado',    num: true, format: formatCurrency },
  { label: 'Retido',     num: true, format: formatCurrency },
  { label: 'Pago',       num: true, format: formatCurrency },
];

export function initTableElementos() {
  initTable({ id: 'tableElementos', tbodyId: 'tbodyElementos', paginationId: 'paginationElementos', searchId: 'searchElementos', cols: COLS_ELEMENTOS, exportBtn: 'elementos' });
}

export function renderTableElementos(dados) {
  const s = getState('tableElementos');
  s.rows = dados.map(d => [d.elemento, d.empenhado, d.liquidado, d.anulado, d.retido, d.pago]);
  s.filtered = [...s.rows];
  s.page = 1;
  renderPage('tableElementos', 'tbodyElementos', 'paginationElementos', COLS_ELEMENTOS);
}

/* ─────────────────────────────────────────────
   Tabela: Mensal
───────────────────────────────────────────── */
const COLS_MENSAL = [
  { label: 'Mês' },
  { label: 'Empenhado',     num: true, format: formatCurrency },
  { label: 'Liquidado',     num: true, format: formatCurrency },
  { label: 'Anulado',       num: true, format: formatCurrency },
  { label: 'Retido',        num: true, format: formatCurrency },
  { label: 'Pago',          num: true, format: formatCurrency },
  { label: '% Emp. Acum.',  num: true, format: formatPercent },
  { label: '% Pago Acum.',  num: true, format: formatPercent },
];

export function initTableMensal() {
  initTable({ id: 'tableMensal', tbodyId: 'tbodyMensal', paginationId: 'paginationMensal', cols: COLS_MENSAL, exportBtn: 'mensal' });
}

export function renderTableMensal(dados) {
  const s = getState('tableMensal');
  s.rows = dados.map(d => [
    MESES[(d.mes ?? 1) - 1] ?? `Mês ${d.mes}`,
    d.empenhado, d.liquidado, d.anulado, d.retido, d.pago,
    d.pctEmpenhado, d.pctPago,
  ]);
  s.filtered = [...s.rows];
  s.page = 1;
  renderPage('tableMensal', 'tbodyMensal', 'paginationMensal', COLS_MENSAL);
}

/* ─────────────────────────────────────────────
   Tabela: Empenhos (dados brutos)
───────────────────────────────────────────── */
const COLS_EMPENHO = [
  { label: 'Contrato' },
  { label: 'Orgão' },
  { label: 'Unidade' },
  { label: 'Credor' },
  { label: 'Tipo Despesa' },
  { label: 'Id Nota' },
  { label: 'Data Empenho',   format: formatDate },
  { label: 'Vl. Empenho',    num: true, format: formatCurrency },
  { label: 'Vl. Liquidado',  num: true, format: formatCurrency },
  { label: 'Vl. Anulado',    num: true, format: formatCurrency },
  { label: 'Vl. Retido',     num: true, format: formatCurrency },
  { label: 'Vl. Liquido',    num: true, format: formatCurrency },
  { label: 'Modalidade' },
  { label: 'Ação' },
  { label: 'Elemento' },
];

export function initTableEmpenho() {
  initTable({ id: 'tableEmpenho', tbodyId: 'tbodyEmpenho', paginationId: 'paginationEmpenho', searchId: 'searchEmpenho', cols: COLS_EMPENHO, exportBtn: 'empenho' });
}

export function renderTableEmpenho(rows) {
  const s = getState('tableEmpenho');
  s.rows = rows;
  s.filtered = [...rows];
  s.page = 1;
  renderPage('tableEmpenho', 'tbodyEmpenho', 'paginationEmpenho', COLS_EMPENHO);
}

/* ─────────────────────────────────────────────
   Tabela: Geral (dados brutos)
───────────────────────────────────────────── */
const COLS_GERAL = [
  { label: 'Contrato' },
  { label: 'Dt. Liquidação',  format: formatDate },
  { label: 'Orgão' },
  { label: 'Unidade' },
  { label: 'Credor' },
  { label: 'Tipo Despesa' },
  { label: 'Id Empenho' },
  { label: 'Id Liquidação' },
  { label: 'Id Ordem Pgto' },
  { label: 'Dt. Empenho',     format: formatDate },
  { label: 'Dt. Pagamento',   format: formatDate },
  { label: 'Vl. Empenho',     num: true, format: formatCurrency },
  { label: 'Vl. Liquidado',   num: true, format: formatCurrency },
  { label: 'Vl. Anulado',     num: true, format: formatCurrency },
  { label: 'Vl. Retido',      num: true, format: formatCurrency },
  { label: 'Vl. Liquido',     num: true, format: formatCurrency },
  { label: 'Licitação' },
  { label: 'Ação' },
  { label: 'Elemento' },
];

export function initTableGeral() {
  initTable({ id: 'tableGeral', tbodyId: 'tbodyGeral', paginationId: 'paginationGeral', searchId: 'searchGeral', cols: COLS_GERAL, exportBtn: 'geral' });
}

export function renderTableGeral(rows) {
  const s = getState('tableGeral');
  s.rows = rows;
  s.filtered = [...rows];
  s.page = 1;
  renderPage('tableGeral', 'tbodyGeral', 'paginationGeral', COLS_GERAL);
}
