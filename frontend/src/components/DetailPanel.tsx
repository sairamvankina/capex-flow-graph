import type { CompanyData } from "../types";
import { categoryColors, categoryLabels } from "../utils/colors";
import { formatCurrency, formatPercent } from "../utils/formatters";

interface DetailPanelProps {
  company: CompanyData | null;
  relationships: Array<{
    relType: string;
    direction: "incoming" | "outgoing";
    otherTicker: string;
    otherName: string;
    props: Record<string, unknown>;
  }>;
  onClose: () => void;
}

export function DetailPanel({ company, relationships, onClose }: DetailPanelProps) {
  if (!company) return null;

  const borderColor = categoryColors[company.category] || "#6b7280";

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl border-l overflow-y-auto z-50">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{company.ticker}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-1">{company.name}</div>
        <div
          className="inline-block text-xs px-2 py-0.5 rounded-full text-white mb-4"
          style={{ backgroundColor: borderColor }}
        >
          {categoryLabels[company.category]}
        </div>

        <div className="space-y-3">
          <Section title="Valuation">
            <Row label="Market Cap" value={formatCurrency(company.marketCap)} />
            <Row label="P/E Ratio" value={company.peRatio?.toFixed(1) ?? "N/A"} />
            <Row label="EPS" value={company.eps ? `$${company.eps.toFixed(2)}` : "N/A"} />
          </Section>

          <Section title="Growth">
            <Row label="Revenue" value={formatCurrency(company.revenue)} />
            <Row label="Revenue Growth" value={formatPercent(company.revenueGrowth)} />
          </Section>

          <Section title="Profitability">
            <Row label="Gross Margin" value={formatPercent(company.grossMargin)} />
            <Row label="Operating Margin" value={formatPercent(company.operatingMargin)} />
            <Row label="Net Margin" value={formatPercent(company.netMargin)} />
          </Section>

          <Section title="Strength">
            <Row label="Competitive Moat" value={company.competitiveMoat} />
            <Row label="Sentiment" value={company.sentiment} />
            <Row label="Pick & Shovel" value={company.pickAndShovel ? "Yes" : "No"} />
          </Section>

          {company.revenueBreakdown && (
            <Section title="Revenue Breakdown">
              {(() => {
                try {
                  const segments = typeof company.revenueBreakdown === "string"
                    ? JSON.parse(company.revenueBreakdown)
                    : company.revenueBreakdown;
                  return segments.map((seg: { name: string; pct: number; growth: number }, i: number) => (
                    <div key={i} className="mb-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">{seg.name}</span>
                        <span className="font-medium">{(seg.pct * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-400"
                            style={{ width: `${Math.min(seg.pct * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] ${seg.growth >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {seg.growth >= 0 ? "+" : ""}{(seg.growth * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ));
                } catch { return null; }
              })()}
            </Section>
          )}

          {relationships.length > 0 && (
            <Section title="Relationships">
              {relationships.map((rel, i) => (
                <div key={i} className="text-xs py-1 border-b last:border-0">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {rel.direction === "outgoing" ? `→ ${rel.otherTicker}` : `← ${rel.otherTicker}`}
                    </span>
                    <span className="text-gray-400">{rel.relType.replace(/_/g, " ")}</span>
                  </div>
                  {typeof rel.props.description === "string" && (
                    <div className="text-gray-500 mt-0.5">{rel.props.description}</div>
                  )}
                  {typeof rel.props.amount === "number" && (
                    <div className="text-gray-600 font-medium">
                      {formatCurrency(rel.props.amount)}
                    </div>
                  )}
                </div>
              ))}
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
      <div className="bg-gray-50 rounded-lg p-2 space-y-1">{children}</div>
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
