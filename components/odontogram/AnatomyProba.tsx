"use client";

import { useEffect, useState } from "react";

import {
  TOOTH_CONDITIONS,
  TOOTH_CONDITION_CONFIG,
  type ToothCondition,
} from "@/lib/constants/toothConditions";

// Slika i koordinatni prostor (poligoni su u pikselima slike → overlay 1:1).
const IMG_SRC = "/anatomski%20zubi.jpg";
const IMG_W = 810;
const IMG_H = 379;

// Ručni mapping: JSON nema FDI/kruna-koren oznake (privremeno, za 4 zone).
const ZONE_MAP: Record<string, { tooth: number; part: "kruna" | "koren" }> = {
  "1": { tooth: 18, part: "koren" },
  "2": { tooth: 18, part: "kruna" },
  "3": { tooth: 17, part: "koren" },
  "4": { tooth: 17, part: "kruna" },
};

interface Zone {
  id: string;
  points: [number, number][];
}

interface MenuState {
  id: string;
  x: number;
  y: number;
}

// Stanja za izbor (sve osim 'zdrav' — zdrav = obriši).
const SELECTABLE = TOOTH_CONDITIONS.filter((c) => c !== "zdrav");

export function AnatomyProba() {
  const [zones, setZones] = useState<Zone[]>([]);
  // Lokalno stanje po zoni (NE baza): { "1": "karijes", ... }
  const [zoneState, setZoneState] = useState<Record<string, ToothCondition>>({});
  const [menu, setMenu] = useState<MenuState | null>(null);

  // Učitaj poligone iz public/mapiranje.json (test pipeline kao za pravi izvoz).
  useEffect(() => {
    fetch("/mapiranje.json")
      .then((r) => r.json())
      .then((data: Zone[]) => setZones(data))
      .catch(() => setZones([]));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function setCondition(id: string, condition: ToothCondition | null) {
    setZoneState((prev) => {
      const next = { ...prev };
      if (condition) next[id] = condition;
      else delete next[id];
      return next;
    });
    setMenu(null);
  }

  return (
    <div>
      <div className="relative mx-auto w-full max-w-[810px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG_SRC}
          alt="Anatomski prikaz zuba"
          width={IMG_W}
          height={IMG_H}
          className="block w-full select-none rounded-lg"
          draggable={false}
        />

        {/* SVG overlay — TAČNO preko slike (isti box, viewBox = px slike). */}
        <svg
          viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          {zones.map((z) => {
            const cond = zoneState[z.id];
            const cfg = cond ? TOOTH_CONDITION_CONFIG[cond] : null;
            const pts = z.points.map(([x, y]) => `${x},${y}`).join(" ");
            return (
              <polygon
                key={z.id}
                points={pts}
                strokeWidth={1.2}
                strokeLinejoin="round"
                style={{
                  stroke: "var(--venus-gold)",
                  ...(cfg
                    ? { fill: cfg.color, fillOpacity: 0.5 }
                    : {}),
                }}
                className={
                  cfg
                    ? "cursor-pointer"
                    : "cursor-pointer transition-[fill] [fill:transparent] hover:[fill:color-mix(in_srgb,var(--venus-gold)_22%,transparent)]"
                }
                onClick={(e) => setMenu({ id: z.id, x: e.clientX, y: e.clientY })}
              />
            );
          })}
        </svg>
      </div>

      {/* Meni stanja kod kursora */}
      {menu && (
        <div className="fixed inset-0 z-50" onClick={() => setMenu(null)}>
          <div
            className="absolute w-[200px] rounded-lg border border-venus-border bg-venus-surface p-2 shadow-xl"
            style={{
              left: Math.min(menu.x, IMG_W - 40),
              top: Math.min(menu.y, IMG_H + 120),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-2 py-1 text-xs font-semibold text-venus-text">
              Zub {ZONE_MAP[menu.id]?.tooth ?? menu.id}
              {ZONE_MAP[menu.id] ? ` — ${ZONE_MAP[menu.id].part}` : ""}
            </p>
            {SELECTABLE.map((c) => {
              const cfg = TOOTH_CONDITION_CONFIG[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(menu.id, c)}
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
            })}
            <button
              type="button"
              onClick={() => setCondition(menu.id, null)}
              className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-venus-border px-2 py-1.5 pt-2 text-left text-sm text-venus-text-dim transition-colors hover:bg-venus-surface-2"
            >
              ✕ Zdrav / Obriši
            </button>
          </div>
        </div>
      )}

      <p className="mx-auto mt-4 max-w-[810px] text-xs text-venus-text-faint">
        Proba (vizuelno, bez baze): 4 zone za zube 18 i 17 (kruna + koren). Klik
        na zonu → izbor stanja → boji lokalno.
      </p>
    </div>
  );
}
