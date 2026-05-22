import { useState, useCallback } from "react";
import { GraphCanvas } from "./components/GraphCanvas";
import { GrowthPanel } from "./components/GrowthPanel";
import { useDarkMode } from "./hooks/useDarkMode";
import { refreshData } from "./api/graphApi";

function App() {
  const [activeTab, setActiveTab] = useState<"graph" | "growth">("graph");
  const [dark] = useDarkMode();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData("all");
      setRefreshKey((k) => k + 1);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col ${dark ? "dark bg-gray-950" : "bg-gray-50"}`}>
      {/* Tab bar */}
      <div className={`flex items-center gap-1 px-4 py-2 border-b ${
        dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <button
          onClick={() => setActiveTab("graph")}
          className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
            activeTab === "graph"
              ? dark ? "bg-indigo-600 text-white" : "bg-indigo-500 text-white"
              : dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Graph
        </button>
        <button
          onClick={() => setActiveTab("growth")}
          className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
            activeTab === "growth"
              ? dark ? "bg-indigo-600 text-white" : "bg-indigo-500 text-white"
              : dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Growth
        </button>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              refreshing
                ? "opacity-50 cursor-not-allowed"
                : dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
          <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
            CapEx Flow Graph
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "graph" && <GraphCanvas key={refreshKey} />}
        {activeTab === "growth" && <GrowthPanel key={refreshKey} />}
      </div>
    </div>
  );
}

export default App;
