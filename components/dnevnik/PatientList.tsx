"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePatients } from "@/hooks/usePatients";
import { PATIENT_STATUS_CONFIG } from "@/lib/constants/patientStatus";
import type { PatientListItem } from "@/lib/db/patients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientFormDialog } from "@/components/dnevnik/PatientFormDialog";

// Stabilna boja avatara iz imena (paleta usklađena sa doktorskim bojama).
const AVATAR_COLORS = [
  "#e5c45f",
  "#8a9a6b",
  "#6b9080",
  "#a07f9e",
  "#c98a5e",
  "#7f9ea0",
  "#b07f7f",
  "#9a8ac9",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(p: PatientListItem): string {
  return ((p.first_name[0] ?? "") + (p.last_name[0] ?? "")).toUpperCase() || "—";
}

export function PatientList() {
  const router = useRouter();
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Debounce pretrage (300ms) da ne okidamo upit na svaki taster.
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 300);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const { data: patients, isLoading, isError } = usePatients(search);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-venus-text-faint"
          />
          <Input
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder="Pretraži po imenu, telefonu ili broju kartona…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          Novi pacijent
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-venus-border bg-venus-surface">
        {/* Header reda */}
        <div className="grid grid-cols-[2.5fr_1fr_0.8fr_1.3fr_1fr] gap-4 border-b border-venus-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-venus-text-dim">
          <span>Pacijent</span>
          <span>Karton #</span>
          <span>Godine</span>
          <span>Telefon</span>
          <span>Status</span>
        </div>

        {isLoading && (
          <div className="px-4 py-10 text-center text-sm text-venus-text-faint">
            Učitavanje…
          </div>
        )}

        {isError && (
          <div className="px-4 py-10 text-center text-sm text-venus-danger">
            Greška pri učitavanju pacijenata.
          </div>
        )}

        {!isLoading && !isError && patients?.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-venus-text-faint">
            {search.trim().length >= 2
              ? "Nema pacijenata za zadatu pretragu."
              : "Još nema pacijenata. Dodajte prvog."}
          </div>
        )}

        {patients?.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => router.push(`/dnevnik/${p.id}`)}
            className="grid w-full grid-cols-[2.5fr_1fr_0.8fr_1.3fr_1fr] items-center gap-4 border-b border-venus-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-venus-surface-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#0d0d0d]"
                style={{
                  backgroundColor: avatarColor(p.first_name + p.last_name),
                }}
              >
                {initials(p)}
              </span>
              <span className="truncate font-medium text-venus-text">
                {p.first_name} {p.last_name}
              </span>
            </div>
            <span className="text-sm text-venus-text-dim">
              {p.card_number ?? "—"}
            </span>
            <span className="text-sm text-venus-text-dim">
              {p.age != null ? `${p.age}` : "—"}
            </span>
            <span className="truncate text-sm text-venus-text-dim">
              {p.phone ?? "—"}
            </span>
            <span>
              <Badge className={cn(PATIENT_STATUS_CONFIG[p.status].badge)}>
                {PATIENT_STATUS_CONFIG[p.status].label}
              </Badge>
            </span>
          </button>
        ))}
      </div>

      <PatientFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
