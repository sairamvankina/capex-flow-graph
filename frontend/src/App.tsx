import { useState } from "react";
import { GraphCanvas } from "./components/GraphCanvas";
import { GrowthPanel } from "./components/GrowthPanel";
import { useDarkMode } from "./hooks/useDarkMode";

function App() {
  const [activeTab, setActiveTab] = useState<"graph" | "growth">("graph");
  const [dark] = useDarkMode();

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
        <div className={`ml-auto text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
          CapEx Flow Graph
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "graph" && <GraphCanvas />}
        {activeTab === "growth" && <GrowthPanel />}
      </div>
    </div>
  );
}

export default App;
