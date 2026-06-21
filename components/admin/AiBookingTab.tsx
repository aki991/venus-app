"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useDoctors } from "@/hooks/useDoctors";
import { setAiDefaultDoctorAction } from "@/lib/admin/settings-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Izbor doktora kog AI agent (WhatsApp/n8n) koristi za zakazivanje.
 * Lista doktora ide preko useDoctors → isti redosled kao "Tim ordinacije".
 */
export function AiBookingTab({
  currentDoctorId,
}: {
  currentDoctorId: string | null;
}) {
  const { data: doctors } = useDoctors();
  const [doctorId, setDoctorId] = useState(currentDoctorId ?? "");
  const [pending, startTransition] = useTransition();

  function onSave() {
    if (!doctorId) {
      toast.error("Izaberite doktora");
      return;
    }
    startTransition(async () => {
      const res = await setAiDefaultDoctorAction(doctorId);
      if ("error" in res) toast.error(res.error);
      else toast.success("Sačuvano");
    });
  }

  return (
    <div className="max-w-lg rounded-xl border border-venus-border bg-venus-canvas p-4">
      <h3 className="font-medium text-venus-text">Doktor za AI zakazivanje</h3>
      <p className="mb-4 mt-1 text-sm text-venus-text-dim">
        AI agent (WhatsApp) zakazuje termine na ovog doktora. Ako izabrani doktor
        bude deaktiviran, sistem automatski koristi prvog aktivnog doktora.
      </p>

      <div className="grid gap-1.5">
        <Label>Doktor</Label>
        <Select value={doctorId || undefined} onValueChange={setDoctorId}>
          <SelectTrigger>
            <SelectValue placeholder="Izaberite doktora" />
          </SelectTrigger>
          <SelectContent>
            {(doctors ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {[d.first_name, d.last_name].filter(Boolean).join(" ") ||
                  "Bez imena"}
                {d.specialty ? ` — ${d.specialty}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onSave} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Sačuvaj
        </Button>
      </div>
    </div>
  );
}
