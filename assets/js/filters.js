// filters.js — filtros globais e estado de seção ativa (reservado para expansão futura)

// Atualmente o sistema não possui filtros globais cross-seção,
// mas este módulo centraliza a lógica caso sejam adicionados.

export const activeFilters = {
  orgao:    null,
  periodo:  null,
  elemento: null,
};

export function resetFilters() {
  activeFilters.orgao    = null;
  activeFilters.periodo  = null;
  activeFilters.elemento = null;
}
