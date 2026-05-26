import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from data_store import store

app = FastAPI(title="CapEx Flow Graph API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/graph")
def get_graph(
    category: Optional[str] = Query(None),
    include_etfs: bool = Query(False),
    include_hedge_funds: bool = Query(False),
):
    nodes = []
    tickers = set()

    for ticker, c in store.companies.items():
        if category and c.get("category") != category:
            continue
        tickers.add(ticker)
        nodes.append({
            "id": ticker,
            "type": "companyNode",
            "position": {"x": 0, "y": 0},
            "data": c,
        })

    if include_etfs:
        for ticker, e in store.etfs.items():
            tickers.add(ticker)
            nodes.append({
                "id": ticker,
                "type": "etfNode",
                "position": {"x": 0, "y": 0},
                "data": {
                    "ticker": ticker,
                    "name": e.get("name"),
                    "category": "etf",
                    "sector": e.get("sector"),
                    "totalAssets": e.get("totalAssets"),
                    "ytdReturn": e.get("ytdReturn"),
                },
            })

    if include_hedge_funds:
        for name, hf in store.hedge_funds.items():
            node_id = f"HF_{name.replace(' ', '_')}"
            tickers.add(node_id)
            nodes.append({
                "id": node_id,
                "type": "hedgeFundNode",
                "position": {"x": 0, "y": 0},
                "data": {
                    "name": name,
                    "cik": hf.get("cik"),
                    "filingDate": hf.get("filingDate"),
                    "reportPeriod": hf.get("reportPeriod"),
                    "totalPortfolioValue": hf.get("totalPortfolioValue"),
                    "category": "hedge_fund",
                },
            })

    # Company-to-company and ETF edges
    edges = []
    for r in store.relationships:
        source = r["source"]
        target = r["target"]
        if source not in tickers or target not in tickers:
            continue
        edges.append({
            "id": f"{source}-{target}-{r['relType']}",
            "source": source,
            "target": target,
            "type": "relationshipEdge",
            "data": {
                "relType": r["relType"],
                "amount": r.get("amount"),
                "product": r.get("product"),
                "description": r.get("description"),
                "strategicImportance": r.get("strategicImportance"),
                "dealDate": r.get("dealDate"),
                "dealDuration": r.get("dealDuration"),
                "sourceInfo": r.get("sourceInfo"),
                "annualRecurring": r.get("annualRecurring"),
                "status": r.get("status"),
            },
        })

    # ETF HOLDS_POSITION edges
    if include_etfs:
        for etf_ticker, holdings in store.etf_holdings.items():
            if etf_ticker not in tickers:
                continue
            for h in holdings:
                company_ticker = h.get("ticker")
                if company_ticker in tickers:
                    edges.append({
                        "id": f"{etf_ticker}-{company_ticker}-HOLDS_POSITION",
                        "source": etf_ticker,
                        "target": company_ticker,
                        "type": "relationshipEdge",
                        "data": {
                            "relType": "HOLDS_POSITION",
                            "weight": h.get("weight"),
                            "description": f"{etf_ticker} holds {(h.get('weight', 0) * 100):.1f}%",
                            "strategicImportance": "low",
                        },
                    })

    # Hedge fund HOLDS_POSITION edges
    if include_hedge_funds:
        for fund_name, positions in store.hf_positions.items():
            fund_id = f"HF_{fund_name.replace(' ', '_')}"
            if fund_id not in tickers:
                continue
            for pos in positions:
                ticker = pos.get("ticker")
                if ticker in tickers:
                    shares = pos.get("shares", 0)
                    edges.append({
                        "id": f"{fund_id}-{ticker}-HOLDS_POSITION",
                        "source": fund_id,
                        "target": ticker,
                        "type": "relationshipEdge",
                        "data": {
                            "relType": "HOLDS_POSITION",
                            "amount": pos.get("value"),
                            "shares": shares,
                            "description": f"{fund_name} holds {shares:,} shares",
                            "strategicImportance": "medium",
                            "dealDate": store.hedge_funds[fund_name].get("filingDate"),
                        },
                    })

    return {"nodes": nodes, "edges": edges}


@app.get("/hedge-funds")
def get_hedge_funds():
    funds = []
    for name, hf in store.hedge_funds.items():
        positions = []
        for pos in store.hf_positions.get(name, []):
            company = store.companies.get(pos["ticker"])
            positions.append({
                "ticker": pos["ticker"],
                "companyName": company["name"] if company else pos.get("name"),
                "shares": pos.get("shares"),
                "value": pos.get("value"),
            })
        positions.sort(key=lambda x: x.get("value") or 0, reverse=True)
        funds.append({
            "name": name,
            "cik": hf.get("cik"),
            "filingDate": hf.get("filingDate"),
            "reportPeriod": hf.get("reportPeriod"),
            "totalPortfolioValue": hf.get("totalPortfolioValue"),
            "positions": positions,
        })
    return {"funds": funds}


