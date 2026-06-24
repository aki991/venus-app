"use client";

import { Tooth } from "@/components/odontogram/Tooth";
import { OdontogramLegend } from "@/components/odontogram/OdontogramLegend";

// FDI raspored. Gornji red: 18→11 | 21→28. Donji red: 48→41 | 31→38.
const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function ToothRow({
  numbers,
  numbersOn,
}: {
  numbers: number[];
  numbersOn: "top" | "bottom";
}) {
  const left = numbers.slice(0, 8); // desni kvadrant pacijenta
  const right = numbers.slice(8); // levi kvadrant pacijenta

  const cell = (n: number) => (
    <div key={n} className="flex flex-col items-center gap-1">
      {numbersOn === "top" && (
        <span className="text-[10px] tabular-nums text-venus-text-faint">{n}</span>
      )}
      <Tooth toothNumber={n} />
      {numbersOn === "bottom" && (
        <span className="text-[10px] tabular-nums text-venus-text-faint">{n}</span>
      )}
    </div>
  );

  return (
    <div className="flex items-stretch gap-1.5">
      <div className="flex gap-1">{left.map(cell)}</div>
      {/* srednja linija (središnja vertikala vilice) */}
      <div className="mx-1 w-px self-stretch bg-venus-border" />
      <div className="flex gap-1">{right.map(cell)}</div>
    </div>
  );
}

export function Odontogram({
  patientId,
  readonly = true,
}: {
  patientId: string;
  readonly?: boolean;
}) {
  // O1: bez čuvanja. Klik na površinu samo loguje (Tooth-ov default handler);
  // O2 će proslediti pravi onSurfaceClick kad readonly=false.
  return (
    <section
      className="rounded-xl border border-venus-border bg-venus-surface p-5"
      data-patient-id={patientId}
      data-readonly={readonly}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-venus-text">
          Odontogram
        </h2>
        <span className="text-xs text-venus-text-faint">
          FDI numeracija · stalni zubi
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="mx-auto grid w-fit gap-3">
          <ToothRow numbers={UPPER_ROW} numbersOn="top" />
          <ToothRow numbers={LOWER_ROW} numbersOn="bottom" />
        </div>
      </div>

      <OdontogramLegend />
    </section>
  );
}
