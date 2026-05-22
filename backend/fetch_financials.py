import json
import time
from pathlib import Path

import yfinance as yf


def fetch_company_financials(ticker: str) -> dict:
    stock = yf.Ticker(ticker)
    info = stock.info

    return {
        "ticker": ticker,
        "market_cap": info.get("marketCap"),
        "revenue": info.get("totalRevenue"),
        "revenue_growth": info.get("revenueGrowth"),
        "eps": info.get("trailingEps"),
        "pe_ratio": info.get("trailingPE"),
        "gross_margin": info.get("grossMargins"),
        "operating_margin": info.get("operatingMargins"),
        "net_margin": info.get("profitMargins"),
    }


def fetch_all(companies_path: str = "seed_data/companies.json") -> dict:
    with open(companies_path) as f:
        companies = json.load(f)

    financials = {}
    for company in companies:
        ticker = company["ticker"]
        print(f"Fetching {ticker}...")
        try:
            data = fetch_company_financials(ticker)
            financials[ticker] = data
            print(f"  Market cap: {data.get('market_cap')}")
        except Exception as e:
            print(f"  Error fetching {ticker}: {e}")
            financials[ticker] = {"ticker": ticker}
        time.sleep(0.5)

    output_path = Path("seed_data/financials_cache.json")
    with open(output_path, "w") as f:
        json.dump(financials, f, indent=2)
    print(f"\nSaved to {output_path}")
    return financials


if __name__ == "__main__":
    fetch_all()
