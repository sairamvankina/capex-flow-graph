import type { GraphResponse, CompanyDetail } from "../types";

const BASE = "/api";

export async function fetchGraph(category?: string): Promise<GraphResponse> {
  const params = category ? `?category=${category}` : "";
  const res = await fetch(`${BASE}/graph${params}`);
  return res.json();
}

export async function fetchCompanyDetail(ticker: string): Promise<CompanyDetail> {
  const res = await fetch(`${BASE}/company/${ticker}`);
  return res.json();
}
