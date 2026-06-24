"use client";

import { useState } from "react";

import { Tooth } from "@/components/odontogram/Tooth";
import { OdontogramLegend } from "@/components/odontogram/OdontogramLegend";
import { ToothConditionMenu } from "@/components/odontogram/ToothConditionMenu";
import {
  isStructuralCondition,
  type ToothCondition,
  type ToothSurface,
  type DbToothSurface,
} from "@/lib/constants/toothConditions";
import type { ToothMap } from "@/lib/db/toothRecords";

// FDI raspored. Gornji red: 18→11 | 21→28. Donji red: 48→41 | 31→38.
const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

interface MenuState {
  toothNumber: number;
  surface: ToothSurface;
  x: number;
  y: number;
}

function ToothRow({
  numbers,
  numbersOn,
  map,
  onSurfaceClick,
  scale,
  large,
}: {
  numbers: number[];
  numbersOn: "top" | "bottom";
  map: ToothMap;
  onSurfaceClick: (
    toothNumber: number,
    surface: ToothSurface,
    x: number,
    y: number
  ) => void;
  scale: number;
  large: boolean;
}) {
  const left = numbers.slice(0, 8); // desni kvadrant pacijenta
  const right = numbers.slice(8); // levi kvadrant pacijenta

  const numberCls = large
    ? "text-xs tabular-nums text-venus-text-faint"
    : "text-[10px] tabular-nums text-venus-text-faint";
  const groupGap = large ? "gap-2" : "gap-1";

  const cell = (n: number) => (
    <div key={n} className="flex flex-col items-center gap-1">
      {numbersOn === "top" && <span className={numberCls}>{n}</span>}
      <Tooth
        toothNumber={n}
        surfaces={map[n]?.surfaces}
        wholeTooth={map[n]?.wholeTooth ?? null}
        onSurfaceClick={onSurfaceClick}
        scale={scale}
      />
      {numbersOn === "bottom" && <span className={numberCls}>{n}</span>}
    </div>
  );

  return (
    <div className={large ? "flex items-stretch gap-3" : "flex items-stretch gap-1.5"}>
      <div className={`flex ${groupGap}`}>{left.map(cell)}</div>
      {/* srednja linija (središnja vertikala vilice) */}
      <div className="mx-1 w-px self-stretch bg-venus-border" />
      <div className={`flex ${groupGap}`}>{right.map(cell)}</div>
    </div>
  );
}

/**
 * Prezentacioni odontogram — NE zna odakle podaci. Prima `map` i javlja izmene
 * kroz onSetCondition/onRemove. Tako isti prikaz služi i pravom pacijentu
 * (baza, preko Odontogram wrappera) i gostu (lokalni state na /odontogram).
 */
export function OdontogramView({
  map,
  size = "default",
  showHeader = true,
  onSetCondition,
  onRemove,
}: {
  map: ToothMap;
  size?: "default" | "large";
  showHeader?: boolean;
  onSetCondition: (
    toothNumber: number,
    surface: DbToothSurface,
    condition: ToothCondition
  ) => void;
  onRemove: (toothNumber: number, surface: DbToothSurface) => void;
}) {
  const large = size === "large";
  const scale = large ? 1.6 : 1;
  const [menu, setMenu] = useState<MenuState | null>(null);

  function openMenu(
    toothNumber: number,
    surface: ToothSurface,
    x: number,
    y: number
  ) {
    setMenu({ toothNumber, surface, x, y });
  }

  function handleSelect(condition: ToothCondition) {
    if (!menu) return;
    if (isStructuralCondition(condition)) {
      onSetCondition(menu.toothNumber, "ceo_zub", condition);
    } else {
      onSetCondition(menu.toothNumber, menu.surface, condition);
    }
    setMenu(null);
  }

  function handleReset() {
    if (!menu) return;
    const hasWhole = !!map[menu.toothNumber]?.wholeTooth;
    onRemove(menu.toothNumber, hasWhole ? "ceo_zub" : menu.surface);
    setMenu(null);
  }

  return (
    <section className="rounded-xl border border-venus-border bg-venus-surface p-5">
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-venus-text">
            Odontogram
          </h2>
          <span className="text-xs text-venus-text-faint">
            FDI numeracija · stalni zubi
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className={`mx-auto grid w-fit ${large ? "gap-6 py-2" : "gap-3"}`}>
          <ToothRow
            numbers={UPPER_ROW}
            numbersOn="top"
            map={map}
            onSurfaceClick={openMenu}
            scale={scale}
            large={large}
          />
          <ToothRow
            numbers={LOWER_ROW}
            numbersOn="bottom"
            map={map}
            onSurfaceClick={openMenu}
            scale={scale}
            large={large}
          />
        </div>
      </div>

      <OdontogramLegend />

      {menu && (
        <ToothConditionMenu
          toothNumber={menu.toothNumber}
          x={menu.x}
          y={menu.y}
          hasWholeTooth={!!map[menu.toothNumber]?.wholeTooth}
          onSelect={handleSelect}
          onReset={handleReset}
          onClose={() => setMenu(null)}
        />
      )}
    </section>
  );
}
