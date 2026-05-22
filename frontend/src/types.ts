export interface CompanyData {
  ticker: string;
  name: string;
  category: Category;
  marketCap: number | null;
  revenue: number | null;
  revenueGrowth: number | null;
  eps: number | null;
  peRatio: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  pickAndShovel: boolean;
  competitiveMoat: "weak" | "moderate" | "strong";
  sentiment: "bearish" | "neutral" | "bullish";
  revenueBreakdown: string | null;
}

export interface RelationshipData {
  relType: string;
  amount: number | null;
  product: string | null;
  description: string | null;
  strategicImportance: "low" | "medium" | "high" | "critical";
  dealDate: string | null;
  dealDuration: string | null;
  sourceInfo: string | null;
  annualRecurring: boolean;
  status: string | null;
}

export type Category =
  | "mag7"
  | "chips"
  | "ai_software"
  | "infra"
  | "energy"
  | "cooling"
  | "photonics"
  | "networking"
  | "memory";

export interface GraphResponse {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: CompanyData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    data: RelationshipData;
  }>;
}

export interface CompanyDetail {
  company: CompanyData & { ticker: string };
  relationships: Array<{
    relType: string;
    direction: "incoming" | "outgoing";
    otherTicker: string;
    otherName: string;
    props: Record<string, unknown>;
  }>;
}
