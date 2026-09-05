"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { inputStyle } from "@/components/ui/form";
import {
  loadPlacesLibrary,
  type AutocompleteSessionToken,
  type PlacePrediction,
} from "@/lib/googlePlaces";

type Suggestion = { id: string; text: string; prediction: PlacePrediction };

// Autocomplete (New) has no single "address" filter like the legacy widget's
// types: ["address"] — this approximates it from the address-shaped primary
// types in Google's place-types table. Adjust if non-address results show up.
const ADDRESS_PRIMARY_TYPES = ["street_address", "premise", "subpremise", "route"];

const MIN_INPUT_LENGTH = 3;
const DEBOUNCE_MS = 400;

// Free-typing still works even if this never loads (missing/invalid key,
// network failure, ad blocker) — autocomplete only ever adds a dropdown on
// top of the plain input in DetailsStep, it never gates submission.
export function AddressAutocompleteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const sessionTokenRef = useRef<AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchSuggestions(input: string) {
    if (input.trim().length < MIN_INPUT_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const lib = await loadPlacesLibrary();
    if (!lib) return; // no key configured, or it failed to load — stay a plain input

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
    }

    const requestId = ++requestIdRef.current;
    try {
      const { suggestions: results } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        includedPrimaryTypes: ADDRESS_PRIMARY_TYPES,
        region: "us",
      });
      if (requestId !== requestIdRef.current) return; // superseded by a later keystroke

      const next = results
        .filter((r): r is { placePrediction: PlacePrediction } => r.placePrediction !== null)
        .map((r, i) => ({
          id: String(i),
          text: r.placePrediction.text.toString(),
          prediction: r.placePrediction,
        }));
      setSuggestions(next);
      setOpen(next.length > 0);
      setHighlighted(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }

  function handleInputChange(text: string) {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchSuggestions(text), DEBOUNCE_MS);
  }

  async function selectSuggestion(s: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    const place = s.prediction.toPlace();
    try {
      const { place: fetched } = await place.fetchFields({ fields: ["formattedAddress"] });
      onChange(fetched.formattedAddress ?? s.text);
    } catch {
      onChange(s.text);
    }
    // fetchFields() concludes the billing session — next keystroke starts a fresh one.
    sessionTokenRef.current = null;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter") {
      if (highlighted >= 0) {
        e.preventDefault();
        void selectSuggestion(suggestions[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        style={inputStyle}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="street-address"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="address-autocomplete-listbox"
      />
      {open && suggestions.length > 0 && (
        <ul
          id="address-autocomplete-listbox"
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === highlighted}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep input focus through the click
                onClick={() => void selectSuggestion(s)}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  borderRadius: "calc(var(--radius) - 2px)",
                  background: i === highlighted ? "var(--color-bg-subtle)" : "transparent",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
