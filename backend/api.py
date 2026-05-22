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
def get_graph(category: Optional[str] = Query(None)):
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
                },
            })

        edge_result = session.run("""
            MATCH (a:Company)-[r]->(b:Company)
            RETURN a.ticker AS source, b.ticker AS target,
                   type(r) AS relType, properties(r) AS props
        """)

        edges = []
        for record in edge_result:
            source = record["source"]
            target = record["target"]
            if category and (source not in tickers or target not in tickers):
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
                },
            })

    return {"nodes": nodes, "edges": edges}


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
            MATCH (c:Company {ticker: $ticker})-[r]-(other:Company)
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
