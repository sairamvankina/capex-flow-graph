from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase

from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

app = FastAPI(title="CapEx Flow Graph API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@app.on_event("shutdown")
def shutdown():
    driver.close()


@app.get("/graph")
def get_graph(
    category: Optional[str] = Query(None),
    include_etfs: bool = Query(False),
    include_hedge_funds: bool = Query(False),
):
    with driver.session() as session:
        if category:
            node_result = session.run(
                "MATCH (c:Company) WHERE c.category = $category RETURN c",
                category=category,
            )
        else:
            node_result = session.run("MATCH (c:Company) RETURN c")

        nodes = []
        tickers = set()
        for record in node_result:
            c = record["c"]
            ticker = c["ticker"]
            tickers.add(ticker)
            nodes.append({
                "id": ticker,
                "type": "companyNode",
                "position": {"x": 0, "y": 0},
                "data": {
                    "ticker": ticker,
                    "name": c.get("name"),
                    "category": c.get("category"),
                    "marketCap": c.get("marketCap"),
                    "revenue": c.get("revenue"),
                    "revenueGrowth": c.get("revenueGrowth"),
                    "eps": c.get("eps"),
                    "peRatio": c.get("peRatio"),
                    "grossMargin": c.get("grossMargin"),
                    "operatingMargin": c.get("operatingMargin"),
                    "netMargin": c.get("netMargin"),
                    "pickAndShovel": c.get("pickAndShovel"),
                    "competitiveMoat": c.get("competitiveMoat"),
                    "sentiment": c.get("sentiment"),
                    "revenueBreakdown": c.get("revenueBreakdown"),
                },
            })

        # Include ETF nodes if requested
        if include_etfs:
            etf_result = session.run("MATCH (e:ETF) RETURN e")
            for record in etf_result:
                e = record["e"]
                ticker = e["ticker"]
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
            hf_result = session.run("MATCH (h:HedgeFund) RETURN h")
            for record in hf_result:
                h = record["h"]
                name = h["name"]
                node_id = f"HF_{name.replace(' ', '_')}"
                tickers.add(node_id)
                nodes.append({
                    "id": node_id,
                    "type": "hedgeFundNode",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "name": name,
                        "cik": h.get("cik"),
                        "filingDate": h.get("filingDate"),
                        "reportPeriod": h.get("reportPeriod"),
                        "totalPortfolioValue": h.get("totalPortfolioValue"),
                        "category": "hedge_fund",
                    },
                })

        edge_result = session.run("""
            MATCH (a)-[r]->(b)
            WHERE (a:Company OR a:ETF) AND (b:Company OR b:ETF)
            RETURN a.ticker AS source, b.ticker AS target,
                   type(r) AS relType, properties(r) AS props
        """)

        edges = []
        for record in edge_result:
            source = record["source"]
            target = record["target"]
            if source not in tickers or target not in tickers:
                continue
            rel_type = record["relType"]
            props = record["props"]
            edges.append({
                "id": f"{source}-{target}-{rel_type}",
                "source": source,
                "target": target,
                "type": "relationshipEdge",
                "data": {
                    "relType": rel_type,
                    "amount": props.get("amount"),
                    "product": props.get("product"),
                    "description": props.get("description"),
                    "strategicImportance": props.get("strategicImportance"),
                    "dealDate": props.get("dealDate"),
                    "dealDuration": props.get("dealDuration"),
                    "sourceInfo": props.get("sourceInfo"),
                    "annualRecurring": props.get("annualRecurring"),
                    "status": props.get("status"),
                    "weight": props.get("weight"),
                },
            })

        if include_hedge_funds:
            hf_edge_result = session.run("""
                MATCH (h:HedgeFund)-[r:HOLDS_POSITION]->(c:Company)
                RETURN h.name AS fundName, c.ticker AS ticker,
                       r.shares AS shares, r.value AS value, r.filingDate AS filingDate
            """)
            for record in hf_edge_result:
                fund_id = f"HF_{record['fundName'].replace(' ', '_')}"
                ticker = record["ticker"]
                if fund_id in tickers and ticker in tickers:
                    edges.append({
                        "id": f"{fund_id}-{ticker}-HOLDS_POSITION",
                        "source": fund_id,
                        "target": ticker,
                        "type": "relationshipEdge",
                        "data": {
                            "relType": "HOLDS_POSITION",
                            "amount": record["value"],
                            "shares": record["shares"],
                            "description": f"{record['fundName']} holds {record['shares']:,} shares",
                            "strategicImportance": "medium",
                            "dealDate": record["filingDate"],
                        },
                    })

    return {"nodes": nodes, "edges": edges}


