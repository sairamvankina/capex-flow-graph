"""
In-memory data store loaded from seed JSON files.
Replaces Neo4j for lightweight deployments.
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "seed_data"


def _load_json(filename: str):
    path = DATA_DIR / filename
    if not path.exists():
        return {} if filename.endswith(".json") else []
    with open(path) as f:
        return json.load(f)


class DataStore:
    def __init__(self):
        self.reload()

    def reload(self):
        companies_raw = _load_json("companies.json")
        financials = _load_json("financials_cache.json")
        relationships_raw = _load_json("relationships.json")
        etf_data = _load_json("etf_holdings.json")
        hedge_fund_data = _load_json("hedge_fund_positions.json")

        # Build company nodes
        self.companies = {}
        for c in companies_raw:
            ticker = c["ticker"]
            fin = financials.get(ticker, {})
            self.companies[ticker] = {
                "ticker": ticker,
                "name": c.get("name"),
                "category": c.get("category"),
                "marketCap": fin.get("market_cap"),
                "revenue": fin.get("revenue"),
                "revenueGrowth": fin.get("revenue_growth"),
                "eps": fin.get("eps"),
                "peRatio": fin.get("pe_ratio"),
                "grossMargin": fin.get("gross_margin"),
                "operatingMargin": fin.get("operating_margin"),
                "netMargin": fin.get("net_margin"),
                "pickAndShovel": c.get("pick_and_shovel", False),
                "competitiveMoat": c.get("competitive_moat", "moderate"),
                "sentiment": c.get("sentiment", "neutral"),
                "revenueBreakdown": c.get("revenue_breakdown"),
            }

        # Build relationships
        self.relationships = []
        for r in relationships_raw:
            self.relationships.append({
                "source": r["source"],
                "target": r["target"],
                "relType": r["rel_type"],
                "amount": r.get("amount"),
                "product": r.get("product"),
                "description": r.get("description"),
                "strategicImportance": r.get("strategic_importance", "medium"),
                "dealDate": r.get("deal_date"),
                "dealDuration": r.get("deal_duration"),
                "sourceInfo": r.get("source_info"),
                "annualRecurring": r.get("annual_recurring", False),
                "status": r.get("status"),
            })

        # Build ETF nodes
        self.etfs = {}
        self.etf_holdings = {}  # ticker -> [{ticker, name, weight}]
        for ticker, etf in etf_data.items():
            self.etfs[ticker] = {
                "ticker": ticker,
                "name": etf.get("name"),
                "sector": etf.get("sector"),
                "totalAssets": etf.get("total_assets"),
                "ytdReturn": etf.get("ytd_return"),
            }
            self.etf_holdings[ticker] = etf.get("holdings", [])

        # Build hedge fund nodes
        self.hedge_funds = {}
        self.hf_positions = {}  # fund_name -> [positions]
        for name, fund in hedge_fund_data.items():
            self.hedge_funds[name] = {
                "name": name,
                "cik": fund.get("cik"),
                "filingDate": fund.get("filing_date"),
                "reportPeriod": fund.get("report_period"),
                "totalPortfolioValue": fund.get("total_portfolio_value"),
            }
            self.hf_positions[name] = fund.get("positions", [])

    def get_all_tickers(self) -> list[str]:
        return list(self.companies.keys()) + list(self.etfs.keys())


store = DataStore()
