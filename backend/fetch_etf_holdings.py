"""
Fetch ETF holdings data.
Uses Finnhub for full holdings when API key available, falls back to yfinance (top 10).
"""
import json
import os
import time
from pathlib import Path

import yfinance as yf
from dotenv import load_dotenv

load_dotenv()

ETFS = [
    {"ticker": "SMH", "name": "VanEck Semiconductor ETF", "sector": "Semiconductors"},
    {"ticker": "SOXX", "name": "iShares Semiconductor ETF", "sector": "Semiconductors"},
    {"ticker": "QQQ", "name": "Invesco QQQ (Nasdaq 100)", "sector": "Technology"},
    {"ticker": "XLK", "name": "Technology Select SPDR", "sector": "Technology"},
    {"ticker": "IGV", "name": "iShares Expanded Tech-Software", "sector": "Software"},
    {"ticker": "DRAM", "name": "Roundhill Memory ETF", "sector": "Memory/DRAM"},
    {"ticker": "SOXL", "name": "Direxion 3x Semiconductor Bull", "sector": "Semiconductors (Leveraged)"},
    {"ticker": "PSI", "name": "Invesco Semiconductors ETF", "sector": "Semiconductors"},
]


def fetch_via_finnhub(ticker: str, client) -> list | None:
    """Fetch full holdings via Finnhub (requires API key)."""
    try:
        data = client.etfs_holdings(ticker)
        if not data or "holdings" not in data:
            return None
        holdings = []
        for h in data["holdings"]:
            if h.get("symbol") and h.get("percent"):
                holdings.append({
                    "ticker": h["symbol"],
                    "name": h.get("name", ""),
                    "weight": h["percent"] / 100,
                })
        return holdings if holdings else None
    except Exception:
        return None


def fetch_via_yfinance(ticker: str) -> list:
    """Fetch top holdings via yfinance (top 10 only)."""
    try:
        t = yf.Ticker(ticker)
        holdings_df = t.funds_data.top_holdings
        holdings = []
        if holdings_df is not None:
            for symbol, row in holdings_df.iterrows():
                holdings.append({
                    "ticker": symbol,
                    "name": row.get("Name", ""),
                    "weight": float(row.get("Holding Percent", 0)),
                })
        return holdings
    except Exception:
        return []


def get_etf_metadata(ticker: str, client=None) -> dict:
    """Get ETF metadata (AUM, YTD return, sector exposure)."""
    meta = {}

    # Try Finnhub profile first
    if client:
        try:
            profile = client.etfs_profile(ticker)
            if profile and profile.get("profile"):
                p = profile["profile"]
                meta["expense_ratio"] = p.get("expenseRatio")
                meta["inception_date"] = p.get("inceptionDate")
                meta["description"] = p.get("description")
        except Exception:
            pass

        try:
            sector_data = client.etfs_sector_exposure(ticker)
            if sector_data and sector_data.get("sectorExposure"):
                meta["sector_exposure"] = sector_data["sectorExposure"]
        except Exception:
            pass

    # yfinance for AUM and YTD
    try:
        t = yf.Ticker(ticker)
        info = t.info
        meta["total_assets"] = info.get("totalAssets")
        meta["ytd_return"] = info.get("ytdReturn")
    except Exception:
        pass

    return meta


def fetch_etf_data():
    """Fetch all ETF data, using best available source."""
    finnhub_key = os.getenv("FINNHUB_API_KEY", "")
    client = None
    source = "yfinance"

    if finnhub_key:
        try:
            import finnhub
            client = finnhub.Client(api_key=finnhub_key)
            source = "finnhub+yfinance"
        except ImportError:
            pass

    print(f"Source: {source}")
    results = {}

    for etf in ETFS:
        ticker = etf["ticker"]
        print(f"Fetching {ticker}...")

        # Get holdings
        holdings = None
        if client:
            holdings = fetch_via_finnhub(ticker, client)
            if holdings:
                print(f"  Finnhub: {len(holdings)} holdings")

        if not holdings:
            holdings = fetch_via_yfinance(ticker)
            print(f"  yfinance: {len(holdings)} holdings")

        # Get metadata
        meta = get_etf_metadata(ticker, client)

        results[ticker] = {
            "ticker": ticker,
            "name": etf["name"],
            "sector": etf["sector"],
            "ytd_return": meta.get("ytd_return"),
            "total_assets": meta.get("total_assets"),
            "expense_ratio": meta.get("expense_ratio"),
            "sector_exposure": meta.get("sector_exposure"),
            "holdings": holdings,
            "source": "finnhub" if (client and holdings and len(holdings) > 10) else "yfinance",
        }
        time.sleep(0.5)

    output = Path(__file__).parent / "seed_data/etf_holdings.json"
    with open(output, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved to {output}")
    return results


if __name__ == "__main__":
    fetch_etf_data()
