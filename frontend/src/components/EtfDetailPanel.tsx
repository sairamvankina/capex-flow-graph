import { useEffect, useState } from "react";
import { type EtfDetail, fetchPerformance, type TimePeriod } from "../api/graphApi";
import { categoryColors } from "../utils/colors";
import { formatCurrency } from "../utils/formatters";
import type { Category } from "../types";

interface EtfDetailPanelProps {
  data: EtfDetail | null;
  onClose: () => void;
}

const periodLabels: Record<TimePeriod, string> = {
  "1d": "1 Day",
  "5d": "1 Week",
  "1mo": "1 Month",
  "6mo": "6 Months",
  "1y": "1 Year",
  "ytd": "YTD",
};

export function EtfDetailPanel({ data, onClose }: EtfDetailPanelProps) {
  const [period, setPeriod] = useState<TimePeriod>("ytd");
  const [returns, setReturns] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setLoading(true);
    fetchPerformance(period).then((perf) => {
      setReturns(perf.returns);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [data, period]);

  if (!data || !data.etf) return null;

  const { etf, holdings } = data;
  const etfReturn = returns[etf.ticker];
  const etfReturnColor = etfReturn != null && etfReturn >= 0 ? "text-green-500" : "text-red-500";

  // Calculate contribution: weight × stock return
  const holdingsWithContribution = holdings.map((h) => {
    const stockReturn = returns[h.ticker];
    const contribution = stockReturn != null ? h.weight * stockReturn : null;
    return { ...h, stockReturn, contribution };
  }).sort((a, b) => (b.contribution ?? -999) - (a.contribution ?? -999));

  const totalTrackedContribution = holdingsWithContribution
    .filter((h) => h.contribution != null)
    .reduce((sum, h) => sum + h.contribution!, 0);

  return (
    <div className="absolute right-0 top-0 h-full w-[420px] bg-white dark:bg-gray-900 shadow-2xl border-l dark:border-gray-700 flex flex-col z-50">
      {/* Header - fixed */}
      <div className="p-4 border-b dark:border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold dark:text-gray-100">{etf.ticker}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">
            &times;
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{etf.name}</div>
        <div className="inline-block text-xs px-2 py-0.5 rounded-full text-white bg-sky-500 mb-3">
          ETF | {etf.sector}
        </div>

        {/* Period selector + ETF return */}
        <div className="flex items-center gap-3 mb-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as TimePeriod)}
            className="text-xs px-2 py-1 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 bg-gray-50 border-gray-200 text-gray-700"
          >
            {(Object.keys(periodLabels) as TimePeriod[]).map((p) => (
              <option key={p} value={p}>{periodLabels[p]}</option>
            ))}
          </select>
          {loading && <span className="text-xs text-gray-400">Loading...</span>}
          {!loading && etfReturn != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">ETF Return:</span>
              <span className={`text-lg font-bold ${etfReturnColor}`}>
                {etfReturn >= 0 ? "+" : ""}{(etfReturn * 100).toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {etf.totalAssets && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded px-2 py-1.5">
              <span className="text-gray-500 dark:text-gray-400">AUM: </span>
              <span className="font-semibold dark:text-gray-100">{formatCurrency(etf.totalAssets)}</span>
            </div>
          )}
          <div className="bg-gray-50 dark:bg-gray-800 rounded px-2 py-1.5">
            <span className="text-gray-500 dark:text-gray-400">Tracked: </span>
            <span className="font-semibold dark:text-gray-100">{holdings.length} holdings</span>
          </div>
        </div>
      </div>

      {/* Holdings - scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
            Holdings — Contribution to {periodLabels[period]} Return
          </h3>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_55px_65px_75px] gap-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 sticky top-0 bg-white dark:bg-gray-900 py-1">
          <span>Company</span>
          <span className="text-right">Weight</span>
          <span className="text-right">Return</span>
          <span className="text-right">Contribution</span>
        </div>

        <div className="space-y-1">
          {holdingsWithContribution.map((h) => {
            const contribColor = h.contribution != null
              ? h.contribution >= 0 ? "text-green-500" : "text-red-500"
              : "text-gray-400";
            const returnColor = h.stockReturn != null
              ? h.stockReturn >= 0 ? "text-green-500" : "text-red-500"
              : "text-gray-400";

            return (
              <div key={h.ticker} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-2.5 py-2">
                <div className="grid grid-cols-[1fr_55px_65px_75px] gap-1 items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColors[h.category as Category] || "#6b7280" }}
                    />
                    <span className="text-sm font-medium dark:text-gray-100">{h.ticker}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{h.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 text-right">
                    {(h.weight * 100).toFixed(1)}%
                  </span>
                  <span className={`text-xs font-medium text-right ${returnColor}`}>
                    {h.stockReturn != null
                      ? `${h.stockReturn >= 0 ? "+" : ""}${(h.stockReturn * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                  <span className={`text-xs font-bold text-right ${contribColor}`}>
                    {h.contribution != null
                      ? `${h.contribution >= 0 ? "+" : ""}${(h.contribution * 100).toFixed(2)}%`
                      : "—"}
                  </span>
                </div>
                {/* Contribution bar */}
                {h.contribution != null && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                      {h.contribution >= 0 ? (
                        <div
                          className="h-full rounded-full bg-green-400"
                          style={{ width: `${Math.min(Math.abs(h.contribution) * 100 * 8, 100)}%` }}
                        />
                      ) : (
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{ width: `${Math.min(Math.abs(h.contribution) * 100 * 8, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        <div className="mt-3 pt-3 border-t dark:border-gray-700">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Total tracked contribution:
            </span>
            <span className={`font-bold ${totalTrackedContribution >= 0 ? "text-green-500" : "text-red-500"}`}>
              {totalTrackedContribution >= 0 ? "+" : ""}{(totalTrackedContribution * 100).toFixed(2)}%
            </span>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 leading-tight">
            <strong>Weight</strong> = % of fund in this stock.
            <strong> Return</strong> = stock's price change over the period.
            <strong> Contribution</strong> = weight × return (how much this stock moved the ETF).
          </p>
        </div>
      </div>
    </div>
  );
}
