// charts.js — criação e atualização de todos os gráficos Chart.js

import { MESES, formatCurrency, formatShort, truncateLabel } from './config.js';

/* ── Paleta primária — tons institucionais ── */
const PAL = {
  navy: { border: '#1a3c6e', gc: ['rgba(26,60,110,0.75)', 'rgba(26,60,110,0.04)'] },
  blue: { border: '#2d6898', gc: ['rgba(45,104,152,0.65)', 'rgba(45,104,152,0.04)'] },
  teal: { border: '#1e7a8a', gc: ['rgba(30,122,138,0.55)', 'rgba(30,122,138,0.03)'] },
};

/* ── Paleta categórica desaturada ── */
const CAT_COLORS = [
  '#1a3c6e','#2d6898','#1e7a8a','#1e6745','#7a5018',
  '#7a2840','#4a3878','#6a4a3a','#2a5a7a','#3a6858',
  '#5a4a20','#5a2a48','#2a4a8a','#3a6838','#6a3a28',
  '#4a2a68','#1e5060','#5a4a10','#5a1e30','#2a5050',
];

/* ── Helpers de cor por tema ── */
function isDark() { return document.documentElement.dataset.theme === 'dark'; }
function textColor()    { return isDark() ? '#94a3b8' : '#374151'; }
function gridColor()    { return isDark() ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)'; }
function surfaceColor() { return isDark() ? '#1e293b' : '#ffffff'; }

const chartInstances = {};

/* ── Plugin de gradiente de canvas ── */
const GRADIENT_PLUGIN = {
  id: 'areaGradient',
  beforeDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    chart.data.datasets.forEach(ds => {
      if (!ds._gc) return;
      const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      g.addColorStop(0, ds._gc[0]);
      g.addColorStop(1, ds._gc[1]);
      ds.backgroundColor = g;
    });
  },
};

/* ── Opções base para gráficos de área/linha ── */
function areaOpts(tooltipLabel) {
  const tc = textColor();
  const gc = gridColor();
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: 'Inter', size: 12, weight: '500' },
          boxWidth: 10, boxHeight: 10, padding: 24,
          usePointStyle: true, pointStyle: 'circle', pointStyleWidth: 10,
          color: tc,
        },
      },
      tooltip: { callbacks: { label: tooltipLabel } },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: tc },
        border: { color: gc },
      },
      y: {
        grid: { color: gc, drawBorder: false },
        ticks: {
          font: { family: 'Inter', size: 11 }, color: tc,
          callback: v => formatShort(v),
        },
        border: { display: false },
      },
    },
    elements: {
      line: { tension: 0.45, borderWidth: 2.5 },
      point: { radius: 0, hoverRadius: 5, hoverBorderWidth: 2, hoverBorderColor: surfaceColor() },
    },
  };
}

/* ── Opções base para barras horizontais ── */
function hbarOpts() {
  const tc = textColor();
  const gc = gridColor();
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.x)}` } },
    },
    scales: {
      x: {
        grid: { color: gc, drawBorder: false },
        ticks: {
          font: { family: 'Inter', size: 11 }, color: tc,
          callback: v => formatShort(v),
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: tc },
        border: { color: gc },
      },
    },
  };
}

function destroyIfExists(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function areaDataset(label, data, pal, order) {
  return {
    label, data,
    borderColor: pal.border,
    backgroundColor: pal.gc[0],
    _gc: pal.gc,
    fill: true, order,
    pointBackgroundColor: pal.border,
  };
}

function addClickHandler(opts, dados, onClickCb) {
  if (!onClickCb) return;
  opts.onClick = (event, elements) => {
    if (elements.length > 0) onClickCb(dados[elements[0].index]);
  };
  opts.onHover = (event, elements) => {
    const canvas = event.native?.target;
    if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default';
  };
}

/* ── Empenho × Liquidação × Pagamento por Mês (área) ── */
export function renderChartMensalBarras(dados, onClickCb) {
  destroyIfExists('mensalBarras');
  const ctx = document.getElementById('chartMensalBarras');
  if (!ctx) return;
  const labels = dados.map(d => MESES[d.mes - 1] ?? `Mês ${d.mes}`);
  const opts = areaOpts(c => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}`);
  addClickHandler(opts, dados, onClickCb);
  chartInstances.mensalBarras = new Chart(ctx, {
    type: 'line',
    plugins: [GRADIENT_PLUGIN],
    data: {
      labels,
      datasets: [
        areaDataset('Empenhado', dados.map(d => d.empenhado), PAL.navy, 3),
        areaDataset('Liquidado', dados.map(d => d.liquidado), PAL.blue, 2),
        areaDataset('Pago',      dados.map(d => d.pago),      PAL.teal, 1),
      ],
    },
    options: opts,
  });
}

