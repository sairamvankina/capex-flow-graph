# Data Sources for Capex Flow Graph

## Recommended API Stack (all free tier)

### 1. Financial Modeling Prep (FMP) — Primary
- **Free**: 250 requests/day
- **Covers**: Fundamentals, ETF holdings with weights, earnings calendar, analyst estimates
- **Sign up**: https://financialmodelingprep.com/developer
- **Key env var**: `FMP_API_KEY`

### 2. SEC EDGAR — Hedge Fund 13F Data
- **Free**: Completely free, 10 req/sec
- **Covers**: 13F hedge fund positions, 8-K deal announcements, XBRL financials
- **No key needed**: Just set User-Agent header with contact email
- **Library**: `pip install edgartools`

### 3. Finnhub — Sentiment & News
- **Free**: 60 requests/minute
- **Covers**: Analyst ratings, price targets, company news, earnings surprises, insider trades
- **Sign up**: https://finnhub.io/register
- **Key env var**: `FINNHUB_API_KEY`

### 4. yfinance — Backup/Supplement (already using)
- **Free**: Unofficial, ~2000/hour
- **Covers**: Broad fundamentals, basic ETF holdings, earnings dates

## What Each API Provides

| Requirement | Primary Source | Backup |
|-------------|---------------|--------|
| Market cap, revenue, margins | FMP | yfinance |
| ETF holdings + weights | FMP `/etf-holder/SMH` | yfinance `.get_holdings()` |
| 13F hedge fund positions | SEC EDGAR (edgartools) | — |
| Company news/deals | Finnhub + EDGAR 8-K | — |
| Earnings calendar | FMP + Finnhub | yfinance |
| Analyst sentiment | Finnhub (ratings, targets) | — |
| Macro context | FRED (optional) | — |

## ETFs to Track

| ETF | Sector | Key Holdings |
|-----|--------|-------------|
| SMH | Semiconductors | NVDA, TSM, AVGO, AMD, QCOM |
| SOXX | Semiconductors (broader) | Same + INTC, MU, MRVL |
| QQQ | Tech (Nasdaq 100) | Mag 7 + tech |
| XLK | Technology Select | MSFT, AAPL, NVDA |
| ARKK | Innovation/Disruptive | TSLA, PLTR, various |
| IGV | Software | CRM, PLTR, SNOW |

## Key Hedge Funds to Track (via 13F)

| Fund | CIK | Known For |
|------|-----|-----------|
| Berkshire Hathaway | 0001067983 | Value, AAPL position |
| Bridgewater Associates | 0001350694 | Macro, diversified |
| Renaissance Technologies | 0001037389 | Quant, high turnover |
| Citadel Advisors | 0001423053 | Multi-strategy |
| D.E. Shaw | 0001009207 | Quant + fundamental |
| Tiger Global | 0001167483 | Growth tech |
| Coatue Management | 0001535392 | Tech-focused |
| Druckenmiller (Duquesne) | 0001536411 | Macro + tech |
