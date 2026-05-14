// DataService.gs — leitura e agregação dos dados das abas da planilha

// Índices EMPENHODADOS (0-based, linha 1 = cabeçalho removida)
var EMP = {
  CONTRATO:   0,  // A
  ORGAO:      1,  // B
  UNIDADE:    2,  // C
  CREDOR:     3,  // D
  TIPO:       4,  // E
  ID_NOTA:    5,  // F
  DATA_EMP:   6,  // G
  VL_EMP:     7,  // H
  VL_LIQ:     8,  // I
  VL_ANUL:    9,  // J
  VL_RET:    10,  // K
  VL_LIQ_L:  11,  // L
  MODALIDADE:12,  // M
  ACAO:      13,  // N
  ELEMENTO:  14,  // O
};

// Índices GERALDADOS (0-based)
var GER = {
  CONTRATO:   0,  // A
  DATA_LIQ:   1,  // B
  ORGAO:      2,  // C
  UNIDADE:    3,  // D
  CREDOR:     4,  // E
  TIPO:       5,  // F
  ID_EMP:     6,  // G
  ID_LIQ:     7,  // H
  ID_OP:      8,  // I
  DATA_EMP:   9,  // J
  DATA_PGTO: 10,  // K
  VL_EMP:    11,  // L
  VL_LIQ:    12,  // M
  VL_ANUL:   13,  // N
  VL_RET:    14,  // O
  VL_LIQ_L:  15,  // P
  LICITACAO: 16,  // Q
  ACAO:      17,  // R
  ELEMENTO:  18,  // S
};

function buildDemonstrativo(rows, nameCol, cols) {
  var keys = uniqueValues(rows, nameCol);
  return keys.map(function(k) {
    var emp  = sumIf(rows, nameCol, k, cols.emp);
    var liq  = sumIf(rows, nameCol, k, cols.liq);
    var anul = sumIf(rows, nameCol, k, cols.anul);
    var ret  = sumIf(rows, nameCol, k, cols.ret);
    var liqL = sumIf(rows, nameCol, k, cols.liqL);
    var pago = ret + liqL;
    var obj = { empenhado: emp, liquidado: liq, anulado: anul, retido: ret, pagoLiquido: liqL, pago: pago };
    obj[cols.keyName] = k;
    return obj;
  });
}

function getKpis() {
  var rows = getSheetData(Config.ABA_EMPENHO);
  var emp  = 0, liq = 0, anul = 0, ret = 0, liqL = 0;
  for (var i = 0; i < rows.length; i++) {
    emp  += parseNum(rows[i][EMP.VL_EMP]);
    liq  += parseNum(rows[i][EMP.VL_LIQ]);
    anul += parseNum(rows[i][EMP.VL_ANUL]);
    ret  += parseNum(rows[i][EMP.VL_RET]);
    liqL += parseNum(rows[i][EMP.VL_LIQ_L]);
  }
  var pago = ret + liqL;
  return {
    empenhado:    emp,
    liquidado:    liq,
    anulado:      anul,
    retido:       ret,
    pagoLiquido:  liqL,
    pago:         pago,
    pctLiquidado: emp > 0 ? liq / emp : 0,
    pctPago:      emp > 0 ? pago / emp : 0,
  };
}

function getOrgaos() {
  var rows = getSheetData(Config.ABA_EMPENHO);
  return buildDemonstrativo(rows, EMP.ORGAO, {
    keyName: 'orgao', emp: EMP.VL_EMP, liq: EMP.VL_LIQ, anul: EMP.VL_ANUL, ret: EMP.VL_RET, liqL: EMP.VL_LIQ_L,
  });
}

function getAcoes() {
  var rows = getSheetData(Config.ABA_EMPENHO);
  return buildDemonstrativo(rows, EMP.ACAO, {
    keyName: 'acao', emp: EMP.VL_EMP, liq: EMP.VL_LIQ, anul: EMP.VL_ANUL, ret: EMP.VL_RET, liqL: EMP.VL_LIQ_L,
  });
}

function getElementos() {
  var rows = getSheetData(Config.ABA_EMPENHO);
  return buildDemonstrativo(rows, EMP.ELEMENTO, {
    keyName: 'elemento', emp: EMP.VL_EMP, liq: EMP.VL_LIQ, anul: EMP.VL_ANUL, ret: EMP.VL_RET, liqL: EMP.VL_LIQ_L,
  });
}

