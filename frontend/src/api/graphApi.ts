import type { GraphResponse, CompanyDetail } from "../types";

const BASE = "/api";

export async function fetchGraph(options?: {
  category?: string;
  includeEtfs?: boolean;
  includeHedgeFunds?: boolean;
}): Promise<GraphResponse> {
  const params = new URLSearchParams();
  if (options?.category) params.set("category", options.category);
  if (options?.includeEtfs) params.set("include_etfs", "true");
  if (options?.includeHedgeFunds) params.set("include_hedge_funds", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE}/graph${qs}`);
  return res.json();
}

export async function fetchCompanyDetail(ticker: string): Promise<CompanyDetail> {
  const res = await fetch(`${BASE}/company/${ticker}`);
  return res.json();
}

export interface EtfDetail {
  etf: {
    ticker: string;
    name: string;
    sector: string;
    totalAssets: number | null;
    ytdReturn: number | null;
    category: string;
  };
  holdings: Array<{
    ticker: string;
    name: string;
    category: string;
    marketCap: number | null;
    revenueGrowth: number | null;
    weight: number;
  }>;
  error?: string;
}

export async function fetchEtfDetail(ticker: string): Promise<EtfDetail> {
  const res = await fetch(`${BASE}/etf/${ticker}`);
  return res.json();
}

export type TimePeriod = "1d" | "5d" | "1mo" | "6mo" | "1y" | "ytd";

export interface PerformanceResponse {
  period: string;
  returns: Record<string, number>;
}

export async function fetchPerformance(period: TimePeriod): Promise<PerformanceResponse> {
  const res = await fetch(`${BASE}/performance?period=${period}`);
  return res.json();
}

export async function refreshData(target: "all" | "financials" | "etfs" | "hedge_funds" = "all"): Promise<{ status: string; results: Record<string, string> }> {
  const res = await fetch(`${BASE}/refresh?target=${target}`, { method: "POST" });
  return res.json();
}
