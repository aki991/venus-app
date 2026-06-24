"use client";

import {
  TOOTH_CONDITION_CONFIG,
  type ToothCondition,
  type ToothSurface,
} from "@/lib/constants/toothConditions";

// Anatomska širina po poslednjoj cifri FDI broja (visina je fiksna za sve):
//   molari (6,7,8) najširi, premolari (4,5) uži, očnjak+sekutići (1,2,3) najuži.
const WIDE = 40;
const MEDIUM = 32;
const NARROW = 26;
const HEIGHT = 44;

function toothWidth(toothNumber: number): number {
  const d = toothNumber % 10;
  return d >= 6 ? WIDE : d >= 4 ? MEDIUM : NARROW;
}

export interface ToothProps {
  toothNumber: number;
  // Stanje po površini; prazno → sve 'zdrav' (O1). O2 popunjava iz baze.
  conditions?: Partial<Record<ToothSurface, ToothCondition>>;
  onSurfaceClick?: (toothNumber: number, surface: ToothSurface) => void;
}

export function Tooth({ toothNumber, conditions, onSurfaceClick }: ToothProps) {
  // Mezijalno = ka središnjoj liniji. Za desne kvadrante (Q1 gore-desno,
  // Q4 dole-desno) mezijalno je na DESNOJ strani ćelije; inače na levoj.
  const quadrant = Math.floor(toothNumber / 10);
  const mezijalnoRight = quadrant === 1 || quadrant === 4;
  const rightSurface: ToothSurface = mezijalnoRight ? "mezijalno" : "distalno";
  const leftSurface: ToothSurface = mezijalnoRight ? "distalno" : "mezijalno";

  // Ćelija W×HEIGHT podeljena na 5 zona: centralni kvadrat (okluzalno) +
  // 4 trapeza. Inset 30% skalira zone proporcionalno širini zuba.
  const W = toothWidth(toothNumber);
  const H = HEIGHT;
  const ix = +(W * 0.3).toFixed(2);
  const iy = +(H * 0.3).toFixed(2);

  const zones: { surface: ToothSurface; points: string }[] = [
    { surface: "vestibularno", points: `0,0 ${W},0 ${W - ix},${iy} ${ix},${iy}` },
    {
      surface: rightSurface,
      points: `${W},0 ${W},${H} ${W - ix},${H - iy} ${W - ix},${iy}`,
    },
    {
      surface: "lingvalno",
      points: `${W},${H} 0,${H} ${ix},${H - iy} ${W - ix},${H - iy}`,
    },
    {
      surface: leftSurface,
      points: `0,${H} 0,0 ${ix},${iy} ${ix},${H - iy}`,
    },
    {
      surface: "okluzalno",
      points: `${ix},${iy} ${W - ix},${iy} ${W - ix},${H - iy} ${ix},${H - iy}`,
    },
  ];

  function colorFor(surface: ToothSurface): string {
    const cond: ToothCondition = conditions?.[surface] ?? "zdrav";
    return TOOTH_CONDITION_CONFIG[cond].color;
  }

  function handleClick(surface: ToothSurface) {
    if (onSurfaceClick) onSurfaceClick(toothNumber, surface);
    // O1: bez čuvanja — samo signal da je interaktivno (O2 aktivira izbor).
    else console.log(`zub ${toothNumber} / ${surface}`);
  }

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block"
      role="img"
      aria-label={`Zub ${toothNumber}`}
    >
      {zones.map((z) => (
        <polygon
          key={z.surface}
          points={z.points}
          strokeWidth={1}
          strokeLinejoin="round"
          style={{ fill: colorFor(z.surface), stroke: "var(--venus-tooth-line)" }}
          className="cursor-pointer transition-opacity hover:opacity-60"
          onClick={() => handleClick(z.surface)}
        />
      ))}
    </svg>
  );
}
