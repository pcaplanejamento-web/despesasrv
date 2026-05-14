// Endpoints.gs — handlers de cada rota da API

var VALID_ROUTES = ['kpis', 'orgaos', 'acoes', 'elementos', 'mensal', 'tabela'];

function handleRoute(route, params) {
  switch (route) {
    case 'kpis':      return getKpis();
    case 'orgaos':    return getOrgaos();
    case 'acoes':     return getAcoes();
    case 'elementos': return getElementos();
    case 'mensal':    return getMensal();
    case 'tabela':    return handleTabela(params);
    default:          return null;
  }
}

function handleTabela(params) {
  var aba = params.aba;
  if (aba === 'empenho') return getTabelaEmpenho();
  if (aba === 'geral')   return getTabelaGeral();
  throw new Error('Parâmetro aba inválido: ' + aba);
}
