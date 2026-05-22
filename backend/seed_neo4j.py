import json
from pathlib import Path

from neo4j import GraphDatabase

from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD


def load_json(path: str):
    with open(Path(__file__).parent / path) as f:
        return json.load(f)


def create_constraints(tx):
    tx.run("CREATE CONSTRAINT company_ticker IF NOT EXISTS FOR (c:Company) REQUIRE c.ticker IS UNIQUE")


def seed(tx, companies, relationships, financials):
    for company in companies:
        ticker = company["ticker"]
        fin = financials.get(ticker, {})

        tx.run("""
            MERGE (c:Company {ticker: $ticker})
            SET c.name = $name,
                c.category = $category,
                c.marketCap = $marketCap,
                c.revenue = $revenue,
                c.revenueGrowth = $revenueGrowth,
                c.eps = $eps,
                c.peRatio = $peRatio,
                c.grossMargin = $grossMargin,
                c.operatingMargin = $operatingMargin,
                c.netMargin = $netMargin,
                c.pickAndShovel = $pickAndShovel,
                c.competitiveMoat = $competitiveMoat,
                c.sentiment = $sentiment
        """, {
            "ticker": ticker,
            "name": company["name"],
            "category": company["category"],
            "marketCap": fin.get("market_cap"),
            "revenue": fin.get("revenue"),
            "revenueGrowth": fin.get("revenue_growth"),
            "eps": fin.get("eps"),
            "peRatio": fin.get("pe_ratio"),
            "grossMargin": fin.get("gross_margin"),
            "operatingMargin": fin.get("operating_margin"),
            "netMargin": fin.get("net_margin"),
            "pickAndShovel": company.get("pick_and_shovel", False),
            "competitiveMoat": company.get("competitive_moat", "moderate"),
            "sentiment": company.get("sentiment", "neutral"),
        })

    for rel in relationships:
        rel_type = rel["rel_type"]
        props = {
            "amount": rel.get("amount"),
            "dealType": rel.get("deal_type"),
            "product": rel.get("product"),
            "description": rel.get("description"),
            "strategicImportance": rel.get("strategic_importance", "medium"),
            "dealDate": rel.get("deal_date"),
            "dealDuration": rel.get("deal_duration"),
            "sourceInfo": rel.get("source_info"),
            "annualRecurring": rel.get("annual_recurring", False),
            "status": rel.get("status"),
        }

        query = f"""
            MATCH (a:Company {{ticker: $source}})
            MATCH (b:Company {{ticker: $target}})
            MERGE (a)-[r:{rel_type}]->(b)
            SET r.amount = $props.amount,
                r.dealType = $props.dealType,
                r.product = $props.product,
                r.description = $props.description,
                r.strategicImportance = $props.strategicImportance,
                r.dealDate = $props.dealDate,
                r.dealDuration = $props.dealDuration,
                r.sourceInfo = $props.sourceInfo,
                r.annualRecurring = $props.annualRecurring,
                r.status = $props.status
        """
        tx.run(query, source=rel["source"], target=rel["target"], props=props)


def main():
    companies = load_json("seed_data/companies.json")
    relationships = load_json("seed_data/relationships.json")

    financials_path = Path(__file__).parent / "seed_data/financials_cache.json"
    if financials_path.exists():
        with open(financials_path) as f:
            financials = json.load(f)
    else:
        print("No financials_cache.json found. Run fetch_financials.py first.")
        print("Seeding without financial data...")
        financials = {}

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        session.execute_write(create_constraints)
        session.execute_write(lambda tx: seed(tx, companies, relationships, financials))
    driver.close()
    print(f"Seeded {len(companies)} companies and {len(relationships)} relationships.")


if __name__ == "__main__":
    main()
