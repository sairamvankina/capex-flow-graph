import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CompanyNode } from "./CompanyNode";
import { EtfNode } from "./EtfNode";
import { HedgeFundNode } from "./HedgeFundNode";
import { RelationshipEdge } from "./RelationshipEdge";
import { DetailPanel } from "./DetailPanel";
import { EdgeDetailPanel } from "./EdgeDetailPanel";
import { getLayoutedElements, type LayoutMode } from "../layout/elkLayout";
import { fetchGraph, fetchCompanyDetail } from "../api/graphApi";
import type { Category, CompanyData, RelationshipData } from "../types";
import { categoryColors, categoryLabels } from "../utils/colors";
import { useDarkMode } from "../hooks/useDarkMode";

const nodeTypes = { companyNode: CompanyNode, etfNode: EtfNode, hedgeFundNode: HedgeFundNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

const allCategories: Category[] = [
  "mag7", "chips", "ai_software", "infra", "energy", "cooling", "photonics", "networking", "memory",
];

function GraphCanvasInner() {
  const { fitView, setCenter } = useReactFlow();
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
    new Set(allCategories)
  );
  const [showEtfs, setShowEtfs] = useState(false);
  const [showHedgeFunds, setShowHedgeFunds] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("force");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [dark, setDark] = useDarkMode();
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGraph({ includeEtfs: showEtfs, includeHedgeFunds: showHedgeFunds }).then(async (data) => {
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
      const { nodes: layouted, edges: layoutedEdges } = await getLayoutedElements(rawNodes, rawEdges, layoutMode);
      setAllNodes(layouted);
      setAllEdges(layoutedEdges);
      setNodes(layouted);
      setEdges(layoutedEdges);
    });
  }, [showEtfs, showHedgeFunds, layoutMode]);

  useEffect(() => {
    const filteredNodes = allNodes.filter((n) => {
      const cat = (n.data as unknown as { category: string }).category;
      if (cat === "hedge_fund") return showHedgeFunds;
      if (cat === "etf") return showEtfs;
      return activeCategories.has(cat as Category);
    });
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = allEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [activeCategories, allNodes, allEdges, showEtfs, showHedgeFunds]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allNodes.filter((n) => {
      const d = n.data as unknown as { ticker?: string; name?: string };
      return d.ticker?.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [searchQuery, allNodes]);

  const handleSearchSelect = useCallback((nodeId: string) => {
    const node = allNodes.find((n) => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 110, node.position.y + 70, { zoom: 1.2, duration: 600 });
      setHighlightedNode(nodeId);
      setTimeout(() => setHighlightedNode(null), 2000);
    }
    setSearchQuery("");
  }, [allNodes, setCenter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  const panelBg = dark ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200";
  const textMuted = dark ? "text-gray-400" : "text-gray-500";
  const textPrimary = dark ? "text-gray-100" : "text-gray-800";

  return (
    <div className={`w-full h-screen relative ${dark ? "dark bg-gray-950" : "bg-gray-50"}`}>
      {/* Top toolbar */}
      <div className={`absolute top-4 left-4 right-4 z-40 flex items-start gap-3 flex-wrap`}>
        {/* Search */}
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticker or company... (Cmd+K)"
            className={`text-sm px-3 py-2 rounded-lg border shadow-sm w-64 ${
              dark
                ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
            } focus:outline-none focus:ring-2 focus:ring-indigo-400`}
          />
          {searchResults.length > 0 && (
            <div className={`absolute top-full mt-1 w-full rounded-lg border shadow-lg overflow-hidden ${
              dark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
            }`}>
              {searchResults.map((n) => {
                const d = n.data as unknown as { ticker?: string; name?: string; category?: string };
                return (
                  <button
                    key={n.id}
                    onClick={() => handleSearchSelect(n.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                      dark ? "hover:bg-gray-700" : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColors[d.category as Category] || "#6b7280" }}
                    />
                    <span className={`font-medium ${textPrimary}`}>{d.ticker || n.id}</span>
                    <span className={`${textMuted} truncate`}>{d.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Category filters */}
        <div className={`flex flex-wrap gap-1.5 items-center rounded-lg border shadow-sm px-3 py-2 ${panelBg}`}>
          {allCategories.map((cat) => {
            const active = activeCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                  active ? "text-white border-transparent" : `${textMuted} border-gray-300 dark:border-gray-600`
                }`}
                style={active ? { backgroundColor: categoryColors[cat] } : {}}
              >
                {categoryLabels[cat]}
              </button>
            );
          })}
        </div>

        {/* Overlay toggles */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowEtfs((v) => !v)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
              showEtfs
                ? "bg-sky-500/20 border-sky-400 text-sky-300"
                : `${panelBg} ${textMuted} hover:border-sky-400`
            }`}
          >
            ETFs
          </button>
          <button
            onClick={() => setShowHedgeFunds((v) => !v)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
              showHedgeFunds
                ? "bg-violet-500/20 border-violet-400 text-violet-300"
                : `${panelBg} ${textMuted} hover:border-violet-400`
            }`}
          >
            13F
          </button>
        </div>

        {/* Right side controls */}
        <div className="ml-auto flex gap-1.5">
          {/* Layout selector */}
          <select
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
            className={`text-[11px] px-2 py-1.5 rounded-lg border ${
              dark ? "bg-gray-800 border-gray-600 text-gray-200" : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            <option value="force">Force Layout</option>
            <option value="layered">Layered</option>
            <option value="radial">Radial</option>
          </select>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark((v) => !v)}
            className={`text-sm px-2.5 py-1.5 rounded-lg border transition-colors ${panelBg}`}
            title="Toggle dark mode"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

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
        minZoom={0.2}
        maxZoom={3}
        className={highlightedNode ? "highlighted-active" : ""}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={dark ? 30 : 20}
          size={dark ? 0.5 : 1}
          color={dark ? "#374151" : "#e5e7eb"}
        />
        <Controls
          position="bottom-right"
          className={dark ? "dark-controls" : ""}
        />
        <MiniMap
          nodeColor={(node) => {
            const cat = (node.data as unknown as { category?: string })?.category;
            if (cat === "hedge_fund") return "#7c3aed";
            if (cat === "etf") return "#0ea5e9";
            return categoryColors[cat as Category] || "#6b7280";
          }}
          maskColor={dark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.1)"}
          style={dark ? { backgroundColor: "#1f2937" } : {}}
          position="bottom-left"
        />
      </ReactFlow>

      {/* Relationship legend */}
      <div className={`absolute bottom-4 left-56 z-40 rounded-lg border shadow-sm px-3 py-2 ${panelBg}`}>
        <div className="flex gap-3">
          {[
            { key: "CUSTOMER_OF", label: "Customer", color: "#6366f1" },
            { key: "SUPPLIES", label: "Supply", color: "#10b981" },
            { key: "PARTNERS_WITH", label: "Partner", color: "#f59e0b" },
            { key: "INVESTS_IN", label: "Investment", color: "#ef4444" },
            { key: "COMPETES_WITH", label: "Competes", color: "#6b7280", dashed: true },
            { key: "HOLDS_POSITION", label: "Holds", color: "#7c3aed" },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <div
                className="w-4 h-0.5"
                style={{
                  backgroundColor: item.dashed ? "transparent" : item.color,
                  borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
                }}
              />
              <span className={`text-[10px] ${textMuted}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

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

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
