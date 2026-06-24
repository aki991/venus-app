"use client";

import {
  useToothRecords,
  useSetToothSurface,
  useRemoveToothCondition,
} from "@/hooks/useToothRecords";
import { OdontogramView } from "@/components/odontogram/OdontogramView";

/**
 * Odontogram vezan za pravog pacijenta — čita/čuva u bazu (tooth_records).
 * Javni API je nepromenjen (karton i radni sto ga koriste isto).
 */
export function Odontogram({
  patientId,
  size = "default",
  showHeader = true,
}: {
  patientId: string;
  size?: "default" | "large";
  showHeader?: boolean;
}) {
  const { data: toothMap } = useToothRecords(patientId);
  const setSurface = useSetToothSurface(patientId);
  const removeCondition = useRemoveToothCondition(patientId);

  return (
    <OdontogramView
      map={toothMap ?? {}}
      size={size}
      showHeader={showHeader}
      onSetCondition={(toothNumber, surface, condition) =>
        setSurface.mutate({ toothNumber, surface, condition })
      }
      onRemove={(toothNumber, surface) =>
        removeCondition.mutate({ toothNumber, surface })
      }
    />
  );
}
