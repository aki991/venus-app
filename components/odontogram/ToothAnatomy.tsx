"use client";

import {
  getCrownType,
  getRootCount,
  type CrownType,
} from "@/lib/constants/toothAnatomy";
import {
  TOOTH_CONDITION_CONFIG,
  type AnatomySurface,
  type ToothCondition,
} from "@/lib/constants/toothConditions";
import type { ToothState } from "@/lib/db/toothRecords";

// Bazna visina anatomskog dela (kruna + koren). Skalira se kroz `scale`.
const HEIGHT = 58;

// Zajednička geometrija krune i korena (da se dva odvojena puta tačno spoje).
const Y_TOP = 5; // ivica krune (ka kvadratu)
const Y_BULGE = 13; // najšira tačka krune
const NECK_Y = 22; // vrat (struk) — granica kruna/koren
const TIP_Y = HEIGHT - 4; // vrhovi korena

const r = (n: number) => Math.round(n * 100) / 100;

/**
 * Profil ivice krune — GLATKA zaobljena kapica za SVE zube (bez kvržica).
 * Razlika među zubima je samo u veličini (širina/visina), ne u obliku.
 */
function crownTop(_type: CrownType, xm: number, ht: number, yTop: number): string {
  return ` Q ${r(xm)} ${r(yTop - 2)} ${r(xm + ht)} ${r(yTop)}`;
}

/**
 * Zatvoreni put SAMO KRUNE: od vrata-levo gore po levoj strani, preko ivice
 * krune, dole po desnoj do vrata-desno, pa pravom linijom (struk) nazad → Z.
 */
function buildCrownPath(W: number, type: CrownType): string {
  const xm = W / 2;
  const hb = W * 0.46; // poluširina krune (bulge)
  const ht = hb * 0.78; // poluširina ramena (gore)
  const hn = W * 0.3; // poluširina vrata
  const nlX = xm - hn;
  const nrX = xm + hn;

  let d = `M ${r(nlX)} ${r(NECK_Y)}`;
  // Leva strana naviše (struk → bulge → rame).
  d += ` C ${r(nlX - 1)} ${r(NECK_Y - 6)} ${r(xm - hb)} ${r(Y_BULGE + 4)} ${r(
    xm - hb
  )} ${r(Y_BULGE)}`;
  d += ` C ${r(xm - hb)} ${r(Y_BULGE - 5)} ${r(xm - ht - 1)} ${r(Y_TOP + 5)} ${r(
    xm - ht
  )} ${r(Y_TOP)}`;
  // Ivica krune.
  d += crownTop(type, xm, ht, Y_TOP);
  // Desna strana naniže (rame → bulge → vrat-desno).
  d += ` C ${r(xm + ht + 1)} ${r(Y_TOP + 5)} ${r(xm + hb)} ${r(Y_BULGE - 5)} ${r(
    xm + hb
  )} ${r(Y_BULGE)}`;
  d += ` C ${r(xm + hb)} ${r(Y_BULGE + 4)} ${r(nrX + 1)} ${r(NECK_Y - 6)} ${r(
    nrX
  )} ${r(NECK_Y)}`;
  d += " Z"; // pravi struk (nrX → nlX)
  return d;
}

/**
 * Zatvoreni put SAMO KORENA: od vrata-desno, prsti korena (desno→levo) sa
 * zaobljenim vrhovima i mekim dolinicama, do vrata-levo, pa struk nazad → Z.
 */
