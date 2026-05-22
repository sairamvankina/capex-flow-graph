import { useEffect, useState } from "react";
import { fetchGraph } from "../api/graphApi";
import type { CompanyData, Category } from "../types";
import { categoryColors, categoryLabels } from "../utils/colors";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { useDarkMode } from "../hooks/useDarkMode";

interface SectorGrowth {
  category: Category;
  avgGrowth: number;
  companies: CompanyData[];
}

export function GrowthPanel() {
  const [dark] = useDarkMode();
  const [sectors, setSectors] = useState<SectorGrowth[]>([]);
  const [expandedSector, setExpandedSector] = useState<Category | null>(null);

  useEffect(() => {
    fetchGraph({}).then((data) => {
      const bySector = new Map<Category, CompanyData[]>();
      for (const node of data.nodes) {
        if (node.type !== "companyNode") continue;
        const d = node.data as unknown as CompanyData;
        if (!bySector.has(d.category)) bySector.set(d.category, []);
        bySector.get(d.category)!.push(d);
      }

      const sectorData: SectorGrowth[] = [];
      for (const [cat, companies] of bySector) {
        const growths = companies.filter((c) => c.revenueGrowth != null).map((c) => c.revenueGrowth!);
        const avgGrowth = growths.length > 0 ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;
        const sorted = [...companies].sort((a, b) => (b.revenueGrowth ?? 0) - (a.revenueGrowth ?? 0));
        sectorData.push({ category: cat, avgGrowth, companies: sorted });
      }
      sectorData.sort((a, b) => b.avgGrowth - a.avgGrowth);
      setSectors(sectorData);
    });
  }, []);

  const cardBg = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const textPrimary = dark ? "text-gray-100" : "text-gray-900";
  const textMuted = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`h-full overflow-y-auto p-6 ${dark ? "bg-gray-950" : "bg-gray-50"}`}>
      <h1 className={`text-xl font-bold mb-1 ${textPrimary}`}>Sector Growth Rankings</h1>
      <p className={`text-sm mb-6 ${textMuted}`}>Average revenue growth by sector, ranked highest to lowest</p>

      <div className="space-y-3 max-w-4xl">
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
              <span className={`text-sm ${textMuted}`}>{sector.companies.length} companies</span>
              <span className={`text-lg font-bold ${sector.avgGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
                {sector.avgGrowth >= 0 ? "+" : ""}{(sector.avgGrowth * 100).toFixed(1)}%
              </span>
              <span className={`text-xs ${textMuted}`}>{expandedSector === sector.category ? "▲" : "▼"}</span>
            </button>

            {expandedSector === sector.category && (
              <div className={`border-t ${dark ? "border-gray-700" : "border-gray-100"} px-5 py-3`}>
                <div className={`grid grid-cols-[1fr_80px_100px_80px_80px] gap-2 text-xs font-medium ${textMuted} mb-2 px-1`}>
                  <span>Company</span>
                  <span className="text-right">Market Cap</span>
                  <span className="text-right">Revenue</span>
                  <span className="text-right">Growth</span>
                  <span className="text-right">Net Margin</span>
                </div>
                {sector.companies.map((company) => (
                  <div
                    key={company.ticker}
                    className={`grid grid-cols-[1fr_80px_100px_80px_80px] gap-2 text-sm py-2 px-1 rounded ${
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
                      (company.revenueGrowth ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {formatPercent(company.revenueGrowth)}
                    </span>
                    <span className={`text-right ${textPrimary}`}>{formatPercent(company.netMargin)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
