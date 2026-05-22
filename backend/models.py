from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Company:
    ticker: str
    name: str
    category: str  # chips, mag7, ai_software, infra, energy, cooling, photonics, networking, memory
    market_cap: Optional[float] = None
    revenue: Optional[float] = None
    revenue_growth: Optional[float] = None
    eps: Optional[float] = None
    pe_ratio: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    pick_and_shovel: bool = False
    competitive_moat: str = "moderate"  # weak, moderate, strong
    sentiment: str = "neutral"  # bearish, neutral, bullish


@dataclass
class Relationship:
    source: str  # ticker
    target: str  # ticker
    rel_type: str  # CUSTOMER_OF, SUPPLIES, PARTNERS_WITH, INVESTS_IN, ACQUIRED, COMPETES_WITH
    amount: Optional[float] = None
    deal_type: Optional[str] = None
    product: Optional[str] = None
    description: Optional[str] = None
    strategic_importance: str = "medium"  # low, medium, high, critical
    date: Optional[str] = None
    status: Optional[str] = None
