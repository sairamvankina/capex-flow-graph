# CapEx Flow Graph — Project Context & Research

## Overview

Interactive graph visualizing capital expenditure flows from Mag 7 companies into the AI ecosystem. Each company is a node with rich financial data (earnings, margins, market cap, growth, sentiment). Edges represent investments, deals, partnerships, and supply chain relationships.

**Live stack:** React Flow + ELKjs (frontend) | Neo4j (graph DB) | FastAPI (API) | yfinance + Finnhub + SEC EDGAR (data sources)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (Vite + React + TypeScript + Tailwind v4)                  │
│  ├── React Flow (XYFlow) — custom nodes, edges, minimap             │
│  ├── ELKjs — grouped force-directed layout by sector                │
│  ├── Tabs: Graph view | Growth rankings                             │
│  └── Dark mode, Cmd+K search, sidebar filters                      │
├─────────────────────────────────────────────────────────────────────┤
│  Backend (FastAPI on port 8000)                                      │
│  ├── GET /graph?category=&include_etfs=&include_hedge_funds=        │
│  ├── GET /company/{ticker}  — full detail + relationships           │
│  ├── GET /etf/{ticker}      — ETF metadata + holdings               │
│  ├── GET /hedge-funds       — all funds with positions              │
│  └── POST /refresh?target=  — re-fetch and re-seed                  │
├─────────────────────────────────────────────────────────────────────┤
│  Neo4j (port 7474/7687)                                              │
│  ├── :Company nodes (58)                                             │
│  ├── :ETF nodes (8)                                                  │
│  ├── :HedgeFund nodes (6)                                            │
│  └── Relationships: INVESTS_IN, SUPPLIES, CUSTOMER_OF,              │
│      PARTNERS_WITH, ACQUIRED, HOLDS_POSITION                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### 1. Financial Data — yfinance (Python)

**What it provides:** Market cap, revenue, revenue growth (YoY TTM), EPS, P/E ratio, gross/operating/net margins, sector, industry.

**Usage:** `backend/fetch_financials.py` pulls data for all 58 companies and caches to `seed_data/financials_cache.json`.

**Limits:** No official rate limit, but aggressive polling may get throttled. Data is delayed (not real-time).

**Install:** `pip install yfinance`

---

### 2. ETF Holdings Data

#### Primary: Finnhub API

- **URL:** https://finnhub.io
- **Free tier:** 60 API calls/minute, no daily cap
- **What it provides:**
  - Full ETF holdings (all constituents with weights) via `etfs_holdings(ticker)`
  - ETF profile (expense ratio, inception date, description) via `etfs_profile(ticker)`
  - Sector exposure breakdown via `etfs_sector_exposure(ticker)`
- **Auth:** API key in `.env` as `FINNHUB_API_KEY`
- **Install:** `pip install finnhub-python`
- **Quality:** Excellent for large ETFs (SMH, QQQ, SOXX). Some niche ETFs may have stale data.

#### Fallback: yfinance

- **What it provides:** Top 10 holdings only (via `Ticker(etf).funds_data.top_holdings`)
- **Limits:** Only top 10, no full constituent list
- **When used:** When Finnhub key is not set or Finnhub returns no data

#### Other ETF APIs Researched (not currently used)

| API | Free Tier | Holdings? | Notes |
|-----|-----------|-----------|-------|
| **SEC EDGAR N-PORT** | Unlimited | Full quarterly | Raw XML, use `edgartools` to parse. Most complete but quarterly lag. |
| **Alpha Vantage** | 25 calls/day | ETF profiles only | Good fundamentals, but tight daily limit for free tier. |
| **Financial Modeling Prep (FMP)** | 250 calls/day | Full holdings | Was generous, now tightening free tier. May require paid plan. |
| **Twelve Data** | Limited free | Holdings (paid) | Price data free, fundamentals/holdings require paid plan. |
| **Polygon.io** | 5 calls/min | Price only | No holdings data on free tier. |
| **IEX Cloud** | No free tier | N/A | Shut down free tier in 2023. |
| **ETF.com / ETFdb.com** | Scraping only | Full holdings | No official API. Data is on web pages. |

#### Recommendation for full holdings without paying:

1. **Finnhub** (real-time, 60/min) — best for live use
2. **SEC N-PORT filings** via edgartools — best for quarterly completeness (all holdings, exact shares)
3. **yfinance** — acceptable fallback for top-10 quick view

---

### 3. Hedge Fund 13F Data — SEC EDGAR

**Source:** SEC EDGAR 13F-HR filings (quarterly, ~45 days after quarter end)

**Library:** `edgartools` (Python)
- **Install:** `pip install edgartools`
- **Auth:** No API key needed; set identity string for SEC rate limiting
- **SSL fix required on macOS:** `configure_http(use_system_certs=True)`

