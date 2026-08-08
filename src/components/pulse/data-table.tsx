import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KeyHint } from "./primitives";
import { Search, X } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  align?: "right";
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  getId,
  onOpen,
  selectable,
  bulkActions,
  searchPlaceholder = "Filter rows — try status:critical zone:west",
  filters,
  emptyState,
  liveHint,
}: {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  onOpen?: (row: T) => void;
  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  searchPlaceholder?: string;
  filters?: ReactNode;
  emptyState?: ReactNode;
  liveHint?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? rows.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(query.toLowerCase().replace(/\w+:/g, "")),
      )
    : rows;

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
      if (typing) return;
      if (!containerRef.current) return;
      if (e.key === "j") {
        e.preventDefault();
        setCursor((c) => Math.min(filtered.length - 1, c + 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "x") {
        e.preventDefault();
        const row = filtered[cursor];
        if (row && selectable) {
          setSelected((s) => {
            const n = new Set(s);
            const id = getId(row);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
          });
        }
      } else if (e.key === " " || e.key === "Enter") {
        const row = filtered[cursor];
        if (row && onOpen) {
          e.preventDefault();
          onOpen(row);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, cursor, getId, onOpen, selectable]);

  const selectedRows = filtered.filter((r) => selected.has(getId(r)));

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Filter rows"
            className="h-8 w-full rounded-md border border-hairline bg-surface pl-8 pr-8 text-[12px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {filters}
        <div className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
          <KeyHint>j</KeyHint>
          <KeyHint>k</KeyHint> move
          {selectable && (
            <>
              <KeyHint>x</KeyHint> select
            </>
          )}
          {onOpen && (
            <>
              <KeyHint>space</KeyHint> open
            </>
          )}
        </div>
      </div>

      {liveHint && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          {liveHint}
        </div>
      )}

      <div className="overflow-hidden rounded-[10px] border border-hairline bg-surface">
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur">
              <tr className="border-b border-hairline">
                {selectable && <th className="w-9 px-3 py-2" aria-label="Select" />}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground",
                      c.align === "right" && "text-right",
                      c.className,
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const id = getId(row);
                const isSel = selected.has(id);
                return (
                  <tr
                    key={id}
                    onClick={() => {
                      setCursor(i);
                      onOpen?.(row);
                    }}
                    className={cn(
                      "group relative border-b border-hairline/70 transition-colors duration-100 last:border-0",
                      onOpen && "cursor-pointer",
                      i === cursor ? "bg-accent/60" : "hover:bg-accent/40",
                      isSel && "bg-primary/8",
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSel}
                          aria-label={`Select ${id}`}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() =>
                            setSelected((s) => {
                              const n = new Set(s);
                              n.has(id) ? n.delete(id) : n.add(id);
                              return n;
                            })
                          }
                          className="h-3.5 w-3.5 rounded border-border accent-[var(--color-primary)]"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "whitespace-nowrap px-3 py-2 align-middle",
                          c.align === "right" && "text-right",
                          c.className,
                        )}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (emptyState ?? null)}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Showing <span className="tnum">{filtered.length}</span> of{" "}
        <span className="tnum">{rows.length}</span> rows
      </p>

      {selectedRows.length > 0 && (
        <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-hairline bg-surface px-3 py-2 shadow-lg">
            <span className="tnum text-[12px] font-medium">
              {selectedRows.length} selected
            </span>
            <span className="h-4 w-px bg-hairline" />
            {bulkActions?.(selectedRows, () => setSelected(new Set()))}
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
