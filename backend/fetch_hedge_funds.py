"""
Fetch 13F hedge fund holdings from SEC EDGAR.
Uses edgartools for parsing. No API key needed.

Note: 13F filings are quarterly. Most recent may be 1-2 months old.
"""
import json
from pathlib import Path

try:
    from edgar import Company, set_identity, configure_http
except ImportError:
    print("Install edgartools: pip install edgartools")
    exit(1)

set_identity("CapexFlowGraph research@example.com")
configure_http(use_system_certs=True)

HEDGE_FUNDS = [
    {"name": "Berkshire Hathaway", "cik": "0001067983"},
    {"name": "Bridgewater Associates", "cik": "0001350694"},
    {"name": "Citadel Advisors", "cik": "0001423053"},
    {"name": "Coatue Management", "cik": "0001535392"},
    {"name": "Tiger Global", "cik": "0001167483"},
    {"name": "D1 Capital Partners", "cik": "0001802994"},
]

TARGET_TICKERS = {
    "NVDA", "MSFT", "GOOG", "GOOGL", "AMZN", "META", "AAPL", "TSLA",
    "TSM", "ASML", "ARM", "AMD", "INTC", "AVGO", "QCOM", "MRVL",
    "MU", "DELL", "SMCI", "VRT", "ETN", "ANET", "CIEN", "PLTR",
    "CRM", "SNOW", "CEG", "VST", "CSCO", "JNPR", "INFN", "NNE",
    "OKLO", "NEE", "NRG", "NVT", "MOD", "AI", "PATH", "SYM",
    "CRWD", "PANW", "ORCL", "EQIX", "DLR", "COHR",
}


def fetch_13f_positions():
    results = {}

    for fund in HEDGE_FUNDS:
        print(f"Fetching 13F for {fund['name']}...")
        try:
            company = Company(fund["cik"])
            filings = company.get_filings(form="13F-HR")
            filing = filings.latest(1)

            if not filing:
                print("  No 13F found")
                continue

            thirteenf = filing.obj()
            positions = []

            if hasattr(thirteenf, "infotable"):
                df = thirteenf.infotable
                matches = df[df["Ticker"].isin(TARGET_TICKERS)]
                agg = matches.groupby("Ticker").agg({
                    "Value": "sum",
                    "SharesPrnAmount": "sum",
                    "Issuer": "first",
                }).reset_index()

                for _, row in agg.iterrows():
                    positions.append({
                        "ticker": row["Ticker"],
                        "shares": int(row["SharesPrnAmount"]),
                        "value": int(row["Value"]),
                        "name": row["Issuer"],
                    })

            results[fund["name"]] = {
                "name": fund["name"],
                "cik": fund["cik"],
                "filing_date": str(filing.filing_date),
                "report_period": str(getattr(thirteenf, "report_period", "")),
                "total_portfolio_value": int(thirteenf.total_value) if hasattr(thirteenf, "total_value") else None,
                "positions": sorted(positions, key=lambda x: x["value"], reverse=True),
            }
            print(f"  Found {len(positions)} relevant positions (filing: {filing.filing_date})")

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
