import type { EtfDetail } from "../api/graphApi";
import { categoryColors } from "../utils/colors";
import { formatCurrency, formatPercent } from "../utils/formatters";
import type { Category } from "../types";

interface EtfDetailPanelProps {
  data: EtfDetail | null;
  onClose: () => void;
}

export function EtfDetailPanel({ data, onClose }: EtfDetailPanelProps) {
  if (!data || !data.etf) return null;

  const { etf, holdings } = data;
  const ytd = etf.ytdReturn != null ? etf.ytdReturn / 100 : null;
  const ytdColor = ytd != null && ytd >= 0 ? "text-green-600" : "text-red-500";

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl border-l dark:border-gray-700 overflow-y-auto z-50">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold dark:text-gray-100">{etf.ticker}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">
            &times;
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{etf.name}</div>
        <div className="inline-block text-xs px-2 py-0.5 rounded-full text-white mb-4 bg-sky-500">
          ETF | {etf.sector}
        </div>

        <div className="space-y-3">
          {/* Key metrics */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Assets (AUM)</span>
              <span className="font-semibold dark:text-gray-100">{formatCurrency(etf.totalAssets)}</span>
            </div>
            {ytd != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">YTD Return</span>
                <span className={`font-semibold ${ytdColor}`}>
                  {ytd >= 0 ? "+" : ""}{formatPercent(ytd)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Holdings Tracked</span>
              <span className="font-semibold dark:text-gray-100">{holdings.length}</span>
            </div>
          </div>

          {/* Holdings breakdown */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Holdings</h3>
            <div className="space-y-1.5">
              {holdings.map((h) => (
                <div key={h.ticker} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: categoryColors[h.category as Category] || "#6b7280" }}
                      />
                      <span className="text-sm font-medium dark:text-gray-100">{h.ticker}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">{h.name}</span>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {(h.weight * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-400"
                        style={{ width: `${Math.min(h.weight * 100 * 3, 100)}%` }}
                      />
                    </div>
                    <div className="flex gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                      {h.marketCap && <span>MCap: {formatCurrency(h.marketCap)}</span>}
                      {h.revenueGrowth != null && (
                        <span className={h.revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                          {h.revenueGrowth >= 0 ? "+" : ""}{(h.revenueGrowth * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
