"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Jednostavan tag input: postojeći tagovi sa „x" za brisanje + polje za unos.
 * Enter dodaje tekući tekst; Backspace na praznom polju briše poslednji tag.
 * `suggestions` prikazuje brze predloge (npr. česte alergije/stanja) koji još
 * nisu izabrani. `danger` boji tagove crveno (alergije / kritična upozorenja).
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  danger = false,
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  danger?: boolean;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const t = raw.trim();
    setDraft("");
    if (!t) return;
    // dedup case-insensitive
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  const freeSuggestions = suggestions.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-venus-border bg-venus-canvas p-2">
        {value.map((tag) => (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
              danger
                ? "bg-venus-danger/15 text-venus-danger"
                : "bg-venus-surface-2 text-venus-text-dim"
            )}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="opacity-70 transition-opacity hover:opacity-100"
              aria-label={`Ukloni ${tag}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[10ch] flex-1 bg-transparent text-sm text-venus-text outline-none placeholder:text-venus-text-faint"
        />
      </div>

      {freeSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {freeSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-venus-border bg-venus-canvas px-2.5 py-0.5 text-xs text-venus-text-dim transition-colors hover:text-venus-text"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
