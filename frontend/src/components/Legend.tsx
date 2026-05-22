import { relTypeColors } from "../utils/colors";

const relLabels: Record<string, string> = {
  CUSTOMER_OF: "Customer",
  SUPPLIES: "Supplies",
  PARTNERS_WITH: "Partner",
  INVESTS_IN: "Investment",
  COMPETES_WITH: "Competes",
};

export function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-40 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
      <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Relationship Types</div>
      <div className="space-y-1">
        {Object.entries(relLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <div
              className="w-4 h-0.5 rounded"
              style={{
                backgroundColor: relTypeColors[key],
                border: key === "COMPETES_WITH" ? "none" : undefined,
                borderTop: key === "COMPETES_WITH" ? `2px dashed ${relTypeColors[key]}` : undefined,
                height: key === "COMPETES_WITH" ? 0 : undefined,
              }}
            />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