@app.get("/etf/{ticker}")
def get_etf(ticker: str):
    etf = store.etfs.get(ticker)
    if not etf:
        return {"error": "Not found"}

    raw_holdings = store.etf_holdings.get(ticker, [])
    holdings = []
    for h in raw_holdings:
        company = store.companies.get(h.get("ticker"))
        holdings.append({
            "ticker": h.get("ticker"),
            "name": h.get("name") or (company["name"] if company else ""),
            "category": company["category"] if company else "unknown",
            "marketCap": company["marketCap"] if company else None,
            "revenueGrowth": company["revenueGrowth"] if company else None,
            "weight": h.get("weight", 0),
        })
    holdings.sort(key=lambda x: x["weight"], reverse=True)

    return {"etf": etf, "holdings": holdings}


@app.get("/company/{ticker}")
def get_company(ticker: str):
    company = store.companies.get(ticker)
    if not company:
        return {"error": "Not found"}

    relationships = []
    for r in store.relationships:
        if r["source"] == ticker:
            other = r["target"]
            other_company = store.companies.get(other) or store.etfs.get(other)
            relationships.append({
                "relType": r["relType"],
                "direction": "outgoing",
                "otherTicker": other,
                "otherName": other_company.get("name") if other_company else other,
                "props": {k: v for k, v in r.items() if k not in ("source", "target", "relType")},
            })
        elif r["target"] == ticker:
            other = r["source"]
            other_company = store.companies.get(other) or store.etfs.get(other)
            relationships.append({
                "relType": r["relType"],
                "direction": "incoming",
                "otherTicker": other,
                "otherName": other_company.get("name") if other_company else other,
                "props": {k: v for k, v in r.items() if k not in ("source", "target", "relType")},
            })

    # Also include ETF holdings of this company
    for etf_ticker, holdings in store.etf_holdings.items():
        for h in holdings:
            if h.get("ticker") == ticker:
                etf = store.etfs.get(etf_ticker)
                relationships.append({
                    "relType": "HOLDS_POSITION",
                    "direction": "incoming",
                    "otherTicker": etf_ticker,
                    "otherName": etf["name"] if etf else etf_ticker,
                    "props": {"weight": h.get("weight")},
                })

    return {"company": company, "relationships": relationships}


@app.get("/performance")
def get_performance(period: str = Query("ytd")):
    """Get price return for all companies and ETFs over a time period.
    period: '1d', '5d', '1mo', '6mo', '1y', 'ytd'
    """
    import yfinance as yf

    tickers = store.get_all_tickers()

    yf_period_map = {
        "1d": "2d",
        "5d": "5d",
        "1mo": "1mo",
        "6mo": "6mo",
        "1y": "1y",
        "ytd": "ytd",
    }
    yf_period = yf_period_map.get(period, "6mo")

    results = {}
    batch_size = 20
    for i in range(0, len(tickers), batch_size):
        batch = tickers[i:i + batch_size]
        try:
            data = yf.download(batch, period=yf_period, progress=False, interval="1d")
            if data.empty:
                continue
            close = data["Close"]
            for ticker in batch:
                try:
                    if ticker in close.columns:
                        series = close[ticker].dropna()
                    elif len(batch) == 1:
                        series = close.dropna()
                    else:
                        continue
                    if len(series) < 2:
                        continue
                    start_price = series.iloc[0]
                    end_price = series.iloc[-1]
                    pct_return = (end_price - start_price) / start_price
                    results[ticker] = round(float(pct_return), 5)
                except Exception:
                    continue
        except Exception:
            continue

    return {"period": period, "returns": results}


@app.post("/refresh")
def refresh_data(target: str = Query("all")):
    """Refresh data from external sources and reload in-memory store.
    target: 'all', 'financials', 'etfs', 'hedge_funds'
    """
    import subprocess
    import sys

    results = {}
    python = sys.executable

    if target in ("all", "financials"):
        r = subprocess.run([python, "fetch_financials.py"], capture_output=True, text=True, timeout=120)
        results["financials"] = "ok" if r.returncode == 0 else r.stderr[-200:]

    if target in ("all", "etfs"):
        r = subprocess.run([python, "fetch_etf_holdings.py"], capture_output=True, text=True, timeout=120)
        results["etfs"] = "ok" if r.returncode == 0 else r.stderr[-200:]

    if target in ("all", "hedge_funds"):
        r = subprocess.run([python, "fetch_hedge_funds.py"], capture_output=True, text=True, timeout=300)
        results["hedge_funds"] = "ok" if r.returncode == 0 else r.stderr[-200:]

    # Reload in-memory store from updated files
    store.reload()

    return {"status": "complete", "results": results}


# Serve frontend static files in production
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_dir / "index.html")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
