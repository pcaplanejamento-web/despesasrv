// Utils.gs — funções auxiliares: datas, números e CORS

function jsonResponse(payload, statusCode) {
  var output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function errorResponse(msg) {
  return jsonResponse({ error: msg });
}

function getSheet(abaName) {
  var ss = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(abaName);
  if (!sheet) throw new Error('Aba não encontrada: ' + abaName);
  return sheet;
}

function getSheetData(abaName) {
  var sheet = getSheet(abaName);
  var values = sheet.getDataRange().getValues();
  // Remove cabeçalho (linha 1)
  return values.slice(1);
}

function parseNum(val) {
  var n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function getMonth(val) {
  var d = parseDate(val);
  return d ? d.getMonth() + 1 : null; // 1-12
}

// SUMIF equivalente sobre um array de linhas
// colIdx: índice da coluna critério (0-based)
// criterion: valor a comparar (string comparison)
// sumIdx: índice da coluna a somar
function sumIf(rows, colIdx, criterion, sumIdx) {
  var total = 0;
  var crit = String(criterion).trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][colIdx]).trim().toLowerCase() === crit) {
      total += parseNum(rows[i][sumIdx]);
    }
  }
  return total;
}

// SUMIF por mês (compara mês extraído da coluna de data)
function sumIfMonth(rows, dateColIdx, month, sumIdx) {
  var total = 0;
  for (var i = 0; i < rows.length; i++) {
    if (getMonth(rows[i][dateColIdx]) === month) {
      total += parseNum(rows[i][sumIdx]);
    }
  }
  return total;
}

// Retorna valores únicos de uma coluna (não-vazios)
function uniqueValues(rows, colIdx) {
  var seen = {};
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var v = String(rows[i][colIdx]).trim();
    if (v && !seen[v]) {
      seen[v] = true;
      result.push(v);
    }
  }
  return result;
}

function formatDateStr(val) {
  var d = parseDate(val);
  if (!d) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}
