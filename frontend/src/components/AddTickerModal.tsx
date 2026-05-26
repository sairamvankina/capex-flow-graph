import { useState } from "react";
import { addCompany, addEtf } from "../api/graphApi";
import { categoryLabels } from "../utils/colors";
import { useDarkMode } from "../hooks/useDarkMode";
import type { Category } from "../types";

interface AddTickerModalProps {
  onClose: () => void;
  onAdded: () => void;
}

const categories: Category[] = [
  "mag7", "chips", "ai_software", "infra", "energy", "cooling", "photonics", "networking", "memory",
];

const etfSectors = [
  "Semiconductors", "Technology", "Software", "Memory/DRAM", "Energy", "Infrastructure", "AI/Robotics",
];

export function AddTickerModal({ onClose, onAdded }: AddTickerModalProps) {
  const [dark] = useDarkMode();
  const [type, setType] = useState<"stock" | "etf">("stock");
  const [ticker, setTicker] = useState("");
  const [category, setCategory] = useState<string>(categories[0]);
  const [sector, setSector] = useState(etfSectors[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status?: string; error?: string; name?: string } | null>(null);

  const handleSubmit = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      if (type === "stock") {
        const res = await addCompany(ticker.trim(), category);
        setResult(res);
        if (res.status === "ok") {
          setTimeout(onAdded, 1000);
        }
      } else {
        const res = await addEtf(ticker.trim(), sector);
        setResult(res);
        if (res.status === "ok") {
          setTimeout(onAdded, 1000);
        }
      }
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const bg = dark ? "bg-gray-800" : "bg-white";
  const textPrimary = dark ? "text-gray-100" : "text-gray-900";
  const textMuted = dark ? "text-gray-400" : "text-gray-500";
  const inputClass = `text-sm px-3 py-2 rounded-lg border w-full ${
    dark ? "bg-gray-700 border-gray-600 text-gray-100" : "bg-gray-50 border-gray-200 text-gray-800"
  } focus:outline-none focus:ring-1 focus:ring-indigo-400`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className={`${bg} rounded-xl shadow-2xl w-96 p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-lg font-bold ${textPrimary}`}>Add Ticker</h2>
          <button onClick={onClose} className={`${textMuted} hover:${textPrimary} text-xl`}>&times;</button>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setType("stock")}
            className={`flex-1 text-sm py-2 rounded-lg transition-colors ${
              type === "stock"
                ? "bg-indigo-500 text-white"
                : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
            }`}
          >
            Stock / Company
          </button>
          <button
            onClick={() => setType("etf")}
            className={`flex-1 text-sm py-2 rounded-lg transition-colors ${
              type === "etf"
                ? "bg-sky-500 text-white"
                : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
            }`}
          >
            ETF
          </button>
        </div>

        {/* Ticker input */}
        <div className="mb-3">
          <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Ticker Symbol</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder={type === "stock" ? "e.g. NVDA, MSFT" : "e.g. VGT, ARKK"}
            className={inputClass}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {/* Category / Sector selector */}
        <div className="mb-4">
          <label className={`text-xs font-medium ${textMuted} mb-1 block`}>
            {type === "stock" ? "Category" : "Sector"}
          </label>
          {type === "stock" ? (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{categoryLabels[cat]}</option>
              ))}
            </select>
          ) : (
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className={inputClass}
            >
              {etfSectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !ticker.trim()}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            loading || !ticker.trim()
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-indigo-500 text-white hover:bg-indigo-600"
          }`}
        >
          {loading ? "Fetching data..." : `Add ${type === "stock" ? "Company" : "ETF"}`}
        </button>

        {/* Result message */}
        {result && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${
            result.error
              ? dark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700"
              : dark ? "bg-green-900/30 text-green-300" : "bg-green-50 text-green-700"
          }`}>
            {result.error
              ? result.error
              : `Added ${result.name} (${ticker})`
            }
          </div>
        )}

        <p className={`text-[10px] ${textMuted} mt-3`}>
          Data is fetched from yfinance. The ticker must exist on Yahoo Finance.
        </p>
      </div>
    </div>
  );
}
