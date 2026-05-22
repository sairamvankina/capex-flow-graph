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
  INVESTS_IN: "Invests",
  ACQUIRED: "Acquired",
  COMPETES_WITH: "Competes",
  HOLDS_POSITION: "Holds",
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
  const label = relTypeLabels[data?.relType ?? ""] || data?.relType?.replace(/_/g, " ") || "";
  const amount = data?.amount ? formatCurrency(data.amount) : null;
  const importance = data?.strategicImportance;

  const strokeWidth =
    importance === "critical" ? 3.5 :
    importance === "high" ? 2.5 :
    importance === "medium" ? 1.5 : 1;

  const dashArray = data?.relType === "COMPETES_WITH" ? "6,4" : undefined;
  const animated = data?.relType === "INVESTS_IN" || data?.relType === "HOLDS_POSITION";

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
          opacity: 0.8,
        }}
      />
      {(amount || label) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="bg-white/90 dark:bg-gray-800/90 px-1.5 py-0.5 rounded text-[10px] border border-gray-200 dark:border-gray-600 shadow-sm cursor-pointer hover:shadow-md transition-shadow backdrop-blur-sm"
          >
            <div className="font-medium" style={{ color }}>
              {label}
            </div>
            {amount && <div className="text-gray-700 dark:text-gray-200 font-semibold">{amount}</div>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
