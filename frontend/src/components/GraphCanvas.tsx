import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CompanyNode } from "./CompanyNode";
import { RelationshipEdge } from "./RelationshipEdge";
import { DetailPanel } from "./DetailPanel";
import { EdgeDetailPanel } from "./EdgeDetailPanel";
import { FilterBar } from "./FilterBar";
import { Legend } from "./Legend";
import { getLayoutedElements } from "../layout/elkLayout";
import { fetchGraph, fetchCompanyDetail } from "../api/graphApi";
import type { Category, CompanyData, RelationshipData } from "../types";
import { categoryColors } from "../utils/colors";

const nodeTypes = { companyNode: CompanyNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

export function GraphCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const [selectedRelationships, setSelectedRelationships] = useState<
    Array<{ relType: string; direction: "incoming" | "outgoing"; otherTicker: string; otherName: string; props: Record<string, unknown> }>
  >([]);
  const [selectedEdge, setSelectedEdge] = useState<{
    source: string;
    target: string;
    data: RelationshipData;
  } | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(["mag7", "chips", "ai_software", "infra", "energy", "cooling", "photonics", "networking", "memory"])
  );
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);

  useEffect(() => {
    fetchGraph().then(async (data) => {
      const rawNodes: Node[] = data.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data as unknown as Record<string, unknown>,
      }));
      const rawEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        data: e.data as unknown as Record<string, unknown>,
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
      }));
      const { nodes: layouted, edges: layoutedEdges } = await getLayoutedElements(rawNodes, rawEdges);
      setAllNodes(layouted);
      setAllEdges(layoutedEdges);
      setNodes(layouted);
      setEdges(layoutedEdges);
    });
  }, []);

  useEffect(() => {
    const filteredNodes = allNodes.filter((n) =>
      activeCategories.has((n.data as unknown as CompanyData).category)
    );
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = allEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [activeCategories, allNodes, allEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(async (_event, node) => {
    setSelectedEdge(null);
    const detail = await fetchCompanyDetail(node.id);
    setSelectedCompany(detail.company as unknown as CompanyData);
    setSelectedRelationships(detail.relationships);
  }, []);

  const onEdgeClick: EdgeMouseHandler = useCallback((_event, edge) => {
    setSelectedCompany(null);
    setSelectedEdge({
      source: edge.source,
      target: edge.target,
      data: edge.data as unknown as RelationshipData,
    });
  }, []);

  const toggleCategory = useCallback((cat: Category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  return (
    <div className="w-full h-screen relative">
      <FilterBar activeCategories={activeCategories} onToggleCategory={toggleCategory} />
      <Legend />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => categoryColors[(node.data as unknown as CompanyData)?.category] || "#ccc"}
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>

      <DetailPanel
        company={selectedCompany}
        relationships={selectedRelationships}
        onClose={() => setSelectedCompany(null)}
      />

      <EdgeDetailPanel
        edge={selectedEdge}
        onClose={() => setSelectedEdge(null)}
      />
    </div>
  );
}
