# CapEx Flow Graph

Interactive graph visualizing capital expenditure flows from Mag 7 companies into the AI ecosystem — chips, memory, infrastructure, energy, cooling, networking, photonics, and AI software.

## Features

- **Graph View** — Interactive node graph (React Flow) with companies, ETFs, and hedge funds
  - Grouped force-directed layout by sector
  - Click a node to focus on its connections
  - Sidebar filters by sector, ETFs, hedge funds
  - Search with Cmd+K
  - Dark mode
- **Growth Tab** — Sector performance rankings with time period selector (1D, 1W, 1M, 6M, 1Y, YTD)
  - ETF contribution breakdown (weight × return per holding)
  - Companies sorted by price return
- **58 companies** across 9 sectors, **8 ETFs**, **6 hedge funds** (13F data), **100 relationships**

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS v4 + React Flow + ELKjs
- **Backend:** FastAPI + yfinance (live price data) + Finnhub (ETF holdings)
- **Data:** In-memory store loaded from JSON seed files (no database required)

## Local Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python api.py  # runs on :8000

# Frontend
cd frontend
npm install
npm run dev  # runs on :5173, proxies /api to :8000
```

## Deployment

Single Docker container — no database needed:

```bash
docker build -t capex-flow-graph .
docker run -p 8000:8000 capex-flow-graph
```

Deployed on Render (free tier). Set `FINNHUB_API_KEY` env var for full ETF holdings.

## Refreshing Data

Click "Refresh Data" in the UI, or:

```bash
cd backend
python fetch_financials.py    # company financials from yfinance
python fetch_etf_holdings.py  # ETF holdings from Finnhub/yfinance
python fetch_hedge_funds.py   # 13F filings from SEC EDGAR
```

## Project Structure

```
backend/
  api.py              — FastAPI endpoints
  data_store.py       — in-memory data store
  fetch_financials.py — yfinance data fetcher
  fetch_etf_holdings.py — ETF holdings fetcher
  fetch_hedge_funds.py  — SEC EDGAR 13F fetcher
  seed_data/          — JSON data files
frontend/
  src/components/     — React components (GraphCanvas, GrowthPanel, etc.)
  src/layout/         — ELKjs layout engine
  src/api/            — API client
  dist/               — pre-built production bundle
```
