import type { Category } from "../types";
import { categoryColors, categoryLabels } from "../utils/colors";

interface FilterBarProps {
  activeCategories: Set<Category>;
  onToggleCategory: (cat: Category) => void;
}

const allCategories: Category[] = [
  "mag7", "chips", "ai_software", "infra", "energy", "cooling", "photonics", "networking", "memory",
];

export function FilterBar({ activeCategories, onToggleCategory }: FilterBarProps) {
  return (
    <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
      <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Filter by Category</div>
      <div className="flex flex-wrap gap-1.5">
        {allCategories.map((cat) => {
          const active = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => onToggleCategory(cat)}
              className={`text-xs px-2 py-1 rounded-full border transition-all ${
                active ? "text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"
              }`}
              style={active ? { backgroundColor: categoryColors[cat] } : {}}
            >
              {categoryLabels[cat]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
