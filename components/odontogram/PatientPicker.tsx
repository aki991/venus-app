"use client";

import { useEffect, useState } from "react";
import { Search, User } from "lucide-react";

import {
  searchPatientRecords,
  type PatientPickerResult,
} from "@/lib/db/patients";
import { Input } from "@/components/ui/input";

export function PatientPicker({
  onSelect,
}: {
  onSelect: (patient: PatientPickerResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientPickerResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce 300ms. Prazan upit → prvih 20 (searchPatientRecords to vraća).
  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        setResults(await searchPatientRecords(query));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-venus-text-faint"
        />
        <Input
          autoFocus
          className="pl-9"
          placeholder="Pretraži po imenu, telefonu ili broju kartona..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-3 grid max-h-80 gap-1 overflow-y-auto">
        {loading && results.length === 0 ? (
          <p className="py-6 text-center text-sm text-venus-text-faint">
            Učitavanje…
          </p>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-sm text-venus-text-faint">
            Nema pacijenata za zadatu pretragu.
          </p>
        ) : (
          results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className="flex items-center gap-3 rounded-lg border border-venus-border bg-venus-surface px-3 py-2.5 text-left transition-colors hover:bg-venus-surface-2"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-venus-surface-2 text-venus-text-dim">
                <User size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-venus-text">
                {p.first_name} {p.last_name}
              </span>
              {p.card_number && (
                <span className="shrink-0 text-xs text-venus-text-dim">
                  #{p.card_number}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