function getMensal() {
  var empRows = getSheetData(Config.ABA_EMPENHO);
  var gerRows = getSheetData(Config.ABA_GERAL);

  var simples = [];
  var empTotal = 0;

  for (var mes = 1; mes <= 12; mes++) {
    var emp  = sumIfMonth(empRows, EMP.DATA_EMP,  mes, EMP.VL_EMP);
    var liq  = sumIfMonth(gerRows, GER.DATA_LIQ,  mes, GER.VL_LIQ);
    var anul = sumIfMonth(gerRows, GER.DATA_LIQ,  mes, GER.VL_ANUL);
    var ret  = sumIfMonth(gerRows, GER.DATA_PGTO, mes, GER.VL_RET);
    var liqL = sumIfMonth(gerRows, GER.DATA_PGTO, mes, GER.VL_LIQ_L);
    var pago = ret + liqL;
    empTotal += emp;
    simples.push({ mes: mes, empenhado: emp, liquidado: liq, anulado: anul, retido: ret, pagoLiquido: liqL, pago: pago });
  }

  // Acumulado (running sum)
  var acumulado = [];
  var accEmp = 0, accLiq = 0, accPago = 0;
  simples.forEach(function(d) {
    accEmp  += d.empenhado;
    accLiq  += d.liquidado;
    accPago += d.pago;
    acumulado.push({ mes: d.mes, empAcum: accEmp, liqAcum: accLiq, pagoAcum: accPago });
  });

  // Total empenhado para base percentual
  var kpis = getKpis();
  var base = kpis.empenhado || 1;

  // Percentual acumulado
  var percentual = acumulado.map(function(d, i) {
    return {
      mes:          d.mes,
      empenhado:    simples[i].empenhado,
      liquidado:    simples[i].liquidado,
      anulado:      simples[i].anulado,
      retido:       simples[i].retido,
      pago:         simples[i].pago,
      empAcum:      d.empAcum,
      liqAcum:      d.liqAcum,
      pagoAcum:     d.pagoAcum,
      pctEmpenhado: d.empAcum  / base,
      pctLiquidado: d.liqAcum  / base,
      pctPago:      d.pagoAcum / base,
    };
  });

  return { simples: simples, acumulado: acumulado, percentual: percentual };
}

function getTabelaEmpenho() {
  var rows = getSheetData(Config.ABA_EMPENHO);
  var result = rows.map(function(r) {
    return [
      r[EMP.CONTRATO],
      r[EMP.ORGAO],
      r[EMP.UNIDADE],
      r[EMP.CREDOR],
      r[EMP.TIPO],
      r[EMP.ID_NOTA],
      formatDateStr(r[EMP.DATA_EMP]),
      parseNum(r[EMP.VL_EMP]),
      parseNum(r[EMP.VL_LIQ]),
      parseNum(r[EMP.VL_ANUL]),
      parseNum(r[EMP.VL_RET]),
      parseNum(r[EMP.VL_LIQ_L]),
      r[EMP.MODALIDADE],
      r[EMP.ACAO],
      r[EMP.ELEMENTO],
    ];
  });
  return { rows: result };
}

function getTabelaGeral() {
  var rows = getSheetData(Config.ABA_GERAL);
  var result = rows.map(function(r) {
    return [
      r[GER.CONTRATO],
      formatDateStr(r[GER.DATA_LIQ]),
      r[GER.ORGAO],
      r[GER.UNIDADE],
      r[GER.CREDOR],
      r[GER.TIPO],
      r[GER.ID_EMP],
      r[GER.ID_LIQ],
      r[GER.ID_OP],
      formatDateStr(r[GER.DATA_EMP]),
      formatDateStr(r[GER.DATA_PGTO]),
      parseNum(r[GER.VL_EMP]),
      parseNum(r[GER.VL_LIQ]),
      parseNum(r[GER.VL_ANUL]),
      parseNum(r[GER.VL_RET]),
      parseNum(r[GER.VL_LIQ_L]),
      r[GER.LICITACAO],
      r[GER.ACAO],
      r[GER.ELEMENTO],
    ];
  });
  return { rows: result };
}
