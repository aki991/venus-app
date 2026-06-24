"use client";

import {
  getCrownType,
  getRootCount,
  type CrownType,
} from "@/lib/constants/toothAnatomy";

// Bazna visina anatomskog dela (kruna + koren). Skalira se kroz `scale`.
const HEIGHT = 58;

const r = (n: number) => Math.round(n * 100) / 100;

/**
 * Profil ivice krune — GLATKA zaobljena kapica za SVE zube (bez kvržica).
 * Razlika među zubima je samo u veličini (širina/visina), ne u obliku.
 * Počinje iz tekuće tačke (leva ramena), završava u (xm+ht, yTop).
 */
function crownTop(_type: CrownType, xm: number, ht: number, yTop: number): string {
  return ` Q ${r(xm)} ${r(yTop - 2)} ${r(xm + ht)} ${r(yTop)}`;
}

/**
 * Silueta zuba (kanonski: kruna gore ka kvadratu, koreni dole) — sve meke
 * Bézier krive. Bočne strane prave "struk" (vrat) između zaobljene krune i
 * korena-prstiju sa zaobljenim vrhovima.
 */
function buildToothPath(W: number, type: CrownType, roots: number): string {
  const H = HEIGHT;
  const xm = W / 2;
  const yTop = 5; // ivica krune (ka kvadratu)
  const yBulge = 13; // najšira tačka krune
  const neckY = 22; // vrat (struk)
  const tipY = H - 4; // vrhovi korena

  const hb = W * 0.46; // poluširina krune (bulge)
  const ht = hb * 0.78; // poluširina ramena (gore)
  const hn = W * 0.3; // poluširina vrata
  const nlX = xm - hn;
  const nrX = xm + hn;

  // Kreni od vrata-levo, gore po levoj strani (struk → bulge → rame).
  let d = `M ${r(nlX)} ${r(neckY)}`;
  d += ` C ${r(nlX - 1)} ${r(neckY - 6)} ${r(xm - hb)} ${r(yBulge + 4)} ${r(
    xm - hb
  )} ${r(yBulge)}`;
  d += ` C ${r(xm - hb)} ${r(yBulge - 5)} ${r(xm - ht - 1)} ${r(yTop + 5)} ${r(
    xm - ht
  )} ${r(yTop)}`;

  // Ivica krune (kvržice).
  d += crownTop(type, xm, ht, yTop);

  // Desna strana nadole (rame → bulge → vrat-desno).
  d += ` C ${r(xm + ht + 1)} ${r(yTop + 5)} ${r(xm + hb)} ${r(yBulge - 5)} ${r(
    xm + hb
  )} ${r(yBulge)}`;
  d += ` C ${r(xm + hb)} ${r(yBulge + 4)} ${r(nrX + 1)} ${r(neckY - 6)} ${r(
    nrX
  )} ${r(neckY)}`;

  // Koreni (desno→levo): prsti sa zaobljenim vrhovima; između njih meke dolinice.
  const slot = (nrX - nlX) / roots;
  const valleyY = neckY + (tipY - neckY) * 0.3;
  const midY = neckY + (tipY - neckY) * 0.45;

  for (let i = roots - 1; i >= 0; i--) {
    const leftX = nlX + i * slot;
    const rightX = nlX + (i + 1) * slot;
    const cx = (leftX + rightX) / 2;
    const tx = cx + (cx - xm) * 0.18; // blagi splay spoljnih korena
    const th = (rightX - leftX) * 0.3; // poluširina vrha

    const startX = i === roots - 1 ? nrX : rightX;
    const endX = i === 0 ? nlX : leftX;
    const endY = i === 0 ? neckY : valleyY;

    // Spoljna ivica korena → vrh (suzava se, zaobljen vrh).
    d += ` C ${r(startX)} ${r(midY)} ${r(tx + th)} ${r(tipY - 9)} ${r(
      tx + th
    )} ${r(tipY - 2)}`;
    d += ` Q ${r(tx)} ${r(tipY + 1.5)} ${r(tx - th)} ${r(tipY - 2)}`;
    // Unutrašnja ivica korena → dolinica (ili vrat za poslednji).
    d += ` C ${r(tx - th)} ${r(tipY - 9)} ${r(endX)} ${r(midY)} ${r(endX)} ${r(
      endY
    )}`;
  }

  d += " Z";
  return d;
}

export function ToothAnatomy({
  toothNumber,
  width,
  position,
  scale = 1,
}: {
  toothNumber: number;
  width: number;
  position: "top" | "bottom";
  scale?: number;
}) {
  const type = getCrownType(toothNumber);
  const roots = getRootCount(toothNumber);
  const W = width;
  const H = HEIGHT;
  const d = buildToothPath(W, type, roots);

  const xm = W / 2;
  const hn = W * 0.3;
  const neckY = 22;

  // Gornji red: koren gore → preslikaj vertikalno (kruna ostaje ka kvadratu).
  const flip = position === "top";

  return (
    <svg
      width={W * scale}
      height={H * scale}
      viewBox={`0 0 ${W} ${H}`}
      className="block"
      aria-hidden="true"
    >
      <g transform={flip ? `translate(0 ${H}) scale(1 -1)` : undefined}>
        <path
          d={d}
          strokeWidth={1.3}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ fill: "var(--venus-tooth)", stroke: "var(--venus-tooth-line)" }}
        />
        {/* Suptilan prelaz kruna→koren (struk) radi dubine/čitljivosti. */}
        <path
          d={`M ${r(xm - hn)} ${r(neckY)} Q ${r(xm)} ${r(neckY + 2)} ${r(
            xm + hn
          )} ${r(neckY)}`}
          fill="none"
          strokeWidth={0.7}
          opacity={0.45}
          style={{ stroke: "var(--venus-tooth-line)" }}
        />
      </g>
    </svg>
  );
}
