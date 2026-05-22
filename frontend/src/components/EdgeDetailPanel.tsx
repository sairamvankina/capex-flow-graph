import type { RelationshipData } from "../types";
import { relTypeColors } from "../utils/colors";
import { formatCurrency } from "../utils/formatters";

interface EdgeDetailPanelProps {
  edge: {
    source: string;
    target: string;
    data: RelationshipData;
  } | null;
  onClose: () => void;
}

const relTypeLabels: Record<string, string> = {
  CUSTOMER_OF: "Customer Relationship",
  SUPPLIES: "Supply Agreement",
  PARTNERS_WITH: "Partnership",
  INVESTS_IN: "Investment / Acquisition",
  ACQUIRED: "Acquisition",
  COMPETES_WITH: "Competition",
};

const importanceBadge: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-800" },
  high: { bg: "bg-orange-100", text: "text-orange-800" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
  low: { bg: "bg-gray-100", text: "text-gray-600" },
};

export function EdgeDetailPanel({ edge, onClose }: EdgeDetailPanelProps) {
  if (!edge || !edge.data) return null;

  const { data } = edge;
  const color = relTypeColors[data.relType] || "#6b7280";
  const importance = data.strategicImportance || "medium";
  const badge = importanceBadge[importance] || importanceBadge.medium;

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl border-l overflow-y-auto z-50">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color }}>
            {relTypeLabels[data.relType] || data.relType}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className="font-bold bg-gray-100 px-2 py-1 rounded">{edge.source}</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="font-bold bg-gray-100 px-2 py-1 rounded">{edge.target}</span>
        </div>

        {data.amount && (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-4">
            <div className="text-xs text-gray-500 uppercase font-semibold">Investment / Deal Value</div>
            <div className="text-2xl font-bold text-indigo-700">{formatCurrency(data.amount)}</div>
            {data.annualRecurring && (
              <div className="text-xs text-indigo-500 mt-1">Annual recurring</div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} font-medium`}>
              {importance.toUpperCase()}
            </span>
            {data.status && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                {data.status.toUpperCase()}
              </span>
            )}
          </div>

          {data.product && (
            <Section title="Product / Service">
              <p className="text-sm text-gray-700">{data.product}</p>
            </Section>
          )}

          {data.description && (
            <Section title="Description">
              <p className="text-sm text-gray-700">{data.description}</p>
            </Section>
          )}

          {data.dealDate && (
            <Section title="Deal Timeline">
              <div className="text-sm space-y-1">
                <Row label="Deal Date" value={data.dealDate} />
                {data.dealDuration && <Row label="Duration" value={data.dealDuration} />}
              </div>
            </Section>
          )}

          {data.sourceInfo && (
            <Section title="Source / Context">
              <p className="text-sm text-gray-600 italic">{data.sourceInfo}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{title}</h3>
      <div className="bg-gray-50 rounded-lg p-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
