"use client";

import { useEffect } from "react";

import {
  SURFACE_CONDITIONS,
  STRUCTURAL_CONDITIONS,
  TOOTH_CONDITION_CONFIG,
  type ToothCondition,
} from "@/lib/constants/toothConditions";

// Procenjene dimenzije menija za klampovanje uz ivice ekrana.
const MENU_W = 200;
const MENU_H = 340;

export function ToothConditionMenu({
  toothNumber,
  x,
  y,
  hasWholeTooth,
  onSelect,
  onReset,
  onClose,
}: {
  toothNumber: number;
  x: number;
  y: number;
  hasWholeTooth: boolean;
  onSelect: (condition: ToothCondition) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Pozicija kod kursora, klampovana da meni ne iscuri van viewporta.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.max(8, Math.min(x, vw - MENU_W - 8));
  const top = Math.max(8, Math.min(y, vh - MENU_H - 8));

  return (
    // Pun-ekran overlay hvata klik van menija (zatvara).
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute w-[200px] rounded-lg border border-venus-border bg-venus-surface p-2 shadow-xl"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="px-2 py-1 text-xs font-semibold text-venus-text">
          Zub {toothNumber}
        </p>

        {/* Površinska stanja — samo ako zub NEMA strukturno stanje */}
        {!hasWholeTooth && (
          <>
            <p className="px-2 pt-1.5 text-[10px] uppercase tracking-wider text-venus-text-faint">
              Površina
            </p>
            {SURFACE_CONDITIONS.map((c) => (
              <MenuItem key={c} condition={c} onSelect={onSelect} />
            ))}
          </>
        )}

        <p className="px-2 pt-1.5 text-[10px] uppercase tracking-wider text-venus-text-faint">
          Ceo zub
        </p>
        {STRUCTURAL_CONDITIONS.map((c) => (
          <MenuItem key={c} condition={c} onSelect={onSelect} />
        ))}

        <button
          type="button"
          onClick={onReset}
          className="mt-1.5 flex w-full items-center gap-2 rounded-md border-t border-venus-border px-2 py-1.5 pt-2 text-left text-sm text-venus-text-dim transition-colors hover:bg-venus-surface-2"
        >
          <span className="flex size-3.5 shrink-0 items-center justify-center text-venus-text-faint">
            ✕
          </span>
          Zdrav / Obriši
        </button>
      </div>
    </div>
  );
}

function MenuItem({
  condition,
  onSelect,
}: {
  condition: ToothCondition;
  onSelect: (condition: ToothCondition) => void;
}) {
  const cfg = TOOTH_CONDITION_CONFIG[condition];
  return (
    <button
      type="button"
      onClick={() => onSelect(condition)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-venus-text transition-colors hover:bg-venus-surface-2"
    >
      <span
        className="size-3.5 shrink-0 rounded-[3px] border"
        style={{
          backgroundColor: cfg.color,
          borderColor: "var(--venus-tooth-line)",
        }}
      />
      {cfg.label}
    </button>
  );
}
