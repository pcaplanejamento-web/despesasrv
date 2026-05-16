// compute.js — agregação client-side a partir das linhas brutas das tabelas

// Índices das colunas retornadas por getTabelaEmpenho (0-based)
const E = {
  ORGAO:    1,
  UNIDADE:  2,
  DATA_EMP: 6,
  VL_EMP:   7,
  ACAO:    13,
  ELEMENTO:14,
};

// Índices das colunas retornadas por getTabelaGeral (0-based)
const G = {
  DATA_LIQ: 1,
  ORGAO:    2,
  UNIDADE:  3,
  DATA_PGTO:10,
  VL_LIQ:  12,
  VL_ANUL: 13,
  VL_RET:  14,
  VL_LIQ_L:15,
  ACAO:    17,
  ELEMENTO:18,
};

export function parseDDMMYYYY(str) {
  if (!str) return null;
  const p = String(str).split('/');
  if (p.length !== 3) return null;
  const d = new Date(+p[2], +p[1] - 1, +p[0]);
  return isNaN(d.getTime()) ? null : d;
}

function n(v) {
  const x = Number(v);
  return isNaN(x) ? 0 : x;
}

export function getUnidades(empRows, gerRows) {
  const seen = new Set();
  const result = [];
  for (const r of empRows) {
    const v = String(r[E.UNIDADE] ?? '').trim();
    if (v && !seen.has(v)) { seen.add(v); result.push(v); }
  }
  for (const r of gerRows) {
    const v = String(r[G.UNIDADE] ?? '').trim();
    if (v && !seen.has(v)) { seen.add(v); result.push(v); }
  }
  return result.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function filterByUnidade(empRows, gerRows, unidade) {
  if (!unidade) return { empRows, gerRows };
  const u = unidade.trim().toLowerCase();
  return {
    empRows: empRows.filter(r => String(r[E.UNIDADE] ?? '').trim().toLowerCase() === u),
    gerRows: gerRows.filter(r => String(r[G.UNIDADE] ?? '').trim().toLowerCase() === u),
  };
}

export function computeKpis(empRows, gerRows) {
  let emp = 0;
  for (const r of empRows) emp += n(r[E.VL_EMP]);

  let liq = 0, anul = 0, ret = 0, liqL = 0;
  let qtdAnulados = 0, qtdRetidos = 0;
  for (const r of gerRows) {
    liq  += n(r[G.VL_LIQ]);
    const a  = n(r[G.VL_ANUL]);
    const re = n(r[G.VL_RET]);
    anul += a;
    ret  += re;
    liqL += n(r[G.VL_LIQ_L]);
    if (a  > 0) qtdAnulados++;
    if (re > 0) qtdRetidos++;
  }
  const pago = ret + liqL;
  return {
    empenhado: emp, liquidado: liq, anulado: anul,
    retido: ret, pagoLiquido: liqL, pago,
    pctLiquidado: emp > 0 ? liq / emp : 0,
    pctPago:      emp > 0 ? pago / emp : 0,
    qtdEmpenhos:    empRows.length,
    qtdLiquidacoes: gerRows.length,
    qtdAnulados,
    qtdRetidos,
  };
}

// empKeyIdx/gerKeyIdx: índice da coluna-chave em empRows/gerRows
export function computeAgrupado(empRows, gerRows, empKeyIdx, gerKeyIdx, keyName) {
  const empByKey = {};
  for (const r of empRows) {
    const k = String(r[empKeyIdx] ?? '').trim();
    if (!k) continue;
    empByKey[k] = (empByKey[k] || 0) + n(r[E.VL_EMP]);
  }
  const gerByKey = {};
  for (const r of gerRows) {
    const k = String(r[gerKeyIdx] ?? '').trim();
    if (!k) continue;
    if (!gerByKey[k]) gerByKey[k] = { liq: 0, anul: 0, ret: 0, liqL: 0 };
    gerByKey[k].liq  += n(r[G.VL_LIQ]);
    gerByKey[k].anul += n(r[G.VL_ANUL]);
    gerByKey[k].ret  += n(r[G.VL_RET]);
    gerByKey[k].liqL += n(r[G.VL_LIQ_L]);
  }
  return Object.keys(empByKey).map(k => {
    const g = gerByKey[k] || { liq: 0, anul: 0, ret: 0, liqL: 0 };
    const obj = {
      empenhado: empByKey[k], liquidado: g.liq, anulado: g.anul,
      retido: g.ret, pagoLiquido: g.liqL, pago: g.ret + g.liqL,
    };
    obj[keyName] = k;
    return obj;
  });
}

export function computeMensal(empRows, gerRows) {
  const empBucket = {}, liqBucket = {}, pgtoBucket = {};
  let totalEmp = 0;

  for (const r of empRows) {
    const v = n(r[E.VL_EMP]);
    totalEmp += v;
    const d = parseDDMMYYYY(r[E.DATA_EMP]);
    if (!d) continue;
    const m = d.getMonth() + 1;
    empBucket[m] = (empBucket[m] || 0) + v;
  }

  for (const r of gerRows) {
    const dliq = parseDDMMYYYY(r[G.DATA_LIQ]);
    if (dliq) {
      const m = dliq.getMonth() + 1;
      if (!liqBucket[m]) liqBucket[m] = { liq: 0, anul: 0 };
      liqBucket[m].liq  += n(r[G.VL_LIQ]);
      liqBucket[m].anul += n(r[G.VL_ANUL]);
    }
    const dpgto = parseDDMMYYYY(r[G.DATA_PGTO]);
    if (dpgto) {
      const m = dpgto.getMonth() + 1;
      if (!pgtoBucket[m]) pgtoBucket[m] = { ret: 0, liqL: 0 };
      pgtoBucket[m].ret  += n(r[G.VL_RET]);
      pgtoBucket[m].liqL += n(r[G.VL_LIQ_L]);
    }
  }

  const mesAtual = new Date().getMonth() + 1;
  const simples = [];
  for (let mes = 1; mes <= mesAtual; mes++) {
    const emp  = empBucket[mes]  || 0;
    const liqD = liqBucket[mes]  || { liq: 0, anul: 0 };
    const pgD  = pgtoBucket[mes] || { ret: 0, liqL: 0 };
    simples.push({
      mes, empenhado: emp, liquidado: liqD.liq, anulado: liqD.anul,
      retido: pgD.ret, pagoLiquido: pgD.liqL, pago: pgD.ret + pgD.liqL,
    });
  }

  const acumulado = [];
  let accEmp = 0, accLiq = 0, accPago = 0;
  for (const d of simples) {
    accEmp += d.empenhado; accLiq += d.liquidado; accPago += d.pago;
    acumulado.push({ mes: d.mes, empAcum: accEmp, liqAcum: accLiq, pagoAcum: accPago });
  }

  const base = totalEmp || 1;
  const percentual = acumulado.map((d, i) => ({
    mes: d.mes,
    empenhado: simples[i].empenhado,
    liquidado: simples[i].liquidado,
    anulado:   simples[i].anulado,
    retido:    simples[i].retido,
    pago:      simples[i].pago,
    empAcum:      d.empAcum,
    liqAcum:      d.liqAcum,
    pagoAcum:     d.pagoAcum,
    pctEmpenhado: d.empAcum  / base,
    pctLiquidado: d.liqAcum  / base,
    pctPago:      d.pagoAcum / base,
  }));

  return { simples, acumulado, percentual };
}
