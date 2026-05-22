"""
Fetch 13F hedge fund holdings from SEC EDGAR.
Uses edgartools for parsing. No API key needed.

Note: 13F filings are quarterly. Most recent may be 1-2 months old.
"""
import json
from pathlib import Path

try:
    from edgar import Company, set_identity
except ImportError:
    print("Install edgartools: pip install edgartools")
    exit(1)

set_identity("CapexFlowGraph research@example.com")

HEDGE_FUNDS = [
    {"name": "Berkshire Hathaway", "cik": "0001067983"},
    {"name": "Bridgewater Associates", "cik": "0001350694"},
    {"name": "Citadel Advisors", "cik": "0001423053"},
    {"name": "Coatue Management", "cik": "0001535392"},
]

TARGET_TICKERS = {
    "NVDA", "MSFT", "GOOG", "GOOGL", "AMZN", "META", "AAPL", "TSLA",
    "TSM", "ASML", "ARM", "AMD", "INTC", "AVGO", "QCOM", "MRVL",
    "MU", "DELL", "SMCI", "VRT", "ETN", "ANET", "CIEN", "PLTR",
    "CRM", "SNOW", "CEG", "VST",
}


def fetch_13f_positions():
    results = {}

    for fund in HEDGE_FUNDS:
        print(f"Fetching 13F for {fund['name']}...")
        try:
            company = Company(fund["cik"])
            filings = company.get_filings(form="13F-HR")
            latest = filings.latest(1)

            if not latest:
                print(f"  No 13F found")
                continue

            filing = latest[0]
            positions = []

            # Parse the 13F infotable
            thirteenf = filing.obj()
            if hasattr(thirteenf, "infotable"):
                for holding in thirteenf.infotable:
                    ticker = getattr(holding, "ticker", None)
                    if ticker and ticker in TARGET_TICKERS:
                        positions.append({
                            "ticker": ticker,
                            "shares": getattr(holding, "shares", 0),
                            "value": getattr(holding, "value", 0),
                            "name": getattr(holding, "name", ""),
                        })

            results[fund["name"]] = {
                "name": fund["name"],
                "cik": fund["cik"],
                "filing_date": str(getattr(filing, "filing_date", "")),
                "positions": positions,
            }
            print(f"  Found {len(positions)} relevant positions")

        except Exception as e:
            print(f"  Error: {e}")
            results[fund["name"]] = {
                "name": fund["name"],
                "cik": fund["cik"],
                "positions": [],
                "error": str(e),
            }

    output = Path(__file__).parent / "seed_data/hedge_fund_positions.json"
    with open(output, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved to {output}")
    return results


if __name__ == "__main__":
    fetch_13f_positions()
