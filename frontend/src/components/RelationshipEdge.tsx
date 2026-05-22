import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { RelationshipData } from "../types";
import { relTypeColors } from "../utils/colors";
import { formatCurrency } from "../utils/formatters";

const relTypeLabels: Record<string, string> = {
  CUSTOMER_OF: "Customer",
  SUPPLIES: "Supplies",
  PARTNERS_WITH: "Partner",
  INVESTS_IN: "Investment",
  ACQUIRED: "Acquired",
  COMPETES_WITH: "Competes",
};

export function RelationshipEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
  } = props;

  const data = props.data as unknown as RelationshipData | undefined;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const color = relTypeColors[data?.relType ?? ""] || "#6b7280";
  const label = relTypeLabels[data?.relType ?? ""] || data?.relType || "";
  const amount = data?.amount ? formatCurrency(data.amount) : null;
  const dealDate = data?.dealDate ? new Date(data.dealDate).getFullYear().toString() : null;
  const importance = data?.strategicImportance;

  const strokeWidth =
    importance === "critical" ? 3 :
    importance === "high" ? 2 : 1;

  const dashArray = data?.relType === "COMPETES_WITH" ? "5,5" : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray: dashArray,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="bg-white/90 px-1.5 py-0.5 rounded text-[10px] border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="font-medium" style={{ color }}>
            {label}
          </div>
          {amount && <div className="text-gray-700 font-semibold">{amount}</div>}
          {dealDate && <div className="text-gray-400">Since {dealDate}</div>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
