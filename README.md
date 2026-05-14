# Despesas PMRV

Sistema web estático para visualização de despesas municipais de Rio Verde/GO, desenvolvido para a Prefeitura Municipal de Rio Verde (PMRV) pela equipe PCA Planejamento.

Hospedado no GitHub Pages sob `pcaplanejamento-web/despesaspmrv`.

---

## Funcionalidades

- **Painel** — KPIs globais (empenhado, liquidado, pago, anulado, retido) e gráficos mensais
- **Por Órgão** — demonstrativo agregado por órgão com gráfico e tabela
- **Por Ação** — demonstrativo agregado por ação orçamentária
- **Por Elemento** — demonstrativo agregado por elemento de despesa
- **Evolução Mensal** — progressão acumulada e percentual mês a mês
- **Dados Brutos** — tabelas paginadas de empenhos e liquidações/pagamentos com busca e exportação CSV

---

## Fonte de dados

Planilha Google Sheets ID: `1GZd17iPKctLvQ8fHRLB0FJ1u1G3gQYpPCNBZlzV6OaE`

Abas utilizadas:
- `EMPENHODADOS` — dados de empenho
- `GERALDADOS` — dados de liquidação e pagamento

---

## Como publicar o Apps Script

1. Acesse [script.google.com](https://script.google.com) e crie um novo projeto.
2. Copie o conteúdo dos arquivos da pasta `appsscript/` para o editor, criando um arquivo `.gs` para cada um:
   - `Config.gs`
   - `Utils.gs`
   - `DataService.gs`
   - `Endpoints.gs`
   - `Code.gs`
3. Salve o projeto.
4. Clique em **Implantar > Nova implantação**.
5. Em "Tipo", selecione **Aplicativo da Web**.
6. Configure:
   - **Executar como:** Eu (sua conta Google)
   - **Quem tem acesso:** Qualquer pessoa
7. Clique em **Implantar** e copie a URL gerada (formato `https://script.google.com/macros/s/.../exec`).

---

## Como configurar a URL no frontend

Abra o arquivo `assets/js/config.js` e substitua o valor de `APPS_SCRIPT_URL`:

```js
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/SEU_ID_AQUI/exec';
```

---

## Como hospedar no GitHub Pages

1. Faça push do repositório para o GitHub em `pcaplanejamento-web/despesaspmrv`.
2. Acesse **Settings > Pages** no repositório.
3. Em "Source", selecione a branch `main` e pasta `/ (root)`.
4. Salve. O site estará disponível em `https://pcaplanejamento-web.github.io/despesaspmrv/`.

> O sistema funciona com cache local (localStorage, TTL 5 minutos). Em caso de erro na API, os dados em cache continuam sendo exibidos.

---

## Estrutura de arquivos

```
despesaspmrv/
├── index.html
├── README.md
├── assets/
│   ├── css/
│   │   ├── main.css          # variáveis, reset, tipografia
│   │   ├── layout.css        # grid, sidebar, header
│   │   ├── components.css    # cards KPI, tabelas, badges
│   │   └── charts.css        # dimensionamento dos gráficos
│   ├── js/
│   │   ├── config.js         # URL do Apps Script, constantes, formatadores
│   │   ├── api.js            # fetch + cache localStorage
│   │   ├── kpis.js           # renderização dos cards KPI
│   │   ├── charts.js         # todos os gráficos Chart.js
│   │   ├── tables.js         # tabelas com paginação, busca, ordenação e CSV
│   │   ├── filters.js        # filtros globais (extensível)
│   │   └── main.js           # bootstrap, roteamento entre seções
│   └── img/
│       └── logo.svg
└── appsscript/
    ├── Code.gs               # entry point / router
    ├── Config.gs             # IDs da planilha, nomes das abas
    ├── DataService.gs        # leitura e agregação dos dados
    ├── Endpoints.gs          # handlers por rota
    └── Utils.gs              # parseNum, parseDate, sumIf, formatDateStr
```

---

## Rotas da API (Apps Script)

| Rota | Parâmetro extra | Retorno |
|------|-----------------|---------|
| `?route=kpis` | — | KPIs globais |
| `?route=orgaos` | — | Demonstrativo por órgão |
| `?route=acoes` | — | Demonstrativo por ação |
| `?route=elementos` | — | Demonstrativo por elemento |
| `?route=mensal` | — | Mensal simples + acumulado + percentual |
| `?route=tabela&aba=empenho` | `aba=empenho` | Linhas de EMPENHODADOS |
| `?route=tabela&aba=geral` | `aba=geral` | Linhas de GERALDADOS |

Rota inválida retorna `{"error": "rota inválida"}`.