**How it works:**
```python
from edgar import Company, set_identity, configure_http
set_identity("YourApp your@email.com")
configure_http(use_system_certs=True)

company = Company("0001067983")  # CIK number
filings = company.get_filings(form="13F-HR")
filing = filings.latest(1)  # Returns single EntityFiling (not a list)
thirteenf = filing.obj()

# infotable is a pandas DataFrame with columns:
# Ticker, Issuer, Value, SharesPrnAmount, ...
df = thirteenf.infotable
```

**Key gotchas (edgartools v5.x):**
- `filings.latest(1)` returns a single `EntityFiling` object, not a list — do NOT index with `[0]`
- `thirteenf.infotable` is a pandas DataFrame, not an iterable of objects
- Use `df.groupby("Ticker").agg(...)` for aggregation
- `thirteenf.total_value` gives total portfolio value

**Current hedge funds tracked (6):**

| Fund | CIK |
|------|-----|
| Berkshire Hathaway | 0001067983 |
| Bridgewater Associates | 0001350694 |
| Citadel Advisors | 0001423053 |
| Coatue Management | 0001535392 |
| Tiger Global | 0001167483 |
| D1 Capital Partners | 0001802994 |

**Limitations:** 13F filings are quarterly and delayed ~45 days. Only covers long equity positions > $100M AUM. Does not include short positions, options strategies, or private investments.

---

### 4. Relationship Data — Manual Curation

Stored in `backend/seed_data/relationships.json` (100 relationships).

**Relationship types:**
- `INVESTS_IN` — direct capital investment (amount, date, description)
- `SUPPLIES` — supply chain (product, strategic importance)
- `CUSTOMER_OF` — revenue relationship (annual spend, product)
- `PARTNERS_WITH` — strategic partnership
- `ACQUIRED` — acquisition (amount, date, status)

**Sources for manual curation:** Press releases, 10-K filings, earnings calls, news articles. Each relationship includes `sourceInfo` field for provenance.

---

## Data Model (Neo4j)

### Nodes

**:Company** — 58 nodes across 9 categories
```
{ticker, name, category, marketCap, revenue, revenueGrowth, eps, peRatio,
 grossMargin, operatingMargin, netMargin, pickAndShovel, competitiveMoat,
 sentiment, revenueBreakdown}
```

**:ETF** — 8 nodes
```
{ticker, name, sector, totalAssets, ytdReturn}
```

**:HedgeFund** — 6 nodes
```
{name, cik, filingDate, reportPeriod, totalPortfolioValue}
```

### Relationships

```
(:Company)-[:INVESTS_IN {amount, description, strategicImportance, dealDate}]->(:Company)
(:Company)-[:SUPPLIES {product, strategicImportance}]->(:Company)
(:Company)-[:CUSTOMER_OF {annualRecurring, product}]->(:Company)
(:Company)-[:PARTNERS_WITH {description}]->(:Company)
(:Company)-[:ACQUIRED {amount, dealDate, status}]->(:Company)
(:ETF)-[:HOLDS_POSITION {weight}]->(:Company)
(:HedgeFund)-[:HOLDS_POSITION {shares, value, filingDate}]->(:Company)
```

---

## Categories (Sectors)

| Category | Color | Companies |
|----------|-------|-----------|
| mag7 | #6366f1 (indigo) | MSFT, GOOG, AMZN, META, AAPL, TSLA |
| chips | #10b981 (emerald) | NVDA, TSM, ASML, ARM, AMD, INTC, AVGO, QCOM, MRVL |
| ai_software | #8b5cf6 (violet) | PLTR, CRM, SNOW, XAI, ANTHR, AI, DBRX, PATH, HUBS, SYM, FIGR, CRWD, PANW, MSFT-AI |
| infra | #f59e0b (amber) | DELL, SMCI, NBIS, CRWV, ORCL, EQIX, DLR, LMBD, TGAI |
| energy | #ef4444 (red) | ETN, VST, CEG, NNE, OKLO, NEE, NRG |
| cooling | #06b6d4 (cyan) | VRT, SBGSF, NVT, MOD |
| networking | #3b82f6 (blue) | ANET, CSCO, JNPR |
| photonics | #f97316 (orange) | CIEN, COHR, INFN |
| memory | #ec4899 (pink) | MU, 000660.KS (SK Hynix), 005930.KS (Samsung) |

---

## ETFs Tracked

| Ticker | Name | Sector | Linked Categories |
|--------|------|--------|-------------------|
| SMH | VanEck Semiconductor ETF | Semiconductors | chips, memory, networking, photonics |
| SOXX | iShares Semiconductor ETF | Semiconductors | chips |
| QQQ | Invesco QQQ (Nasdaq 100) | Technology | ai_software, mag7, infra |
| XLK | Technology Select SPDR | Technology | mag7 |
| IGV | iShares Expanded Tech-Software | Software | ai_software |
| DRAM | Roundhill Memory ETF | Memory/DRAM | memory |
| SOXL | Direxion 3x Semiconductor Bull | Semiconductors (Leveraged) | chips |
| PSI | Invesco Semiconductors ETF | Semiconductors | chips |

