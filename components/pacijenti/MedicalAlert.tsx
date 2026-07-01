"use client";

import { AlertTriangle } from "lucide-react";

import { usePatientMedical } from "@/hooks/usePatientMedical";

/**
 * Upadljiv crveni baner na vrhu kartona — doktor ODMAH vidi alergije i kritična
 * upozorenja pre intervencije. Ne renderuje se ako oboje prazno. Deli isti
 * react-query keš sa MedicalCard (usePatientMedical), pa se osvežava zajedno.
 */
export function MedicalAlert({ patientId }: { patientId: string }) {
  const { data: medical } = usePatientMedical(patientId);
  const allergies = medical?.allergies ?? [];
  const warnings = medical?.critical_warnings ?? [];

  if (allergies.length === 0 && warnings.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-venus-danger/50 bg-venus-danger/10 p-4">
      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-venus-danger" />
      <div className="grid gap-1">
        {allergies.length > 0 && (
          <p className="text-sm font-semibold text-venus-danger">
            ⚠ Alergije: {allergies.join(", ")}
          </p>
        )}
        {warnings.length > 0 && (
          <p className="text-sm font-semibold text-venus-danger">
            ⚠ Upozorenja: {warnings.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
