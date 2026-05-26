import { useEffect, useState } from "react";
import { fetchGraph, fetchEtfDetail, fetchPerformance, type TimePeriod } from "../api/graphApi";
import type { CompanyData, Category } from "../types";
import { categoryColors, categoryLabels } from "../utils/colors";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { useDarkMode } from "../hooks/useDarkMode";

interface EtfInfo {
  ticker: string;
  name: string;
  sector: string;
  totalAssets: number | null;
  ytdReturn: number | null;
}

interface SectorGrowth {
  category: Category;
  avgReturn: number;
  companies: (CompanyData & { periodReturn?: number })[];
  etfs: (EtfInfo & { periodReturn?: number })[];
}

const sectorEtfMap: Record<string, string[]> = {
  chips: ["SMH", "SOXX", "SOXL", "PSI"],
  memory: ["DRAM", "SMH"],
  ai_software: ["IGV", "QQQ"],
  mag7: ["QQQ", "XLK"],
  infra: ["QQQ"],
  networking: ["SMH"],
  photonics: ["SMH"],
  energy: [],
  cooling: [],
};

const periodLabels: Record<TimePeriod, string> = {
  "1d": "1 Day",
  "5d": "1 Week",
  "1mo": "1 Month",
  "6mo": "6 Months",
  "1y": "1 Year",
  "ytd": "Year to Date",
};

