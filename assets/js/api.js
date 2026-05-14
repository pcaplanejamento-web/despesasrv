// api.js — fetch dos dados do Apps Script com cache no localStorage

import { APPS_SCRIPT_URL, CACHE_TTL_MS } from './config.js';

function cacheKey(route, extra = '') {
  return `despesaspmrv__${route}${extra}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // localStorage cheio — ignora silenciosamente
  }
}

// Timeout em ms por rota (rotas pesadas precisam de mais tempo)
const ROUTE_TIMEOUT = { mensal: 120_000, tabela: 120_000 };
const DEFAULT_TIMEOUT = 30_000;

async function fetchRoute(route, params = {}) {
  const key = cacheKey(route, JSON.stringify(params));
  const cached = readCache(key);
  if (cached) return cached;

  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('route', route);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const timeout = ROUTE_TIMEOUT[route] ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let resp;
  try {
    resp = await fetch(url.toString(), { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const json = await resp.json();
  if (json.error) throw new Error(json.error);

  writeCache(key, json);
  return json;
}

export function clearCache() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('despesaspmrv__')) localStorage.removeItem(key);
  }
}

export const api = {
  kpis:      () => fetchRoute('kpis'),
  orgaos:    () => fetchRoute('orgaos'),
  acoes:     () => fetchRoute('acoes'),
  elementos: () => fetchRoute('elementos'),
  mensal:    () => fetchRoute('mensal'),
  empenho:   () => fetchRoute('tabela', { aba: 'empenho' }),
  geral:     () => fetchRoute('tabela', { aba: 'geral' }),
};
