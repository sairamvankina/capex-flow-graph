import { Handle, Position } from "@xyflow/react";
import { formatCurrency, formatPercent } from "../utils/formatters";

interface EtfData {
  ticker: string;
  name: string;
  category: string;
  sector: string | null;
  totalAssets: number | null;
  ytdReturn: number | null;
}

export function EtfNode({ data }: { data: EtfData }) {
  const ytd = data.ytdReturn != null ? data.ytdReturn / 100 : null;
  const ytdColor = ytd != null && ytd >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400";

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700"
      style={{ borderLeft: "4px solid #0ea5e9" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 dark:!bg-gray-500" />

      <div className="mb-1">
        <div className="font-bold text-sm dark:text-gray-100">{data.ticker}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{data.name}</div>
      </div>

      <div className="text-[10px] text-sky-500 dark:text-sky-400 mb-1.5">
        ETF{data.sector ? ` | ${data.sector}` : ""}
      </div>

      <div className="space-y-0.5 text-xs">
        <div>
          <span className="text-gray-400 dark:text-gray-500">AUM:</span>{" "}
          <span className="font-medium dark:text-gray-200">{formatCurrency(data.totalAssets)}</span>
        </div>
        {ytd != null && (
          <div>
            <span className="text-gray-400 dark:text-gray-500">YTD:</span>{" "}
            <span className={`font-medium ${ytdColor}`}>
              {ytd >= 0 ? "+" : ""}{formatPercent(ytd)}
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 dark:!bg-gray-500" />
    </div>
  );
}
