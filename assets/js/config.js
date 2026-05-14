// config.js — URL do Apps Script, constantes globais e utilitários de formatação

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJbvOZt52XnnvgrLBVLO9mCgEiC1t9FgaCxiQuzDqVVPQzRqkAOh9E4dEABYlY664-/exec';

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export const PAGE_SIZE = 50;

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const SECTION_TITLES = {
  painel:    'Painel',
  orgaos:    'Por Orgão',
  acoes:     'Por Ação',
  elementos: 'Por Elemento',
  mensal:    'Evolução Mensal',
  brutos:    'Dados Brutos',
};

export function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(value) {
  const num = Number(value) || 0;
  return (num * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString('pt-BR');
}

export function truncateLabel(str, max = 40) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}
