"use client";

import {
  TOOTH_CONDITIONS,
  TOOTH_CONDITION_CONFIG,
} from "@/lib/constants/toothConditions";

// Legenda boja stanja — isti izvor (TOOTH_CONDITION_CONFIG) kao bojenje zuba.
export function OdontogramLegend() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-venus-border pt-4">
      {TOOTH_CONDITIONS.map((c) => {
        const cfg = TOOTH_CONDITION_CONFIG[c];
        return (
          <span
            key={c}
            className="flex items-center gap-1.5 text-xs text-venus-text-dim"
          >
            <span
              className="size-3.5 shrink-0 rounded-[3px] border"
              style={{
                backgroundColor: cfg.color,
                borderColor: "var(--venus-tooth-line)",
              }}
            />
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}
