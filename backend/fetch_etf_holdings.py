import json
import time
from pathlib import Path

import yfinance as yf


ETFS = [
    {"ticker": "SMH", "name": "VanEck Semiconductor ETF", "sector": "Semiconductors"},
    {"ticker": "SOXX", "name": "iShares Semiconductor ETF", "sector": "Semiconductors"},
    {"ticker": "QQQ", "name": "Invesco QQQ (Nasdaq 100)", "sector": "Technology"},
    {"ticker": "XLK", "name": "Technology Select SPDR", "sector": "Technology"},
    {"ticker": "IGV", "name": "iShares Expanded Tech-Software", "sector": "Software"},
]


def fetch_etf_data():
    results = {}

    for etf in ETFS:
        ticker = etf["ticker"]
        print(f"Fetching {ticker}...")
        try:
            t = yf.Ticker(ticker)
            info = t.info
            holdings = t.funds_data.top_holdings

            etf_data = {
                "ticker": ticker,
                "name": etf["name"],
                "sector": etf["sector"],
                "ytd_return": info.get("ytdReturn"),
                "total_assets": info.get("totalAssets"),
                "holdings": [],
            }

            if holdings is not None:
                for symbol, row in holdings.iterrows():
                    etf_data["holdings"].append({
                        "ticker": symbol,
                        "name": row.get("Name", ""),
                        "weight": float(row.get("Holding Percent", 0)),
                    })

            results[ticker] = etf_data
            print(f"  Holdings: {len(etf_data['holdings'])}")
        except Exception as e:
            print(f"  Error: {e}")
            results[ticker] = {"ticker": ticker, "name": etf["name"], "sector": etf["sector"], "holdings": []}
        time.sleep(1)

    output = Path(__file__).parent / "seed_data/etf_holdings.json"
    with open(output, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved to {output}")
    return results


if __name__ == "__main__":
    fetch_etf_data()
