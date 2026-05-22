import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode, ElkExtendedEdge } from "elkjs";
import { type Node, type Edge } from "@xyflow/react";

const elk = new ELK();

const NODE_WIDTH = 220;
const NODE_HEIGHT = 140;

export async function getLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const elkNodes: ElkNode[] = nodes.map((node) => ({
    id: node.id,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  }));

  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    },
    children: elkNodes,
    edges: elkEdges,
  });

  const layoutedNodes = nodes.map((node) => {
    const elkNode = graph.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: elkNode?.x ?? 0,
        y: elkNode?.y ?? 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
