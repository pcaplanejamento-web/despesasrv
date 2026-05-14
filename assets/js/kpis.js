// kpis.js — renderização dos cards KPI no painel principal

import { formatCurrency, formatPercent } from './config.js';

const KPI_DEFS = [
  { key: 'empenhado',    label: 'Total Empenhado',    color: 'var(--color-primary)' },
  { key: 'liquidado',    label: 'Total Liquidado',    color: 'var(--color-primary-light)' },
  { key: 'pago',         label: 'Total Pago',         color: 'var(--color-positive)' },
  { key: 'anulado',      label: 'Total Anulado',      color: 'var(--color-negative)' },
  { key: 'retido',       label: 'Total Retido',       color: 'var(--color-warning)' },
  { key: 'pctLiquidado', label: '% Liquidado / Emp.', color: 'var(--color-primary)', pct: true },
];

function buildCard(def, data) {
  const value = data[def.key] ?? 0;
  const display = def.pct ? formatPercent(value) : formatCurrency(value);

  const pctPago = data.pctPago ?? 0;
  const subLabel = def.key === 'empenhado'
    ? `${formatPercent(pctPago)} pago`
    : def.key === 'liquidado'
      ? `${formatPercent(data.pctLiquidado ?? 0)} do empenhado`
      : '';

  return `
    <div class="kpi-card" data-kpi="${def.key}">
      <span class="kpi-label">${def.label}</span>
      <span class="kpi-value" style="color:${def.color}">${display}</span>
      ${subLabel ? `<span class="kpi-sub">${subLabel}</span>` : ''}
    </div>`;
}

export function renderKpis(data) {
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;
  grid.innerHTML = KPI_DEFS.map(def => buildCard(def, data)).join('');
}
