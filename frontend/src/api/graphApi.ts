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
