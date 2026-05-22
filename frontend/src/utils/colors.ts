import type { Category } from "../types";

export const categoryColors: Record<Category, string> = {
  mag7: "#6366f1",
  chips: "#10b981",
  ai_software: "#8b5cf6",
  infra: "#f59e0b",
  energy: "#ef4444",
  cooling: "#06b6d4",
  photonics: "#f97316",
  networking: "#3b82f6",
  memory: "#ec4899",
};

export const categoryLabels: Record<Category, string> = {
  mag7: "Mag 7",
  chips: "Chips/Semis",
  ai_software: "AI Software",
  infra: "Infrastructure",
  energy: "Energy",
  cooling: "Cooling",
  photonics: "Photonics",
  networking: "Networking",
  memory: "Memory",
};

export const relTypeColors: Record<string, string> = {
  CUSTOMER_OF: "#6366f1",
  SUPPLIES: "#10b981",
  PARTNERS_WITH: "#f59e0b",
  INVESTS_IN: "#ef4444",
  ACQUIRED: "#dc2626",
  COMPETES_WITH: "#6b7280",
  HOLDS_POSITION: "#7c3aed",
};