export function GrowthPanel() {
  const [dark] = useDarkMode();
  const [sectors, setSectors] = useState<SectorGrowth[]>([]);
  const [etfRankings, setEtfRankings] = useState<(EtfInfo & { periodReturn?: number })[]>([]);
  const [expandedSector, setExpandedSector] = useState<Category | null>(null);
  const [expandedEtf, setExpandedEtf] = useState<string | null>(null);
  const [etfHoldings, setEtfHoldings] = useState<Record<string, Array<{
    ticker: string; name: string; category: string; weight: number; marketCap: number | null; revenueGrowth: number | null;
  }>>>({});
  const [period, setPeriod] = useState<TimePeriod>("6mo");
  const [loading, setLoading] = useState(false);
  const [returns, setReturns] = useState<Record<string, number>>({});

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetchGraph({ includeEtfs: true }),
      fetchPerformance(period),
    ]).then(([graphData, perfData]) => {
      const returns = perfData.returns;
      setReturns(returns);

      const bySector = new Map<Category, (CompanyData & { periodReturn?: number })[]>();
      const etfMap = new Map<string, EtfInfo & { periodReturn?: number }>();

      for (const node of graphData.nodes) {
        if (node.type === "companyNode") {
          const d = node.data as unknown as CompanyData;
          const entry = { ...d, periodReturn: returns[d.ticker] };
          if (!bySector.has(d.category)) bySector.set(d.category, []);
          bySector.get(d.category)!.push(entry);
        } else if (node.type === "etfNode") {
          const d = node.data as unknown as EtfInfo & { category: string };
          etfMap.set(d.ticker, {
            ticker: d.ticker,
            name: d.name,
            sector: d.sector,
            totalAssets: d.totalAssets,
            ytdReturn: d.ytdReturn,
            periodReturn: returns[d.ticker],
          });
        }
      }

      const sectorData: SectorGrowth[] = [];
      for (const [cat, companies] of bySector) {
        const validReturns = companies.filter((c) => c.periodReturn != null).map((c) => c.periodReturn!);
        const avgReturn = validReturns.length > 0 ? validReturns.reduce((a, b) => a + b, 0) / validReturns.length : 0;
        const sorted = [...companies].sort((a, b) => (b.periodReturn ?? -999) - (a.periodReturn ?? -999));

        const sectorEtfs: (EtfInfo & { periodReturn?: number })[] = [];
        for (const etfTicker of sectorEtfMap[cat] || []) {
          const etf = etfMap.get(etfTicker);
          if (etf) sectorEtfs.push(etf);
        }

        sectorData.push({ category: cat, avgReturn, companies: sorted, etfs: sectorEtfs });
      }
      sectorData.sort((a, b) => b.avgReturn - a.avgReturn);
      setSectors(sectorData);

      const etfList = Array.from(etfMap.values());
      etfList.sort((a, b) => (b.periodReturn ?? -999) - (a.periodReturn ?? -999));
      setEtfRankings(etfList);

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period]);

  const cardBg = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const textPrimary = dark ? "text-gray-100" : "text-gray-900";
  const textMuted = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`h-full overflow-y-auto p-6 ${dark ? "bg-gray-950" : "bg-gray-50"}`}>
      {/* Header with period selector */}
      <div className="flex items-center gap-4 mb-1 flex-wrap">
        <h1 className={`text-xl font-bold ${textPrimary}`}>Sector Performance Rankings</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as TimePeriod)}
          className={`text-sm px-3 py-1.5 rounded-lg border ${
            dark ? "bg-gray-800 border-gray-600 text-gray-200" : "bg-white border-gray-200 text-gray-700"
          } focus:outline-none focus:ring-1 focus:ring-indigo-400`}
        >
          {(Object.keys(periodLabels) as TimePeriod[]).map((p) => (
            <option key={p} value={p}>{periodLabels[p]}</option>
          ))}
        </select>
        {loading && (
          <span className={`text-xs ${textMuted}`}>Loading...</span>
        )}
      </div>
      <p className={`text-sm mb-6 ${textMuted}`}>
        Showing price return over the selected period, averaged across companies in each sector.
        {period === "ytd" ? " Year-to-date from Jan 1." : ""}
      </p>

      <div className="space-y-3 max-w-5xl">
        {sectors.map((sector, i) => (
          <div key={sector.category} className={`rounded-xl border ${cardBg} overflow-hidden`}>
            <button
              onClick={() => setExpandedSector(expandedSector === sector.category ? null : sector.category)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:opacity-90 transition-opacity"
            >
              <span className={`text-lg font-bold w-8 ${textMuted}`}>#{i + 1}</span>
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: categoryColors[sector.category] }}
              />
              <span className={`font-semibold flex-1 text-left ${textPrimary}`}>
                {categoryLabels[sector.category]}
              </span>
              <span className={`text-sm ${textMuted}`}>
                {sector.companies.length} companies
                {sector.etfs.length > 0 && ` · ${sector.etfs.length} ETFs`}
              </span>
              <span className={`text-lg font-bold ${sector.avgReturn >= 0 ? "text-green-500" : "text-red-500"}`}>
                {sector.avgReturn >= 0 ? "+" : ""}{(sector.avgReturn * 100).toFixed(1)}%
              </span>
              <span className={`text-xs ${textMuted}`}>{expandedSector === sector.category ? "▲" : "▼"}</span>
            </button>

            {expandedSector === sector.category && (
              <div className={`border-t ${dark ? "border-gray-700" : "border-gray-100"} px-5 py-3`}>
                {/* ETFs section */}
                {sector.etfs.length > 0 && (
                  <div className="mb-4">
                    <div className={`text-[10px] font-semibold uppercase mb-2 ${textMuted}`}>
                      Sector ETFs ({periodLabels[period]} Return)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sector.etfs.map((etf) => {
                        const ret = etf.periodReturn;
                        return (
                          <div
                            key={etf.ticker}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                              dark ? "bg-gray-700/50 border-gray-600" : "bg-sky-50 border-sky-100"
                            }`}
                          >
                            <span className={`text-sm font-bold ${dark ? "text-sky-300" : "text-sky-700"}`}>
                              {etf.ticker}
                            </span>
                            <span className={`text-xs ${textMuted} max-w-[120px] truncate`}>{etf.name}</span>
                            {etf.totalAssets && (
                              <span className={`text-xs ${textMuted}`}>
                                {formatCurrency(etf.totalAssets)}
                              </span>
                            )}
                            {ret != null && (
                              <span className={`text-sm font-semibold ${ret >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {ret >= 0 ? "+" : ""}{(ret * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Companies table */}
                <div className={`text-[10px] font-semibold uppercase mb-2 ${textMuted}`}>
                  Companies ({periodLabels[period]} Price Return)
                </div>
                <div className={`grid grid-cols-[1fr_90px_100px_90px_80px] gap-2 text-xs font-medium ${textMuted} mb-2 px-1`}>
                  <span>Company</span>
                  <span className="text-right">Market Cap</span>
                  <span className="text-right">Revenue</span>
                  <span className="text-right">Return</span>
                  <span className="text-right">Net Margin</span>
                </div>
                {sector.companies.map((company) => (
                  <div
                    key={company.ticker}
                    className={`grid grid-cols-[1fr_90px_100px_90px_80px] gap-2 text-sm py-2 px-1 rounded ${
                      dark ? "hover:bg-gray-700/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div>
                      <span className={`font-medium ${textPrimary}`}>{company.ticker}</span>
                      <span className={`ml-2 text-xs ${textMuted}`}>{company.name}</span>
                    </div>
                    <span className={`text-right ${textPrimary}`}>{formatCurrency(company.marketCap)}</span>
                    <span className={`text-right ${textPrimary}`}>{formatCurrency(company.revenue)}</span>
                    <span className={`text-right font-medium ${
                      (company.periodReturn ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {company.periodReturn != null ? `${company.periodReturn >= 0 ? "+" : ""}${(company.periodReturn * 100).toFixed(1)}%` : "N/A"}
                    </span>
                    <span className={`text-right ${textPrimary}`}>{formatPercent(company.netMargin)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ETF Rankings Table */}
      {etfRankings.length > 0 && (
        <div className="max-w-5xl mt-10">
          <div className="flex items-baseline gap-4 mb-1">
            <h2 className={`text-lg font-bold ${textPrimary}`}>ETF Performance</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}>
              {periodLabels[period]} Price Return
            </span>
          </div>
          <p className={`text-sm mb-4 ${textMuted}`}>
            ETFs ranked by {periodLabels[period].toLowerCase()} price return.
          </p>

          <div className="space-y-2">
            {etfRankings.map((etf) => {
              const ret = etf.periodReturn;
              const isExpanded = expandedEtf === etf.ticker;
              const holdings = etfHoldings[etf.ticker];
              const holdingsWithContrib = holdings
                ?.map((h) => {
                  const stockReturn = returns[h.ticker];
                  const contribution = stockReturn != null ? h.weight * stockReturn : null;
                  return { ...h, stockReturn, contribution };
                })
                .sort((a, b) => (b.contribution ?? -999) - (a.contribution ?? -999));

              return (
                <div key={etf.ticker} className={`rounded-xl border ${cardBg} overflow-hidden`}>
                  <button
                    onClick={() => {
                      const next = isExpanded ? null : etf.ticker;
                      setExpandedEtf(next);
                      if (next && !etfHoldings[next]) {
                        fetchEtfDetail(next).then((detail) => {
                          if (!detail.error && detail.holdings) {
                            setEtfHoldings((prev) => ({ ...prev, [next]: detail.holdings }));
                          }
                        });
                      }
                    }}
                    className="w-full px-5 py-3 flex items-center gap-4 hover:opacity-90 transition-opacity"
                  >
                    <span className={`text-sm font-bold w-14 ${dark ? "text-sky-300" : "text-sky-700"}`}>
                      {etf.ticker}
                    </span>
                    <span className={`flex-1 text-left text-sm ${textPrimary}`}>{etf.name}</span>
                    <span className={`text-xs ${textMuted}`}>{etf.sector}</span>
                    {etf.totalAssets && (
                      <span className={`text-xs ${textMuted}`}>{formatCurrency(etf.totalAssets)}</span>
                    )}
                    {ret != null && (
                      <span className={`text-lg font-bold ${ret >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {ret >= 0 ? "+" : ""}{(ret * 100).toFixed(1)}%
                      </span>
                    )}
                    <span className={`text-xs ${textMuted}`}>{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div className={`border-t ${dark ? "border-gray-700" : "border-gray-100"} px-5 py-3`}>
                      {!holdingsWithContrib ? (
                        <span className={`text-xs ${textMuted}`}>Loading holdings...</span>
                      ) : (
                        <>
                          <div className={`grid grid-cols-[1fr_60px_65px_80px] gap-2 text-[10px] font-semibold ${textMuted} mb-2 px-1`}>
                            <span>Company</span>
                            <span className="text-right">Weight</span>
                            <span className="text-right">Return</span>
                            <span className="text-right">Contribution</span>
                          </div>
                          <div className="max-h-72 overflow-y-auto space-y-0.5">
                            {holdingsWithContrib.map((h) => (
                              <div
                                key={h.ticker}
                                className={`grid grid-cols-[1fr_60px_65px_80px] gap-2 text-sm py-1.5 px-1 rounded ${
                                  dark ? "hover:bg-gray-700/50" : "hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: categoryColors[h.category as Category] || "#6b7280" }}
                                  />
                                  <span className={`font-medium ${textPrimary}`}>{h.ticker}</span>
                                  <span className={`text-[10px] ${textMuted} truncate`}>{h.name}</span>
                                </div>
                                <span className={`text-right text-xs font-semibold ${dark ? "text-indigo-300" : "text-indigo-600"}`}>
                                  {(h.weight * 100).toFixed(1)}%
                                </span>
                                <span className={`text-right text-xs font-medium ${
                                  (h.stockReturn ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                                }`}>
                                  {h.stockReturn != null
                                    ? `${h.stockReturn >= 0 ? "+" : ""}${(h.stockReturn * 100).toFixed(1)}%`
                                    : "—"}
                                </span>
                                <span className={`text-right text-xs font-bold ${
                                  (h.contribution ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                                }`}>
                                  {h.contribution != null
                                    ? `${h.contribution >= 0 ? "+" : ""}${(h.contribution * 100).toFixed(2)}%`
                                    : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className={`text-[10px] ${textMuted} mt-2`}>
                            Contribution = weight × stock return. Sorted by impact on ETF.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
