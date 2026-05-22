import { Handle, Position } from "@xyflow/react";
import type { CompanyData } from "../types";
import { categoryColors, categoryLabels } from "../utils/colors";
import { formatCurrency, formatPercent } from "../utils/formatters";

export function CompanyNode({ data }: { data: CompanyData }) {
  const borderColor = categoryColors[data.category] || "#6b7280";

  const sentimentBadge = {
    bullish: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300", label: "Bullish" },
    neutral: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-800 dark:text-gray-300", label: "Neutral" },
    bearish: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-300", label: "Bearish" },
  }[data.sentiment] ?? { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-800 dark:text-gray-300", label: "?" };

  const moatWidth =
    data.competitiveMoat === "strong" ? "100%" :
    data.competitiveMoat === "moderate" ? "66%" : "33%";

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[200px] cursor-pointer hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 dark:!bg-gray-500" />

      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="font-bold text-sm dark:text-gray-100">{data.ticker}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{data.name}</div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sentimentBadge.bg} ${sentimentBadge.text}`}>
          {sentimentBadge.label}
        </span>
      </div>

      <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">
        {categoryLabels[data.category]}
        {data.pickAndShovel && " | Pick & Shovel"}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
        <div>
          <span className="text-gray-400 dark:text-gray-500">MCap:</span>{" "}
          <span className="font-medium dark:text-gray-200">{formatCurrency(data.marketCap)}</span>
        </div>
        <div>
          <span className="text-gray-400 dark:text-gray-500">P/E:</span>{" "}
          <span className="font-medium dark:text-gray-200">{data.peRatio?.toFixed(1) ?? "N/A"}</span>
        </div>
        <div>
          <span className="text-gray-400 dark:text-gray-500">Rev:</span>{" "}
          <span className="font-medium dark:text-gray-200">{formatCurrency(data.revenue)}</span>
        </div>
        <div>
          <span className="text-gray-400 dark:text-gray-500">Growth:</span>{" "}
          <span className="font-medium dark:text-gray-200">{formatPercent(data.revenueGrowth)}</span>
        </div>
      </div>

      <div className="mt-1.5">
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
          <span>Margin (Net)</span>
          <span>{formatPercent(data.netMargin)}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: data.netMargin ? `${Math.min(data.netMargin * 100, 100)}%` : "0%",
              backgroundColor: borderColor,
            }}
          />
        </div>
      </div>

      <div className="mt-1">
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
          <span>Moat</span>
          <span>{data.competitiveMoat}</span>
        </div>
        <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full"
            style={{ width: moatWidth }}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 dark:!bg-gray-500" />
    </div>
  );
}
