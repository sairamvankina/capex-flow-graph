import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode, ElkExtendedEdge } from "elkjs";
import { type Node, type Edge } from "@xyflow/react";

const elk = new ELK();

const NODE_WIDTH = 220;
const NODE_HEIGHT = 140;

export type LayoutMode = "force" | "layered" | "radial";

export async function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  mode: LayoutMode = "force"
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  if (mode === "force") {
    return getGroupedForceLayout(nodes, edges);
  }

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

  const layoutOptions = getLayoutOptions(mode);

  const graph = await elk.layout({
    id: "root",
    layoutOptions,
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

async function getGroupedForceLayout(
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const groups = new Map<string, Node[]>();
  for (const node of nodes) {
    const cat = (node.data as unknown as { category?: string }).category || "other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(node);
  }

  const groupNodes: ElkNode[] = [];
  const groupIds = new Map<string, string>();

  for (const [cat, catNodes] of groups) {
    const groupId = `group_${cat}`;
    groupIds.set(cat, groupId);
    groupNodes.push({
      id: groupId,
      layoutOptions: {
        "elk.algorithm": "force",
        "elk.force.iterations": "200",
        "elk.spacing.nodeNode": "60",
        "elk.padding": "[top=40,left=20,bottom=20,right=20]",
      },
      children: catNodes.map((node) => ({
        id: node.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })),
      edges: edges
        .filter((e) => {
          const srcInGroup = catNodes.some((n) => n.id === e.source);
          const tgtInGroup = catNodes.some((n) => n.id === e.target);
          return srcInGroup && tgtInGroup;
        })
        .map((e) => ({
          id: `inner_${e.id}`,
          sources: [e.source],
          targets: [e.target],
        })),
    });
  }

  const interGroupEdges: ElkExtendedEdge[] = edges
    .filter((e) => {
      const srcCat = (nodes.find((n) => n.id === e.source)?.data as unknown as { category?: string })?.category || "other";
      const tgtCat = (nodes.find((n) => n.id === e.target)?.data as unknown as { category?: string })?.category || "other";
      return srcCat !== tgtCat;
    })
    .map((e) => {
      const srcCat = (nodes.find((n) => n.id === e.source)?.data as unknown as { category?: string })?.category || "other";
      const tgtCat = (nodes.find((n) => n.id === e.target)?.data as unknown as { category?: string })?.category || "other";
      return {
        id: `outer_${e.id}`,
        sources: [groupIds.get(srcCat)!],
        targets: [groupIds.get(tgtCat)!],
      };
    });

  const graph = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "force",
      "elk.force.iterations": "300",
      "elk.spacing.nodeNode": "150",
      "elk.force.repulsion": "3.0",
    },
    children: groupNodes,
    edges: interGroupEdges,
  });

  const positionMap = new Map<string, { x: number; y: number }>();
  for (const group of graph.children || []) {
    const gx = group.x ?? 0;
    const gy = group.y ?? 0;
    for (const child of group.children || []) {
      positionMap.set(child.id, {
        x: gx + (child.x ?? 0),
        y: gy + (child.y ?? 0),
      });
    }
  }

  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positionMap.get(node.id) ?? { x: 0, y: 0 },
  }));

  return { nodes: layoutedNodes, edges };
}

function getLayoutOptions(mode: LayoutMode): Record<string, string> {
  switch (mode) {
    case "force":
      return {
        "elk.algorithm": "force",
        "elk.force.iterations": "300",
        "elk.spacing.nodeNode": "120",
        "elk.force.repulsion": "2.0",
      };
    case "radial":
      return {
        "elk.algorithm": "radial",
        "elk.spacing.nodeNode": "100",
        "elk.radial.compactor": "WEDGE_COMPACTION",
      };
    case "layered":
      return {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.spacing.nodeNode": "80",
        "elk.layered.spacing.nodeNodeBetweenLayers": "120",
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      };
  }
}
