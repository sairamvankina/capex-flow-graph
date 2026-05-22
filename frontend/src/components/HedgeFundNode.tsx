import { Handle, Position } from "@xyflow/react";
import { formatCurrency } from "../utils/formatters";

interface HedgeFundData {
  name: string;
  cik: string;
  filingDate: string | null;
  reportPeriod: string | null;
  totalPortfolioValue: number | null;
  category: string;
}

export function HedgeFundNode({ data }: { data: HedgeFundData }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700"
      style={{ borderLeft: "4px solid #7c3aed" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 dark:!bg-gray-500" />

      <div className="flex items-center gap-1.5 mb-1">
        <div className="font-bold text-sm dark:text-gray-100 truncate max-w-[150px]">{data.name}</div>
      </div>

      <div className="text-[10px] text-violet-500 dark:text-violet-400 mb-1.5">Hedge Fund (13F)</div>

      <div className="space-y-0.5 text-xs">
        <div>
          <span className="text-gray-400 dark:text-gray-500">Portfolio:</span>{" "}
          <span className="font-medium dark:text-gray-200">{formatCurrency(data.totalPortfolioValue)}</span>
        </div>
        {data.reportPeriod && (
          <div>
            <span className="text-gray-400 dark:text-gray-500">Period:</span>{" "}
            <span className="font-medium dark:text-gray-200">{data.reportPeriod}</span>
          </div>
        )}
        {data.filingDate && (
          <div>
            <span className="text-gray-400 dark:text-gray-500">Filed:</span>{" "}
            <span className="font-medium dark:text-gray-200">{data.filingDate}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 dark:!bg-gray-500" />
    </div>
  );
}
