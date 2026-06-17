"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, User, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { searchPatients, type PatientSearchResult } from "@/lib/db/patients";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type PatientMode = "existing" | "walk_in";

interface PatientSelectorProps {
  mode: PatientMode;
  onModeChange: (mode: PatientMode) => void;

  // existing
  patientId: string | null;
  onPatientChange: (patient: PatientSearchResult | null) => void;

  // walk-in
  walkInName: string;
  walkInPhone: string;
  onWalkInNameChange: (value: string) => void;
  onWalkInPhoneChange: (value: string) => void;

  /** Prikaz već izabranog pacijenta (npr. pri editu / pre-popunjavanju). */
  selectedLabel?: string | null;
  selectedSublabel?: string | null;
}

function fullName(p: PatientSearchResult): string {
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Bez imena";
}

export function PatientSelector({
  mode,
  onModeChange,
  patientId,
  onPatientChange,
  walkInName,
  walkInPhone,
  onWalkInNameChange,
  onWalkInPhoneChange,
  selectedLabel,
  selectedSublabel,
}: PatientSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms — prost useEffect + setTimeout, bez extra biblioteke.
  useEffect(() => {
    if (mode !== "existing") return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const data = await searchPatients(trimmed);
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, mode]);

  // Klik van komponente zatvara dropdown.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasSelection = !!patientId && !!selectedLabel;

  return (
    <div className="grid gap-3">
      <RadioGroup
        className="flex gap-4"
        value={mode}
        onValueChange={(v) => onModeChange(v as PatientMode)}
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <RadioGroupItem value="existing" />
          Postojeći pacijent
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <RadioGroupItem value="walk_in" />
          Novi / Walk-in
        </label>
      </RadioGroup>

      {mode === "existing" ? (
        <div className="relative" ref={containerRef}>
          {hasSelection ? (
            <div className="flex items-center justify-between rounded-md border border-venus-border bg-venus-surface-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--venus-gold)_15%,transparent)] text-venus-gold">
                  <User size={14} />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-medium">{selectedLabel}</p>
                  {selectedSublabel && (
                    <p className="text-xs text-venus-text-dim">
                      {selectedSublabel}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Ukloni pacijenta"
                onClick={() => {
                  onPatientChange(null);
                  setQuery("");
                }}
                className="text-venus-text-faint transition-colors hover:text-venus-text"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-venus-text-faint"
                />
                <Input
                  className="pl-9"
                  placeholder="Pretraži po imenu ili telefonu..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setOpen(true)}
                />
                {loading && (
                  <Loader2
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-venus-text-faint"
                  />
                )}
              </div>

              {open && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-venus-border bg-venus-surface shadow-md">
                  {results.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-venus-text-dim">
                      {query.trim().length < 2
                        ? "Unesite najmanje 2 karaktera"
                        : "Nema rezultata"}
                    </p>
                  ) : (
                    results.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onPatientChange(p);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-venus-surface-2"
                        )}
                      >
                        <span className="font-medium">{fullName(p)}</span>
                        {p.phone && (
                          <span className="text-xs text-venus-text-dim">
                            {p.phone}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="walk-in-name">Ime i prezime</Label>
            <Input
              id="walk-in-name"
              placeholder="npr. Marko Marković"
              value={walkInName}
              onChange={(e) => onWalkInNameChange(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="walk-in-phone">Telefon</Label>
            <Input
              id="walk-in-phone"
              placeholder="npr. 06x xxx xxxx"
              value={walkInPhone}
              onChange={(e) => onWalkInPhoneChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
