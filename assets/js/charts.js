// charts.js — criação e atualização de todos os gráficos Chart.js

import { MESES, formatCurrency, truncateLabel } from './config.js';

const COLORS = {
  empenhado: '#1a3c6e',
  liquidado: '#2554a0',
  pago:      '#28a745',
  anulado:   '#dc3545',
};

const ALPHA = {
  empenhado: 'rgba(26,60,110,.75)',
  liquidado: 'rgba(37,84,160,.75)',
  pago:      'rgba(40,167,69,.75)',
};

const chartInstances = {};

function baseOptions(indexAxis = 'x') {
  return {
    indexAxis,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Inter', size: 12 }, boxWidth: 12, padding: 16 },
      },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed[indexAxis === 'y' ? 'x' : 'y'])}`,
        },
      },
    },
    scales: {
      x: { ticks: { font: { family: 'Inter', size: 11 } }, grid: { color: '#e8ecf1' } },
      y: { ticks: { font: { family: 'Inter', size: 11 } }, grid: { color: '#e8ecf1' } },
    },
  };
}

function destroyIfExists(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

/* ── Barras mensais sobrepostas (Emp atrás, Liq no meio, Pago na frente) ── */
export function renderChartMensalBarras(dados) {
  destroyIfExists('mensalBarras');
  const ctx = document.getElementById('chartMensalBarras');
  if (!ctx) return;

  const labels = dados.map(d => MESES[d.mes - 1] ?? `Mês ${d.mes}`);
  chartInstances.mensalBarras = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Empenhado',
          data: dados.map(d => d.empenhado),
          backgroundColor: 'rgba(26,60,110,.55)',
          grouped: false,
          order: 3,
          barPercentage: 1.0,
          categoryPercentage: 0.85,
        },
        {
          label: 'Liquidado',
          data: dados.map(d => d.liquidado),
          backgroundColor: 'rgba(37,84,160,.78)',
          grouped: false,
          order: 2,
          barPercentage: 0.68,
          categoryPercentage: 0.85,
        },
        {
          label: 'Pago',
          data: dados.map(d => d.pago),
          backgroundColor: 'rgba(40,167,69,.92)',
          grouped: false,
          order: 1,
          barPercentage: 0.38,
          categoryPercentage: 0.85,
        },
      ],
    },
    options: baseOptions(),
  });
}

/* ── Linha acumulada mensal ── */
export function renderChartMensalLinha(dados) {
  destroyIfExists('mensalLinha');
  const ctx = document.getElementById('chartMensalLinha');
  if (!ctx) return;

  const labels = dados.map(d => MESES[d.mes - 1] ?? `Mês ${d.mes}`);
  const lineOptions = baseOptions();
  lineOptions.plugins.tooltip.callbacks.label =
    ctx2 => ` ${ctx2.dataset.label}: ${formatCurrency(ctx2.parsed.y)}`;

  chartInstances.mensalLinha = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Empenhado Acum.', data: dados.map(d => d.empAcum), borderColor: COLORS.empenhado, backgroundColor: 'transparent', tension: .3, pointRadius: 4 },
        { label: 'Liquidado Acum.', data: dados.map(d => d.liqAcum), borderColor: COLORS.liquidado, backgroundColor: 'transparent', tension: .3, pointRadius: 4 },
        { label: 'Pago Acum.',      data: dados.map(d => d.pagoAcum), borderColor: COLORS.pago,      backgroundColor: 'transparent', tension: .3, pointRadius: 4 },
      ],
    },
    options: lineOptions,
  });
}

/* ── Barras horizontais — Órgãos ── */
export function renderChartOrgaos(dados) {
  destroyIfExists('orgaos');
  const ctx = document.getElementById('chartOrgaos');
  if (!ctx) return;

  const top10 = [...dados].sort((a, b) => b.empenhado - a.empenhado).slice(0, 10);
  const labels = top10.map(d => truncateLabel(d.orgao, 35));
  const opts = baseOptions('y');
  opts.plugins.tooltip.callbacks.label = ctx2 => ` Empenhado: ${formatCurrency(ctx2.parsed.x)}`;

  chartInstances.orgaos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Empenhado', data: top10.map(d => d.empenhado), backgroundColor: ALPHA.empenhado }],
    },
    options: opts,
  });
}

/* ── Barras horizontais — Ações ── */
export function renderChartAcoes(dados) {
  destroyIfExists('acoes');
  const ctx = document.getElementById('chartAcoes');
  if (!ctx) return;

  const top15 = [...dados].sort((a, b) => b.empenhado - a.empenhado).slice(0, 15);
  const labels = top15.map(d => truncateLabel(d.acao, 45));
  const opts = baseOptions('y');
  opts.plugins.tooltip.callbacks.label = ctx2 => ` Empenhado: ${formatCurrency(ctx2.parsed.x)}`;

  chartInstances.acoes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Empenhado', data: top15.map(d => d.empenhado), backgroundColor: ALPHA.empenhado }],
    },
    options: opts,
  });
}

/* ── Barras horizontais — Elementos ── */
export function renderChartElementos(dados) {
  destroyIfExists('elementos');
  const ctx = document.getElementById('chartElementos');
  if (!ctx) return;

  const top15 = [...dados].sort((a, b) => b.empenhado - a.empenhado).slice(0, 15);
  const labels = top15.map(d => truncateLabel(d.elemento, 45));
  const opts = baseOptions('y');
  opts.plugins.tooltip.callbacks.label = ctx2 => ` Empenhado: ${formatCurrency(ctx2.parsed.x)}`;

  chartInstances.elementos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Empenhado', data: top15.map(d => d.empenhado), backgroundColor: ALPHA.empenhado }],
    },
    options: opts,
  });
}

/* ── Painel: Órgãos (top 10) ── */
export function renderChartPainelOrgaos(dados) {
  destroyIfExists('painelOrgaos');
  const ctx = document.getElementById('chartPainelOrgaos');
  if (!ctx) return;

  const top10 = [...dados].sort((a, b) => b.empenhado - a.empenhado).slice(0, 10);
  const opts = baseOptions('y');
  opts.plugins.tooltip.callbacks.label = ctx2 => ` Empenhado: ${formatCurrency(ctx2.parsed.x)}`;

  chartInstances.painelOrgaos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(d => truncateLabel(d.orgao, 35)),
      datasets: [{ label: 'Empenhado', data: top10.map(d => d.empenhado), backgroundColor: ALPHA.empenhado }],
    },
    options: opts,
  });
}

/* ── Painel: Ações (top 10) ── */
export function renderChartPainelAcoes(dados) {
  destroyIfExists('painelAcoes');
  const ctx = document.getElementById('chartPainelAcoes');
  if (!ctx) return;

  const top10 = [...dados].sort((a, b) => b.empenhado - a.empenhado).slice(0, 10);
  const opts = baseOptions('y');
  opts.plugins.tooltip.callbacks.label = ctx2 => ` Empenhado: ${formatCurrency(ctx2.parsed.x)}`;

  chartInstances.painelAcoes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(d => truncateLabel(d.acao, 45)),
      datasets: [{ label: 'Empenhado', data: top10.map(d => d.empenhado), backgroundColor: ALPHA.empenhado }],
    },
    options: opts,
  });
}

/* ── Painel: Elementos (top 10) ── */
export function renderChartPainelElementos(dados) {
  destroyIfExists('painelElementos');
  const ctx = document.getElementById('chartPainelElementos');
  if (!ctx) return;

  const top10 = [...dados].sort((a, b) => b.empenhado - a.empenhado).slice(0, 10);
  const opts = baseOptions('y');
  opts.plugins.tooltip.callbacks.label = ctx2 => ` Empenhado: ${formatCurrency(ctx2.parsed.x)}`;

  chartInstances.painelElementos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(d => truncateLabel(d.elemento, 45)),
      datasets: [{ label: 'Empenhado', data: top10.map(d => d.empenhado), backgroundColor: ALPHA.empenhado }],
    },
    options: opts,
  });
}

/* ── Linha percentual mensal ── */
export function renderChartProgressao(dados) {
  destroyIfExists('progressao');
  const ctx = document.getElementById('chartProgressao');
  if (!ctx) return;

  const labels = dados.map(d => MESES[d.mes - 1] ?? `Mês ${d.mes}`);
  const pctOpts = baseOptions();
  pctOpts.scales.y = {
    ticks: {
      font: { family: 'Inter', size: 11 },
      callback: v => (v * 100).toFixed(0) + '%',
    },
    grid: { color: '#e8ecf1' },
    min: 0,
    max: 1,
  };
  pctOpts.plugins.tooltip.callbacks.label =
    ctx2 => ` ${ctx2.dataset.label}: ${(ctx2.parsed.y * 100).toFixed(1)}%`;

  chartInstances.progressao = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '% Empenhado', data: dados.map(d => d.pctEmpenhado), borderColor: COLORS.empenhado, backgroundColor: 'transparent', tension: .3, pointRadius: 4 },
        { label: '% Liquidado', data: dados.map(d => d.pctLiquidado), borderColor: COLORS.liquidado, backgroundColor: 'transparent', tension: .3, pointRadius: 4 },
        { label: '% Pago',      data: dados.map(d => d.pctPago),      borderColor: COLORS.pago,      backgroundColor: 'transparent', tension: .3, pointRadius: 4 },
      ],
    },
    options: pctOpts,
  });
}
