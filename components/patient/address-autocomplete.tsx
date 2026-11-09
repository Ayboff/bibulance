"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import type { AddressSuggestion } from "@/lib/geo/ban";

type AddressAutocompleteProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
};

export function AddressAutocomplete({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
}: AddressAutocompleteProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/geo/address-suggest?q=${encodeURIComponent(q)}&limit=6`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error("suggest_failed");
        }
        const data = (await res.json()) as {
          suggestions?: AddressSuggestion[];
        };
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
        setHighlight(-1);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSuggestions([]);
        setError("Suggestions indisponibles — saisissez l’adresse à la main.");
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pick(suggestion: AddressSuggestion) {
    onChange(suggestion.label);
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
    setError(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        setOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
      return;
    }
    if (event.key === "Enter" && highlight >= 0) {
      event.preventDefault();
      const chosen = suggestions[highlight];
      if (chosen) pick(chosen);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setHighlight(-1);
    }
  }

  const showList = open && (suggestions.length > 0 || loading);

  return (
    <div ref={rootRef} className="relative">
      <label className="patient-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="patient-input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0 || value.trim().length >= 3) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        placeholder={placeholder}
        required={required}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlight >= 0 ? `${listboxId}-option-${highlight}` : undefined
        }
      />
      {hint ? (
        <p className="mt-2 text-base text-[var(--muted)]">{hint}</p>
      ) : null}
      {loading ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Recherche d’adresses…</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>
      ) : null}

      {showList && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[var(--border)] bg-white py-1 shadow-[var(--shadow-soft)]"
        >
          {suggestions.map((s, index) => {
            const active = index === highlight;
            const secondary = [s.postcode, s.city].filter(Boolean).join(" ");
            return (
              <li key={`${s.label}-${index}`} role="presentation">
                <button
                  type="button"
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={active}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                      : "text-[var(--ink)] hover:bg-[var(--accent-soft)]/70"
                  }`}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(s)}
                >
                  <span className="text-base font-medium leading-snug">
                    {s.name || s.label}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {secondary || s.context}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
