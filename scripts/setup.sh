#!/bin/bash
set -e

echo "=== CapEx Flow Graph PoC Setup ==="

# Backend setup
echo ""
echo "→ Installing Python dependencies..."
cd "$(dirname "$0")/../backend"
pip install -r requirements.txt

# Start Neo4j (Docker or Homebrew)
echo ""
echo "→ Starting Neo4j..."
if command -v docker &> /dev/null; then
    cd "$(dirname "$0")/.."
    docker compose up -d
    echo "  Waiting for Neo4j to be ready..."
    sleep 10
else
    echo "  Docker not found. Trying Homebrew Neo4j..."
    if command -v neo4j &> /dev/null; then
        neo4j start
        sleep 5
    else
        echo "  ERROR: Neither Docker nor Homebrew Neo4j found."
        echo "  Install with: brew install neo4j"
        echo "  Or install Docker Desktop"
        exit 1
    fi
fi

# Fetch financial data
echo ""
echo "→ Fetching financial data from Yahoo Finance..."
cd "$(dirname "$0")/../backend"
python fetch_financials.py

# Seed Neo4j
echo ""
echo "→ Seeding Neo4j database..."
python seed_neo4j.py

# Frontend setup
echo ""
echo "→ Installing frontend dependencies..."
cd "$(dirname "$0")/../frontend"
npm install

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the app:"
echo "  Terminal 1: cd backend && python api.py"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:5173"
