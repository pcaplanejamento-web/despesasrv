// detail.js — drawer de detalhamento (linhas de tabela e gráficos)

import { formatCurrency } from './config.js?v=4';

/* ── Colunas do EMPENHODADOS (exibição sem Contrato) ── */
const EMP_COLS = [
  { label: 'Órgão',          idx: 1  },
  { label: 'Unidade',        idx: 2  },
  { label: 'Credor',         idx: 3  },
  { label: 'Tipo Despesa',   idx: 4  },
  { label: 'Id Nota',        idx: 5  },
  { label: 'Data Empenho',   idx: 6  },
  { label: 'Vl. Empenho',    idx: 7,  money: true },
  { label: 'Vl. Liquidado',  idx: 8,  money: true },
  { label: 'Vl. Anulado',    idx: 9,  money: true },
  { label: 'Vl. Retido',     idx: 10, money: true },
  { label: 'Vl. Líquido',    idx: 11, money: true },
  { label: 'Modalidade',     idx: 12 },
  { label: 'Ação',           idx: 13 },
  { label: 'Elemento',       idx: 14 },
];

/* ── Colunas do GERALDADOS (exibição sem Contrato, ordem cronológica) ── */
const GER_COLS = [
  { label: 'Órgão',          idx: 2  },
  { label: 'Unidade',        idx: 3  },
  { label: 'Credor',         idx: 4  },
  { label: 'Tipo Despesa',   idx: 5  },
  { label: 'Id Empenho',     idx: 6  },
  { label: 'Id Liquidação',  idx: 7  },
  { label: 'Id Ordem Pgto',  idx: 8  },
  { label: 'Dt. Empenho',    idx: 9  },
  { label: 'Dt. Liquidação', idx: 1  },
  { label: 'Dt. Pagamento',  idx: 10 },
  { label: 'Vl. Empenho',    idx: 11, money: true },
  { label: 'Vl. Liquidado',  idx: 12, money: true },
  { label: 'Vl. Anulado',    idx: 13, money: true },
  { label: 'Vl. Retido',     idx: 14, money: true },
  { label: 'Vl. Líquido',    idx: 15, money: true },
  { label: 'Licitação',      idx: 16 },
  { label: 'Ação',           idx: 17 },
  { label: 'Elemento',       idx: 18 },
];

let _empRows   = [];
let _gerRows   = [];
let _title     = '';
let _activeTab = 'empenho';
let _sortIdx   = null;
let _sortDir   = 1;

function $id(id) { return document.getElementById(id); }

/* ── Ordena linhas pelo índice de coluna ── */
function sortRows(rows, colIdx, dir) {
  return [...rows].sort((a, b) => {
    const va = a[colIdx] ?? '';
    const vb = b[colIdx] ?? '';
    const na = Number(va), nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
    return String(va).localeCompare(String(vb), 'pt-BR') * dir;
  });
}

/* ── Constrói tabela HTML a partir de rows brutas ── */
function buildDetailTable(cols, rows) {
  if (!rows.length) {
    return '<p class="detail-empty">Nenhum registro encontrado.</p>';
  }

  const displayed = _sortIdx !== null ? sortRows(rows, _sortIdx, _sortDir) : rows;

  const head = cols.map(c => {
    const sortCls = _sortIdx === c.idx
      ? (_sortDir === 1 ? 'sort-asc' : 'sort-desc')
      : '';
    const cls = [c.money ? 'num' : '', 'sortable', sortCls].filter(Boolean).join(' ');
    return `<th class="${cls}" data-sort-idx="${c.idx}">${c.label}</th>`;
  }).join('');

  const body = displayed.map(r => {
    const cells = cols.map(c => {
      const raw = r[c.idx] ?? '';
      const txt = c.money ? formatCurrency(raw) : String(raw);
      return `<td class="${c.money ? 'num' : ''}" title="${txt}">${txt}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<div class="table-wrap"><table class="data-table table-sm">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

/* ── Renderiza aba ativa ── */
function renderTab(tab) {
  _activeTab = tab;
  const content = $id('detailContent');
  if (!content) return;
  const cols = tab === 'empenho' ? EMP_COLS : GER_COLS;
  const rows = tab === 'empenho' ? _empRows  : _gerRows;
  content.innerHTML = buildDetailTable(cols, rows);
  content.scrollTop = 0;
}

/* ── Atualiza badge de contagem ── */
function updateCount() {
  const el = $id('detailCount');
  if (!el) return;
  const e = _empRows.length;
  const g = _gerRows.length;
  el.textContent =
    `${e} empenho${e !== 1 ? 's' : ''}  ·  ${g} ${g !== 1 ? 'liquidações' : 'liquidação'}`;
}

/* ── API pública ── */
export function openDetail({ title, sub, bannerClass, empRows, gerRows }) {
  _empRows   = empRows || [];
  _gerRows   = gerRows || [];
  _title     = title  || '';
  _sortIdx   = null;
  _sortDir   = 1;

  const el = n => $id(n);
  if (el('detailTitle')) el('detailTitle').textContent = title || '';
  if (el('detailSub'))   el('detailSub').textContent   = sub   || '';
  updateCount();

  const banner = el('detailBanner');
  if (banner) {
    banner.className = `section-banner ${bannerClass || 'section-banner--indigo'}`;
  }

  // Reseta para aba Empenhos
  document.querySelectorAll('[data-detail-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.detailTab === 'empenho');
  });
  renderTab('empenho');

  const drawer = el('detailDrawer');
  if (drawer) {
    drawer.classList.add('open');
    document.body.classList.add('detail-open');
  }
}

export function closeDetail() {
  $id('detailDrawer')?.classList.remove('open');
  document.body.classList.remove('detail-open');
}

/* ── Exportação CSV da aba ativa ── */
function exportDetailCsv() {
  const cols = _activeTab === 'empenho' ? EMP_COLS : GER_COLS;
  const rows = _activeTab === 'empenho' ? _empRows  : _gerRows;
  const head = cols.map(c => `"${c.label}"`).join(',');
  const body = rows.map(r =>
    cols.map(c => `"${String(r[c.idx] ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `${_title.slice(0, 30).replace(/\W/g, '_')}_${_activeTab}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Inicialização (chamada uma vez no bootstrap) ── */
export function initDetail() {
  $id('detailClose')  ?.addEventListener('click', closeDetail);
  $id('detailOverlay')?.addEventListener('click', closeDetail);
  $id('detailExport') ?.addEventListener('click', exportDetailCsv);

  // Tabs
  document.querySelectorAll('[data-detail-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-detail-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _sortIdx = null;
      _sortDir = 1;
      renderTab(btn.dataset.detailTab);
    });
  });

  // Ordenação por clique no cabeçalho (delegação no conteúdo)
  $id('detailContent')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-sort-idx]');
    if (!th) return;
    const idx = Number(th.dataset.sortIdx);
    if (_sortIdx === idx) {
      _sortDir = -_sortDir;
    } else {
      _sortIdx = idx;
      _sortDir = 1;
    }
    renderTab(_activeTab);
  });

  // Fechar com Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDetail();
  });

  // Swipe para baixo fecha no mobile
  const panel = $id('detailPanel');
  if (panel) {
    let startY = 0, startX = 0;
    panel.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    }, { passive: true });
    panel.addEventListener('touchend', e => {
      const dy = e.changedTouches[0].clientY - startY;
      const dx = Math.abs(e.changedTouches[0].clientX - startX);
      if (dy > 80 && dx < 40) closeDetail();
    }, { passive: true });
  }
}