/* ── Evolução Acumulada Mensal (área) ── */
export function renderChartMensalLinha(dados, onClickCb) {
  destroyIfExists('mensalLinha');
  const ctx = document.getElementById('chartMensalLinha');
  if (!ctx) return;
  const labels = dados.map(d => MESES[d.mes - 1] ?? `Mês ${d.mes}`);
  const opts = areaOpts(c => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}`);
  addClickHandler(opts, dados, onClickCb);
  chartInstances.mensalLinha = new Chart(ctx, {
    type: 'line',
    plugins: [GRADIENT_PLUGIN],
    data: {
      labels,
      datasets: [
        areaDataset('Empenhado Acum.', dados.map(d => d.empAcum),  PAL.navy, 3),
        areaDataset('Liquidado Acum.', dados.map(d => d.liqAcum),  PAL.blue, 2),
        areaDataset('Pago Acum.',      dados.map(d => d.pagoAcum), PAL.teal, 1),
      ],
    },
    options: opts,
  });
}

/* ── Progressão Percentual (área) ── */
export function renderChartProgressao(dados, onClickCb) {
  destroyIfExists('progressao');
  const ctx = document.getElementById('chartProgressao');
  if (!ctx) return;
  const labels = dados.map(d => MESES[d.mes - 1] ?? `Mês ${d.mes}`);
  const opts = areaOpts(c => ` ${c.dataset.label}: ${(c.parsed.y * 100).toFixed(1)}%`);
  addClickHandler(opts, dados, onClickCb);
  const tc = textColor();
  const gc = gridColor();
  opts.scales.y = {
    min: 0,
    grid: { color: gc, drawBorder: false },
    ticks: {
      font: { family: 'Inter', size: 11 }, color: tc,
      callback: v => (v * 100).toFixed(0) + '%',
    },
    border: { display: false },
  };
  chartInstances.progressao = new Chart(ctx, {
    type: 'line',
    plugins: [GRADIENT_PLUGIN],
    data: {
      labels,
      datasets: [
        areaDataset('% Empenhado', dados.map(d => d.pctEmpenhado), PAL.navy, 3),
        areaDataset('% Liquidado', dados.map(d => d.pctLiquidado), PAL.blue, 2),
        areaDataset('% Pago',      dados.map(d => d.pctPago),      PAL.teal, 1),
      ],
    },
    options: opts,
  });
}

/* ── Barras horizontais — Órgãos ── */
export function renderChartOrgaos(dados, onClickCb) {
  destroyIfExists('orgaos');
  const ctx = document.getElementById('chartOrgaos');
  if (!ctx) return;
  const sorted = [...dados].sort((a, b) => b.empenhado - a.empenhado);
  if (ctx.parentElement) ctx.parentElement.style.height = Math.max(300, sorted.length * 32 + 80) + 'px';
  const labels = sorted.map(d => truncateLabel(d.orgao, 35));
  const opts = hbarOpts();
  addClickHandler(opts, sorted, onClickCb);
  chartInstances.orgaos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Empenhado', data: sorted.map(d => d.empenhado), backgroundColor: PAL.navy.border, borderRadius: 3 }],
    },
    options: opts,
  });
}

/* ── Gráfico unificado: Ação ou Elemento ── */
export function renderChartDesmembrado(dados, keyName, chartType = 'bar', onClickCb) {
  destroyIfExists('desmembrado');
  const ctx = document.getElementById('chartDesmembrado');
  if (!ctx) return;

  const sorted = [...dados].sort((a, b) => b.empenhado - a.empenhado);
  const outer  = document.getElementById('desmembradoScrollOuter');
  const inner  = document.getElementById('desmembradoScrollInner');

  if (chartType === 'pie') {
    if (inner) inner.style.height = '';
    if (outer) outer.classList.remove('is-bar');

    const labels = sorted.map(d => truncateLabel(String(d[keyName] ?? ''), 40));
    const tc = textColor();
    const pieOpts = {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: 'Inter', size: 11, weight: '500' },
            boxWidth: 10, boxHeight: 10, padding: 12,
            usePointStyle: true, pointStyle: 'circle', pointStyleWidth: 10,
            color: tc,
          },
        },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${formatCurrency(c.parsed)}` } },
      },
    };
    addClickHandler(pieOpts, sorted, onClickCb);
    chartInstances.desmembrado = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: sorted.map(d => d.empenhado),
          backgroundColor: sorted.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]),
          borderWidth: 2,
          borderColor: surfaceColor(),
        }],
      },
      options: pieOpts,
    });
  } else {
    const h = Math.max(400, sorted.length * 34 + 80);
    if (inner) inner.style.height = h + 'px';
    if (outer) outer.classList.add('is-bar');

    const labels = sorted.map(d => truncateLabel(String(d[keyName] ?? ''), 45));
    const opts = hbarOpts();
    addClickHandler(opts, sorted, onClickCb);
    chartInstances.desmembrado = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Empenhado',
          data: sorted.map(d => d.empenhado),
          backgroundColor: PAL.blue.border,
          borderRadius: 4,
        }],
      },
      options: opts,
    });
  }
}