function buildRootPath(W: number, roots: number): string {
  const xm = W / 2;
  const hn = W * 0.3;
  const nlX = xm - hn;
  const nrX = xm + hn;

  const slot = (nrX - nlX) / roots;
  const valleyY = NECK_Y + (TIP_Y - NECK_Y) * 0.3;
  const midY = NECK_Y + (TIP_Y - NECK_Y) * 0.45;

  let d = `M ${r(nrX)} ${r(NECK_Y)}`;
  for (let i = roots - 1; i >= 0; i--) {
    const leftX = nlX + i * slot;
    const rightX = nlX + (i + 1) * slot;
    const cx = (leftX + rightX) / 2;
    const tx = cx + (cx - xm) * 0.18; // blagi splay spoljnih korena
    const th = (rightX - leftX) * 0.3; // poluširina vrha

    const startX = i === roots - 1 ? nrX : rightX;
    const endX = i === 0 ? nlX : leftX;
    const endY = i === 0 ? NECK_Y : valleyY;

    // Spoljna ivica korena → vrh (suzava se, zaobljen vrh).
    d += ` C ${r(startX)} ${r(midY)} ${r(tx + th)} ${r(TIP_Y - 9)} ${r(
      tx + th
    )} ${r(TIP_Y - 2)}`;
    d += ` Q ${r(tx)} ${r(TIP_Y + 1.5)} ${r(tx - th)} ${r(TIP_Y - 2)}`;
    // Unutrašnja ivica korena → dolinica (ili vrat za poslednji).
    d += ` C ${r(tx - th)} ${r(TIP_Y - 9)} ${r(endX)} ${r(midY)} ${r(endX)} ${r(
      endY
    )}`;
  }
  d += " Z"; // struk (nlX → nrX)
  return d;
}

export function ToothAnatomy({
  toothNumber,
  width,
  position,
  scale = 1,
  state,
  onZoneClick,
}: {
  toothNumber: number;
  width: number;
  position: "top" | "bottom";
  scale?: number;
  // Stanje zuba iz iste tooth_records mape (kruna/koren zone + ceo_zub).
  state?: ToothState;
  // Klik na anatomsku zonu → koordinate kursora za pozicioniranje menija.
  onZoneClick?: (
    toothNumber: number,
    surface: AnatomySurface,
    x: number,
    y: number
  ) => void;
}) {
  const type = getCrownType(toothNumber);
  const roots = getRootCount(toothNumber);
  const W = width;
  const H = HEIGHT;
  const crownPath = buildCrownPath(W, type);
  const rootPath = buildRootPath(W, roots);

  // Gornji red: koren gore → preslikaj vertikalno (kruna ostaje ka kvadratu).
  const flip = position === "top";

  // Strukturno stanje (ceo_zub) prikazuje se NA OBE zone (sinhronizacija sa
  // kvadratom). Inače svaka zona nosi svoje stanje; prazno → 'zdrav'.
  const whole = state?.wholeTooth ?? null;
  const crownCond: ToothCondition = whole ?? state?.surfaces?.kruna ?? "zdrav";
  const rootCond: ToothCondition = whole ?? state?.surfaces?.koren ?? "zdrav";
  const extracted = whole === "izvadjen";

  const interactive = !!onZoneClick;
  const zoneCls = interactive
    ? "cursor-pointer transition-opacity hover:opacity-60"
    : undefined;

  function handleClick(surface: AnatomySurface, e: React.MouseEvent) {
    onZoneClick?.(toothNumber, surface, e.clientX, e.clientY);
  }

  return (
    <svg
      width={W * scale}
      height={H * scale}
      viewBox={`0 0 ${W} ${H}`}
      className="block"
      role="img"
      aria-label={`Zub ${toothNumber} (kruna/koren)`}
    >
      <g transform={flip ? `translate(0 ${H}) scale(1 -1)` : undefined}>
        <path
          d={crownPath}
          strokeWidth={1.3}
          strokeLinejoin="round"
          strokeLinecap="round"
          className={zoneCls}
          style={{
            fill: TOOTH_CONDITION_CONFIG[crownCond].color,
            stroke: "var(--venus-tooth-line)",
          }}
          onClick={interactive ? (e) => handleClick("kruna", e) : undefined}
        />
        <path
          d={rootPath}
          strokeWidth={1.3}
          strokeLinejoin="round"
          strokeLinecap="round"
          className={zoneCls}
          style={{
            fill: TOOTH_CONDITION_CONFIG[rootCond].color,
            stroke: "var(--venus-tooth-line)",
          }}
          onClick={interactive ? (e) => handleClick("koren", e) : undefined}
        />
      </g>

      {/* Izvađen zub: X preko cele siluete (klik prolazi na zone ispod). */}
      {extracted && (
        <g style={{ pointerEvents: "none" }} stroke="#1f1f1f" strokeWidth={2}>
          <line x1={3} y1={3} x2={W - 3} y2={H - 3} />
          <line x1={W - 3} y1={3} x2={3} y2={H - 3} />
        </g>
      )}
    </svg>
  );
}
