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

const sectorEtfMap: Record<string, string[]> = {
  chips: ["SMH", "SOXX", "SOXL", "PSI"],
  memory: ["DRAM", "SMH"],
  ai_software: ["IGV", "QQQ"],
  mag7: ["QQQ", "XLK"],
  infra: ["QQQ"],
  networking: ["SMH"],
  photonics: ["SMH"],
  energy: [],
  cooling: [],
};

type FilterMode = "all" | Category;

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

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showEtfs, setShowEtfs] = useState(true);
  const [showHedgeFunds, setShowHedgeFunds] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("force");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [dark, setDark] = useDarkMode();
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGraph({ includeEtfs: true, includeHedgeFunds: true }).then(async (data) => {
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
    });
  }, [layoutMode]);

  useEffect(() => {
    const filteredNodes = allNodes.filter((n) => {
      const cat = (n.data as unknown as { category: string }).category;
      if (cat === "hedge_fund") return showHedgeFunds;
      if (cat === "etf") {
        if (!showEtfs) return false;
        if (filterMode === "all") return true;
        const ticker = (n.data as unknown as { ticker: string }).ticker;
        return sectorEtfMap[filterMode]?.includes(ticker) ?? false;
      }
      if (filterMode === "all") return true;
      return cat === filterMode;
    });
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = allEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    setNodes(filteredNodes);
    setEdges(filteredEdges);
    setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 50);
  }, [filterMode, allNodes, allEdges, showEtfs, showHedgeFunds, fitView]);

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
      setCenter(node.position.x + 110, node.position.y + 70, { zoom: 1.5, duration: 600 });
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
    if (detail.error) return;
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

  const panelBg = dark ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200";
  const textMuted = dark ? "text-gray-400" : "text-gray-500";
  const textPrimary = dark ? "text-gray-100" : "text-gray-800";

  return (
    <div className={`w-full h-full relative ${dark ? "dark bg-gray-950" : "bg-gray-50"}`}>
      {/* Left sidebar — filters */}
      <div className={`absolute top-3 left-3 z-40 w-52 rounded-xl border shadow-lg overflow-hidden ${panelBg}`}>
        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search... (Cmd+K)"
              className={`text-xs px-2.5 py-1.5 rounded-lg border w-full ${
                dark
                  ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500"
                  : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"
              } focus:outline-none focus:ring-1 focus:ring-indigo-400`}
            />
            {searchResults.length > 0 && (
              <div className={`absolute top-full mt-1 left-0 right-0 rounded-lg border shadow-lg overflow-hidden z-50 ${
                dark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
              }`}>
                {searchResults.map((n) => {
                  const d = n.data as unknown as { ticker?: string; name?: string; category?: string };
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleSearchSelect(n.id)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-1.5 ${
                        dark ? "hover:bg-gray-700" : "hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: categoryColors[d.category as Category] || "#6b7280" }}
                      />
                      <span className={`font-medium ${textPrimary}`}>{d.ticker || n.id}</span>
                      <span className={`${textMuted} truncate text-[10px]`}>{d.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sector filter */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className={`text-[10px] font-semibold uppercase mb-2 ${textMuted}`}>Sector</div>
          <div className="space-y-0.5">
            <button
              onClick={() => setFilterMode("all")}
              className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                filterMode === "all"
                  ? dark ? "bg-indigo-600/30 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                  : `${textMuted} hover:${dark ? "bg-gray-800" : "bg-gray-50"}`
              }`}
            >
              All Sectors
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterMode(filterMode === cat ? "all" : cat)}
                className={`w-full text-left text-xs px-2 py-1 rounded flex items-center gap-2 transition-colors ${
                  filterMode === cat
                    ? dark ? "bg-indigo-600/30 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                    : `${textMuted} hover:${dark ? "bg-gray-800" : "bg-gray-50"}`
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[cat] }} />
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Overlays */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className={`text-[10px] font-semibold uppercase mb-2 ${textMuted}`}>Overlays</div>
          <label className={`flex items-center gap-2 text-xs cursor-pointer py-0.5 ${textPrimary}`}>
            <input
              type="checkbox"
              checked={showEtfs}
              onChange={() => setShowEtfs((v) => !v)}
              className="rounded border-gray-300 text-sky-500 focus:ring-sky-400"
            />
            ETFs
            {filterMode !== "all" && showEtfs && (
              <span className={`text-[10px] ${textMuted}`}>
                ({sectorEtfMap[filterMode]?.length || 0})
              </span>
            )}
          </label>
          <label className={`flex items-center gap-2 text-xs cursor-pointer py-0.5 ${textPrimary}`}>
            <input
              type="checkbox"
              checked={showHedgeFunds}
              onChange={() => setShowHedgeFunds((v) => !v)}
              className="rounded border-gray-300 text-violet-500 focus:ring-violet-400"
            />
            Hedge Funds (13F)
          </label>
        </div>

        {/* Layout + Dark mode */}
        <div className="p-3">
          <div className={`text-[10px] font-semibold uppercase mb-2 ${textMuted}`}>Layout</div>
          <select
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
            className={`text-xs px-2 py-1 rounded-lg border w-full mb-2 ${
              dark ? "bg-gray-800 border-gray-600 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-700"
            }`}
          >
            <option value="force">Force (Grouped)</option>
            <option value="layered">Layered (Top-Down)</option>
            <option value="radial">Radial</option>
          </select>
          <button
            onClick={() => setDark((v) => !v)}
            className={`text-xs px-2 py-1 rounded-lg border w-full transition-colors ${
              dark ? "bg-gray-800 border-gray-600 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-700"
            }`}
          >
            {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
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
        minZoom={0.1}
        maxZoom={3}
        className={highlightedNode ? "highlighted-active" : ""}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={dark ? 30 : 20}
          size={dark ? 0.5 : 1}
          color={dark ? "#374151" : "#e5e7eb"}
        />
        <Controls position="bottom-right" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const cat = (node.data as unknown as { category?: string })?.category;
            if (cat === "hedge_fund") return "#7c3aed";
            if (cat === "etf") return "#0ea5e9";
            return categoryColors[cat as Category] || "#6b7280";
          }}
          maskColor={dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.08)"}
          style={dark ? { backgroundColor: "#1f2937" } : {}}
          position="bottom-left"
        />
      </ReactFlow>

      {/* Legend */}
      <div className={`absolute bottom-4 right-24 z-40 rounded-lg border shadow-sm px-3 py-2 ${panelBg}`}>
        <div className="flex gap-3">
          {[
            { label: "Customer", color: "#6366f1" },
            { label: "Supply", color: "#10b981" },
            { label: "Partner", color: "#f59e0b" },
            { label: "Invest", color: "#ef4444" },
            { label: "Competes", color: "#6b7280", dashed: true },
            { label: "Holds", color: "#7c3aed" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
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
