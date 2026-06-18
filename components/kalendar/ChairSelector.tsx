"use client";

import { Armchair } from "lucide-react";

import { cn } from "@/lib/utils";
import { useChairs } from "@/hooks/useChairs";
import { useKalendarStore } from "@/stores/kalendarStore";

/**
 * Selektor stolice u headeru kalendara.
 * - 0 stolica (ili učitavanje): ništa se ne renderuje
 * - 1 stolica: diskretan label (nema šta da se bira → ne smeta UI-u)
 * - 2+ stolica: pill toggle (kao Standard/Fokus); klik bira stolicu
 */
export function ChairSelector() {
  const { data: chairs } = useChairs();
  const selectedChairId = useKalendarStore((s) => s.selectedChairId);
  const setSelectedChairId = useKalendarStore((s) => s.setSelectedChairId);

  if (!chairs || chairs.length === 0) return null;

  if (chairs.length === 1) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-venus-border px-3 py-1 text-xs font-medium text-venus-text-dim">
        <Armchair size={13} />
        {chairs[0].name}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-venus-surface-2 p-1">
      {chairs.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setSelectedChairId(c.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selectedChairId === c.id
              ? "bg-venus-gold text-[#0d0d0d]"
              : "text-venus-text-dim hover:text-venus-text"
          )}
        >
          <Armchair size={13} />
          {c.name}
        </button>
      ))}
    </div>
  );
}