---

## Frontend Layout System

Uses ELKjs with a grouped force-directed approach:
1. Nodes are grouped by category into ELK "child graphs"
2. Each group is laid out internally (force or layered)
3. Groups themselves are arranged using inter-group force layout
4. Result: companies in same sector cluster together (Obsidian-like)

**Layout modes available:** force (default), layered, radial

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/graph` | All nodes + edges in React Flow format. Params: `category`, `include_etfs`, `include_hedge_funds` |
| GET | `/company/{ticker}` | Full company detail + all relationships |
| GET | `/etf/{ticker}` | ETF metadata + holdings with weight, marketCap, revenueGrowth per holding |
| GET | `/hedge-funds` | All hedge funds with their positions |
| POST | `/refresh?target=` | Re-fetch data from sources and re-seed Neo4j. Targets: `all`, `financials`, `etfs`, `hedge_funds` |

---

## Key Implementation Decisions

1. **Neo4j over SQL** — graph queries (multi-hop relationships, path traversal) are natural in Cypher; would be painful JOIN chains in SQL.

2. **React Flow over D3** — built-in node/edge management, pan/zoom, minimap, handles. Less custom code for interactive graph.

3. **ELKjs over dagre** — supports compound/grouped nodes, multiple layout algorithms, better for clustered visualization.

4. **Finnhub + yfinance hybrid** — Finnhub gives full ETF holdings (critical for accurate weight %), yfinance fills gaps (AUM, YTD return) and serves as fallback.

5. **edgartools for 13F** — cleaner API than raw SEC EDGAR HTTP + XML parsing. Handles filing discovery, parsing, and DataFrame conversion.

6. **Subprocess-based refresh** — `/refresh` endpoint runs fetch scripts as subprocesses. Isolation means a crash in one fetcher doesn't take down the API.

7. **Component remounting via key prop** — after refresh, incrementing `refreshKey` forces React Flow and GrowthPanel to unmount/remount, ensuring fresh data fetch.

---

## Environment Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add FINNHUB_API_KEY if available

# Neo4j (Docker or local)
docker-compose up -d
# OR: brew install neo4j && neo4j start

# Seed data
python fetch_financials.py
python seed_neo4j.py
python fetch_etf_holdings.py
python seed_etfs.py
python fetch_hedge_funds.py
python seed_hedge_funds.py

# Start API
python api.py  # runs on :8000

# Frontend
cd frontend
npm install
npm run dev  # runs on :5173
```

**Required .env variables:**
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
FINNHUB_API_KEY=<optional, enables full ETF holdings>
```

---

## Future Work (from requirements)

- Monthly change tracking (what moved and why)
- Market share and bottleneck analysis (who has pricing leverage)
- Additional sectors: Physical AI, Space, Defence, Aeronautics, Quantum
- Last 6 months growth per sector
- Earnings calendar integration
- News/event feed (deals, investments, revenue changes)
- Revenue breakdown visualization (e.g., Google: Ads, Cloud, Waymo, DeepMind)
- Multi-hop capex chain (NVDA → Nebius → downstream companies)
- Company search by name or ticker with auto-complete

---

## Free Data API Research Summary

### Best Free APIs for This Use Case

| Need | Best Free Option | Backup |
|------|-----------------|--------|
| Company financials | yfinance | Alpha Vantage (25/day) |
| ETF full holdings | Finnhub (60/min) | SEC N-PORT via edgartools |
| ETF metadata | yfinance + Finnhub | FMP (250/day) |
| Hedge fund positions | SEC EDGAR 13F via edgartools | — |
| Stock prices | yfinance | Polygon (5/min) |
| News/sentiment | Finnhub news endpoint | NewsAPI (100/day) |
| Earnings dates | yfinance `.calendar` | Finnhub earnings |

### APIs NOT Recommended for Free Use

- **IEX Cloud** — no free tier since 2023
- **Bloomberg/Refinitiv** — enterprise only ($$$)
- **Twelve Data** — holdings require paid plan
- **Quandl** — acquired by Nasdaq, mostly paid now
- **Polygon.io** — free tier too restrictive (5 calls/min, no fundamentals)

### SEC EDGAR Direct (No Library)

If edgartools becomes unavailable, raw SEC EDGAR access:
- Base URL: `https://efts.sec.gov/LATEST/search-index?q=...`
- Full-text search: `https://efts.sec.gov/LATEST/search-index?q="13F"&dateRange=custom&startdt=2024-01-01`
- Filing index: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik}&type=13F-HR`
- Rate limit: 10 requests/second, must include User-Agent header with contact email

---

## Git & Deployment

- **Remote:** `github.com-personal:sairamvankina/capex-flow-graph` (SSH with `~/.ssh/personal_github`)
- **SSH config host:** `github.com-personal`
- **Branch:** `main`
- **Not tracked in git:** `.claude/` directory, `.env`, `node_modules/`, `__pycache__/`, Neo4j data volumes
