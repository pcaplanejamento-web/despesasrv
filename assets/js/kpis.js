// kpis.js — renderização dos cards KPI no painel principal

import { formatCurrency, formatPercent } from './config.js?v=6';

const KPI_DEFS = [
  {
    key: 'empenhado', label: 'Total Empenhado', colorClass: 'kpi-blue',
    qtyKey: 'qtdEmpenhos', qtySing: 'empenho', qtyPlur: 'empenhos',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  },
  {
    key: 'liquidado', label: 'Total Liquidado', colorClass: 'kpi-green',
    qtyKey: 'qtdLiquidacoes', qtySing: 'liquidação', qtyPlur: 'liquidações',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  },
  {
    key: 'pago', label: 'Total Pago', colorClass: 'kpi-teal',
    qtyKey: 'qtdLiquidacoes', qtySing: 'ordem de pgto.', qtyPlur: 'ordens de pgto.',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  },
  {
    key: 'anulado', label: 'Total Anulado', colorClass: 'kpi-rose',
    qtyKey: 'qtdAnulados', qtySing: 'registro', qtyPlur: 'registros',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  },
  {
    key: 'retido', label: 'Total Retido', colorClass: 'kpi-amber',
    qtyKey: 'qtdRetidos', qtySing: 'retenção', qtyPlur: 'retenções',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
  {
    key: 'pctLiquidado', label: '% Liquidado / Emp.', colorClass: 'kpi-purple', pct: true,
    qtyKey: 'qtdEmpenhos', qtySing: 'empenho', qtyPlur: 'empenhos',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
  },
];

function buildCard(def, data) {
  const value   = data[def.key] ?? 0;
  const display = def.pct ? formatPercent(value) : formatCurrency(value);

  const pctPago = data.pctPago ?? 0;
  const subLabel = def.key === 'empenhado'
    ? `${formatPercent(pctPago)} pago`
    : def.key === 'liquidado'
      ? `${formatPercent(data.pctLiquidado ?? 0)} do empenhado`
      : '';

  const qty    = def.qtyKey != null ? (data[def.qtyKey] ?? 0) : null;
  const qtyStr = qty != null
    ? `${qty.toLocaleString('pt-BR')} ${qty !== 1 ? def.qtyPlur : def.qtySing}`
    : '';

  return `
    <div class="kpi-card ${def.colorClass}" data-kpi="${def.key}">
      <div class="kpi-icon">${def.icon}</div>
      <span class="kpi-label">${def.label}</span>
      <span class="kpi-value">${display}</span>
      ${qtyStr   ? `<span class="kpi-qty">${qtyStr}</span>`     : ''}
      ${subLabel ? `<span class="kpi-sub">${subLabel}</span>`   : ''}
    </div>`;
}

export function renderKpis(data) {
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;
  grid.innerHTML = KPI_DEFS.map(def => buildCard(def, data)).join('');
}
