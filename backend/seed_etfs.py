"""Seed ETF nodes and HOLDS_POSITION relationships into Neo4j."""
import json
from pathlib import Path

from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD


def load_etf_data():
    path = Path(__file__).parent / "seed_data/etf_holdings.json"
    if not path.exists():
        print("No etf_holdings.json. Run fetch_etf_holdings.py first.")
        return {}
    with open(path) as f:
        return json.load(f)


def seed_etfs(session, etf_data):
    for ticker, etf in etf_data.items():
        session.execute_write(lambda tx, t=ticker, e=etf: tx.run("""
            MERGE (etf:ETF {ticker: $ticker})
            SET etf.name = $name,
                etf.sector = $sector,
                etf.totalAssets = $totalAssets,
                etf.ytdReturn = $ytdReturn,
                etf.category = 'etf'
        """, {
            "ticker": t,
            "name": e.get("name"),
            "sector": e.get("sector"),
            "totalAssets": e.get("total_assets"),
            "ytdReturn": e.get("ytd_return"),
        }))

        for holding in etf.get("holdings", []):
            session.execute_write(lambda tx, et=ticker, h=holding: tx.run("""
                MATCH (etf:ETF {ticker: $etfTicker})
                MATCH (c:Company {ticker: $companyTicker})
                MERGE (etf)-[r:HOLDS_POSITION]->(c)
                SET r.weight = $weight,
                    r.name = $name
            """, {
                "etfTicker": et,
                "companyTicker": h["ticker"],
                "weight": h["weight"],
                "name": h.get("name", ""),
            }))

    return len(etf_data)


def main():
    etf_data = load_etf_data()
    if not etf_data:
        return

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        count = seed_etfs(session, etf_data)
    driver.close()
    print(f"Seeded {count} ETFs with holdings relationships.")


if __name__ == "__main__":
    main()
