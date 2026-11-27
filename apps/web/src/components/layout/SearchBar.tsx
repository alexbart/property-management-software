import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import type { SearchResultItemDto } from "@property-platform/contracts";
import { useSearch } from "../../hooks/useSearch";

const GROUPS: Array<{ key: "properties" | "landlords" | "tenants"; label: string }> = [
  { key: "properties", label: "Properties" },
  { key: "landlords", label: "Landlords" },
  { key: "tenants", label: "Tenants" },
];

export function SearchBar() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(id);
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const { data, isFetching } = useSearch(debounced);
  const showPanel =
    focused && debounced.trim().length >= 2 && (isFetching || !!data);

  function go(item: SearchResultItemDto) {
    navigate(item.url);
    setValue("");
    setDebounced("");
    setFocused(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setFocused(false);
          }}
          placeholder="Search properties, tenants, landlords…"
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Global search"
        />
      </div>

      {showPanel ? (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
          {isFetching && !data ? (
            <p className="px-3 py-2 text-sm text-muted">Searching…</p>
          ) : null}
          {data &&
            GROUPS.map((group) => {
              const items = data[group.key];
              if (!items || items.length === 0) return null;
              return (
                <div key={group.key} className="py-1">
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {group.label}
                  </p>
                  {items.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => go(item)}
                      className="flex w-full flex-col rounded px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <span className="text-sm text-text">{item.label}</span>
                      {item.sublabel ? (
                        <span className="text-xs text-muted">{item.sublabel}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              );
            })}
          {data &&
            !isFetching &&
            GROUPS.every((g) => (data[g.key] ?? []).length === 0) ? (
              <p className="px-3 py-2 text-sm text-muted">No results</p>
            ) : null}
        </div>
      ) : null}
    </div>
  );
}