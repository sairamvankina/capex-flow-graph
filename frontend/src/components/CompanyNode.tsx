import { Handle, Position } from "@xyflow/react";
import type { CompanyData } from "../types";
import { categoryColors, categoryLabels } from "../utils/colors";
import { formatCurrency, formatPercent } from "../utils/formatters";

export function CompanyNode({ data }: { data: CompanyData }) {
  const borderColor = categoryColors[data.category] || "#6b7280";

  const sentimentBadge = {
    bullish: { bg: "bg-green-100", text: "text-green-800", label: "Bullish" },
    neutral: { bg: "bg-gray-100", text: "text-gray-800", label: "Neutral" },
    bearish: { bg: "bg-red-100", text: "text-red-800", label: "Bearish" },
  }[data.sentiment] ?? { bg: "bg-gray-100", text: "text-gray-800", label: "?" };

  const moatWidth =
    data.competitiveMoat === "strong" ? "100%" :
    data.competitiveMoat === "moderate" ? "66%" : "33%";

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-3 min-w-[200px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="font-bold text-sm">{data.ticker}</div>
          <div className="text-xs text-gray-500 truncate max-w-[140px]">{data.name}</div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sentimentBadge.bg} ${sentimentBadge.text}`}>
          {sentimentBadge.label}
        </span>
      </div>

      <div className="text-[10px] text-gray-400 mb-1">
        {categoryLabels[data.category]}
        {data.pickAndShovel && " | Pick & Shovel"}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
        <div>
          <span className="text-gray-400">MCap:</span>{" "}
          <span className="font-medium">{formatCurrency(data.marketCap)}</span>
        </div>
        <div>
          <span className="text-gray-400">P/E:</span>{" "}
          <span className="font-medium">{data.peRatio?.toFixed(1) ?? "N/A"}</span>
        </div>
        <div>
          <span className="text-gray-400">Rev:</span>{" "}
          <span className="font-medium">{formatCurrency(data.revenue)}</span>
        </div>
        <div>
          <span className="text-gray-400">Growth:</span>{" "}
          <span className="font-medium">{formatPercent(data.revenueGrowth)}</span>
        </div>
      </div>

      <div className="mt-1.5">
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Margin (Net)</span>
          <span>{formatPercent(data.netMargin)}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Moat</span>
          <span>{data.competitiveMoat}</span>
        </div>
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full"
            style={{ width: moatWidth }}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
