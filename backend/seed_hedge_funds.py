"""Seed hedge fund nodes and HOLDS_POSITION relationships into Neo4j."""
import json
from pathlib import Path

from neo4j import GraphDatabase

from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD


def load_positions():
    path = Path(__file__).parent / "seed_data/hedge_fund_positions.json"
    if not path.exists():
        print("No hedge_fund_positions.json found. Run fetch_hedge_funds.py first.")
        return {}
    with open(path) as f:
        return json.load(f)


def seed_hedge_funds(tx, data):
    for fund_name, fund in data.items():
        if fund.get("error") or not fund["positions"]:
            continue

        tx.run("""
            MERGE (h:HedgeFund {name: $name})
            SET h.cik = $cik,
                h.filingDate = $filingDate,
                h.reportPeriod = $reportPeriod,
                h.totalPortfolioValue = $totalValue
        """, {
            "name": fund["name"],
            "cik": fund["cik"],
            "filingDate": fund.get("filing_date"),
            "reportPeriod": fund.get("report_period"),
            "totalValue": fund.get("total_portfolio_value"),
        })

        for pos in fund["positions"]:
            tx.run("""
                MATCH (h:HedgeFund {name: $fundName})
                MATCH (c:Company {ticker: $ticker})
                MERGE (h)-[r:HOLDS_POSITION]->(c)
                SET r.shares = $shares,
                    r.value = $value,
                    r.filingDate = $filingDate
            """, {
                "fundName": fund["name"],
                "ticker": pos["ticker"],
                "shares": pos["shares"],
                "value": pos["value"],
                "filingDate": fund.get("filing_date"),
            })


def main():
    data = load_positions()
    if not data:
        return

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        session.execute_write(lambda tx: tx.run(
            "CREATE CONSTRAINT hedge_fund_name IF NOT EXISTS FOR (h:HedgeFund) REQUIRE h.name IS UNIQUE"
        ))
        session.execute_write(lambda tx: seed_hedge_funds(tx, data))
    driver.close()

    total = sum(len(f["positions"]) for f in data.values() if not f.get("error"))
    funds = sum(1 for f in data.values() if f["positions"] and not f.get("error"))
    print(f"Seeded {funds} hedge funds with {total} positions.")


if __name__ == "__main__":
    main()
