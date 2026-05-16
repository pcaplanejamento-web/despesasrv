// charts.js — criação e atualização de todos os gráficos Chart.js

import { MESES, formatCurrency, formatShort, truncateLabel } from './config.js';

/* ── Paleta de séries — Material Design, máximo contraste ── */
const PAL = {
  // Empenhado — Blue 800
  a: { border: '#1565C0', gc: ['rgba(21,101,192,.28)', 'rgba(21,101,192,.01)'] },
  // Liquidado — Green 800
  b: { border: '#2E7D32', gc: ['rgba(46,125,50,.25)',  'rgba(46,125,50,.01)']  },
  // Pago — Deep Orange 800
  c: { border: '#E65100', gc: ['rgba(230,81,0,.22)',   'rgba(230,81,0,.01)']   },
};

/* ── Paleta categórica — 20 cores MD distintas ── */
const CAT_COLORS = [
  '#1565C0','#2E7D32','#E65100','#6A1B9A','#00695C',
  '#AD1457','#0277BD','#558B2F','#283593','#BF360C',
  '#006064','#F57F17','#4527A0','#1B5E20','#880E4F',
  '#0D47A1','#33691E','#4E342E','#37474F','#B71C1C',
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

/* ── Empenho × Liquidação × Pagamento — Diário ou Mensal (área) ── */
export function renderChartMensalBarras(dados, onClickCb, mode = 'diario', zoom = false) {
  destroyIfExists('mensalBarras');
  const ctx = document.getElementById('chartMensalBarras');
  if (!ctx) return;
  const labels = mode === 'diario'
    ? dados.map(d => d.data.slice(0, 5))                         // dd/MM
    : dados.map(d => MESES[d.mes - 1] ?? `Mês ${d.mes}`);       // Jan, Fev...
  const opts = areaOpts(c => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}`);
  if (mode === 'diario') {
    opts.plugins.tooltip.callbacks.title = items =>
      dados[items[0]?.dataIndex]?.data ?? '';
    opts.scales.x.ticks.maxTicksLimit = 14;
    opts.scales.x.ticks.autoSkip = true;
  }
  if (zoom) opts.scales.y.max = 200_000_000; // Zoom: Y ≤ 200M
  addClickHandler(opts, dados, onClickCb);
  chartInstances.mensalBarras = new Chart(ctx, {
    type: 'line',
    plugins: [GRADIENT_PLUGIN],
    data: {
      labels,
      datasets: [
        areaDataset('Empenhado', dados.map(d => d.empenhado), PAL.a, 3),
        areaDataset('Liquidado', dados.map(d => d.liquidado), PAL.b, 2),
        areaDataset('Pago',      dados.map(d => d.pago),      PAL.c, 1),
      ],
    },
    options: opts,
  });
}

/* ── Evolução Acumulada — Diária ou Mensal (área) ── */
export function renderChartMensalLinha(dados, onClickCb, mode = 'diario', zoom = false) {
  destroyIfExists('mensalLinha');
  const ctx = document.getElementById('chartMensalLinha');
  if (!ctx) return;
  const labels = mode === 'diario'
    ? dados.map(d => d.data.slice(0, 5))
    : dados.map(d => MESES[d.mes - 1] ?? `Mês ${d.mes}`);
  const opts = areaOpts(c => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}`);
  if (mode === 'diario') {
    opts.plugins.tooltip.callbacks.title = items =>
      dados[items[0]?.dataIndex]?.data ?? '';
    opts.scales.x.ticks.maxTicksLimit = 14;
    opts.scales.x.ticks.autoSkip = true;
  }
  if (zoom) opts.scales.y.max = 200_000_000; // Zoom: Y ≤ 200M
  addClickHandler(opts, dados, onClickCb);
  chartInstances.mensalLinha = new Chart(ctx, {
    type: 'line',
    plugins: [GRADIENT_PLUGIN],
    data: {
      labels,
      datasets: [
        areaDataset('Empenhado Acum.', dados.map(d => d.empAcum),  PAL.a, 3),
        areaDataset('Liquidado Acum.', dados.map(d => d.liqAcum),  PAL.b, 2),
        areaDataset('Pago Acum.',      dados.map(d => d.pagoAcum), PAL.c, 1),
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
        areaDataset('% Empenhado', dados.map(d => d.pctEmpenhado), PAL.a, 3),
        areaDataset('% Liquidado', dados.map(d => d.pctLiquidado), PAL.b, 2),
        areaDataset('% Pago',      dados.map(d => d.pctPago),      PAL.c, 1),
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
      datasets: [{ label: 'Empenhado', data: sorted.map(d => d.empenhado), backgroundColor: PAL.a.border, borderRadius: 3 }],
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
          backgroundColor: PAL.a.border,
          borderRadius: 4,
        }],
      },
      options: opts,
    });
  }
}
