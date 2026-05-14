// Code.gs — entry point do Web App, router principal com cache

function doGet(e) {
  var params = e.parameter || {};
  var route  = params.route || '';

  if (!route || VALID_ROUTES.indexOf(route) === -1) {
    return errorResponse('rota inválida');
  }

  var cacheKey = 'despesaspmrv__' + route + (params.aba ? '__' + params.aba : '');
  var cache    = CacheService.getScriptCache();
  var cached   = cache.get(cacheKey);

  if (cached) {
    return jsonResponse(JSON.parse(cached));
  }

  try {
    var payload = handleRoute(route, params);
    var json    = JSON.stringify(payload);
    try { cache.put(cacheKey, json, Config.CACHE_TTL); } catch (cacheErr) { /* dados grandes demais para cache */ }
    return jsonResponse(payload);
  } catch (err) {
    return errorResponse(err.message);
  }
}