@app.get("/hedge-funds")
def get_hedge_funds():
    with driver.session() as session:
        result = session.run("""
            MATCH (h:HedgeFund)-[r:HOLDS_POSITION]->(c:Company)
            RETURN h.name AS fundName, h.cik AS cik,
                   h.filingDate AS filingDate, h.reportPeriod AS reportPeriod,
                   h.totalPortfolioValue AS totalValue,
                   c.ticker AS ticker, c.name AS companyName,
                   r.shares AS shares, r.value AS value
            ORDER BY h.name, r.value DESC
        """)

        funds = {}
        for record in result:
            name = record["fundName"]
            if name not in funds:
                funds[name] = {
                    "name": name,
                    "cik": record["cik"],
                    "filingDate": record["filingDate"],
                    "reportPeriod": record["reportPeriod"],
                    "totalPortfolioValue": record["totalValue"],
                    "positions": [],
                }
            funds[name]["positions"].append({
                "ticker": record["ticker"],
                "companyName": record["companyName"],
                "shares": record["shares"],
                "value": record["value"],
            })

    return {"funds": list(funds.values())}


@app.get("/etf/{ticker}")
def get_etf(ticker: str):
    with driver.session() as session:
        result = session.run(
            "MATCH (e:ETF {ticker: $ticker}) RETURN e", ticker=ticker
        )
        record = result.single()
        if not record:
            return {"error": "Not found"}

        e = record["e"]

        holdings_result = session.run("""
            MATCH (e:ETF {ticker: $ticker})-[r:HOLDS_POSITION]->(c:Company)
            RETURN c.ticker AS ticker, c.name AS name, c.category AS category,
                   c.marketCap AS marketCap, c.revenueGrowth AS revenueGrowth,
                   r.weight AS weight
            ORDER BY r.weight DESC
        """, ticker=ticker)

        holdings = []
        for h in holdings_result:
            holdings.append({
                "ticker": h["ticker"],
                "name": h["name"],
                "category": h["category"],
                "marketCap": h["marketCap"],
                "revenueGrowth": h["revenueGrowth"],
                "weight": h["weight"],
            })

        return {
            "etf": dict(e),
            "holdings": holdings,
        }


@app.get("/company/{ticker}")
def get_company(ticker: str):
    with driver.session() as session:
        result = session.run(
            "MATCH (c:Company {ticker: $ticker}) RETURN c", ticker=ticker
        )
        record = result.single()
        if not record:
            return {"error": "Not found"}

        c = record["c"]

        rels_result = session.run("""
            MATCH (c:Company {ticker: $ticker})-[r]-(other)
            WHERE other:Company OR other:ETF
            RETURN type(r) AS relType, properties(r) AS props,
                   other.ticker AS otherTicker, other.name AS otherName,
                   startNode(r).ticker AS from
        """, ticker=ticker)

        relationships = []
        for rel in rels_result:
            relationships.append({
                "relType": rel["relType"],
                "direction": "outgoing" if rel["from"] == ticker else "incoming",
                "otherTicker": rel["otherTicker"],
                "otherName": rel["otherName"],
                "props": dict(rel["props"]),
            })

        return {
            "company": dict(c),
            "relationships": relationships,
        }


@app.get("/performance")
def get_performance(period: str = Query("ytd")):
    """Get price return for all companies and ETFs over a time period.
    period: '1d', '5d', '1mo', '6mo', '1y', 'ytd'

    Uses yfinance's native period parameter which correctly handles
    trading days. '1d' means last trading day's intraday change.
    """
    import yfinance as yf

    with driver.session() as session:
        company_result = session.run("MATCH (c:Company) RETURN c.ticker AS ticker")
        etf_result = session.run("MATCH (e:ETF) RETURN e.ticker AS ticker")
        tickers = [r["ticker"] for r in company_result] + [r["ticker"] for r in etf_result]

    # For 1d, use "2d" period to get yesterday close + today close
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
    """Refresh data from external sources and re-seed Neo4j.
    target: 'all', 'financials', 'etfs', 'hedge_funds'
    """
    import subprocess
    import sys

    results = {}
    python = sys.executable

    if target in ("all", "financials"):
        r = subprocess.run([python, "fetch_financials.py"], capture_output=True, text=True, timeout=120)
        results["financials"] = "ok" if r.returncode == 0 else r.stderr[-200:]
        if r.returncode == 0:
            subprocess.run([python, "seed_neo4j.py"], capture_output=True, text=True, timeout=30)

    if target in ("all", "etfs"):
        r = subprocess.run([python, "fetch_etf_holdings.py"], capture_output=True, text=True, timeout=120)
        results["etfs"] = "ok" if r.returncode == 0 else r.stderr[-200:]
        if r.returncode == 0:
            subprocess.run([python, "seed_etfs.py"], capture_output=True, text=True, timeout=30)

    if target in ("all", "hedge_funds"):
        r = subprocess.run([python, "fetch_hedge_funds.py"], capture_output=True, text=True, timeout=300)
        results["hedge_funds"] = "ok" if r.returncode == 0 else r.stderr[-200:]
        if r.returncode == 0:
            subprocess.run([python, "seed_hedge_funds.py"], capture_output=True, text=True, timeout=30)

    return {"status": "complete", "results": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
