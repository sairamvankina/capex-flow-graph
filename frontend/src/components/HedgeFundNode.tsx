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
      className="bg-white rounded-lg shadow-lg p-3 min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{ borderLeft: "4px solid #7c3aed" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">🏦</span>
        <div className="font-bold text-sm truncate max-w-[150px]">{data.name}</div>
      </div>

      <div className="text-[10px] text-violet-500 mb-1.5">Hedge Fund (13F)</div>

      <div className="space-y-0.5 text-xs">
        <div>
          <span className="text-gray-400">Portfolio:</span>{" "}
          <span className="font-medium">{formatCurrency(data.totalPortfolioValue)}</span>
        </div>
        {data.reportPeriod && (
          <div>
            <span className="text-gray-400">Period:</span>{" "}
            <span className="font-medium">{data.reportPeriod}</span>
          </div>
        )}
        {data.filingDate && (
          <div>
            <span className="text-gray-400">Filed:</span>{" "}
            <span className="font-medium">{data.filingDate}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
