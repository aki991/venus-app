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
  // Površinska stanja po zoni (prazno → zdrav).
  surfaces?: Partial<Record<ToothSurface, ToothCondition>>;
  // Strukturno stanje celog zuba (boji sve zone); null → nema.
  wholeTooth?: ToothCondition | null;
  // Klik na zonu → koordinate kursora za pozicioniranje menija.
  onSurfaceClick?: (
    toothNumber: number,
    surface: ToothSurface,
    x: number,
    y: number
  ) => void;
  // Vizuelno uvećanje (npr. 1.6 na radnom stolu). Geometrija ostaje ista
  // (viewBox), skalira se samo prikazana veličina → ostaje vektorski oštro.
  scale?: number;
}

export function Tooth({
  toothNumber,
  surfaces,
  wholeTooth = null,
  onSurfaceClick,
  scale = 1,
}: ToothProps) {
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

  // Strukturno stanje boji sve zone u svoju boju; inače boja zone po stanju.
  function colorFor(surface: ToothSurface): string {
    const cond: ToothCondition = wholeTooth ?? surfaces?.[surface] ?? "zdrav";
    return TOOTH_CONDITION_CONFIG[cond].color;
  }

  function handleClick(surface: ToothSurface, x: number, y: number) {
    onSurfaceClick?.(toothNumber, surface, x, y);
  }

  return (
    <svg
      width={W * scale}
      height={H * scale}
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
          onClick={(e) => handleClick(z.surface, e.clientX, e.clientY)}
        />
      ))}

      {/* Izvađen zub: X preko cele ćelije (klik i dalje prolazi na zone ispod). */}
      {wholeTooth === "izvadjen" && (
        <g style={{ pointerEvents: "none" }} stroke="#1f1f1f" strokeWidth={2}>
          <line x1={3} y1={3} x2={W - 3} y2={H - 3} />
          <line x1={W - 3} y1={3} x2={3} y2={H - 3} />
        </g>
      )}
    </svg>
  );
}
