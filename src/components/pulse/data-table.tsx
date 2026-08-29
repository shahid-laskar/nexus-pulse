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
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Filter rows"
            className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[12px] outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary text-slate-900"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {filters}
        <div className="ml-auto hidden items-center gap-1.5 text-[11px] text-slate-500 lg:flex">
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
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          {liveHint}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="border-b border-slate-200">
                {selectable && <th className="w-9 px-3 py-2" aria-label="Select" />}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-3.5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-slate-500",
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
                      "group relative border-b border-slate-100 transition-colors duration-100 last:border-0",
                      onOpen && "cursor-pointer",
                      i === cursor ? "bg-slate-100" : "hover:bg-slate-50/80",
                      isSel && "bg-blue-50/60",
                    )}
                  >
                    {selectable && (
                      <td className="px-3.5 py-2.5">
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
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-primary"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "whitespace-nowrap px-3.5 py-2.5 align-middle text-slate-700 text-xs",
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

      <p className="mt-2 text-[11px] text-slate-400">
        Showing <span className="tnum font-medium text-slate-700">{filtered.length}</span> of{" "}
        <span className="tnum font-medium text-slate-700">{rows.length}</span> rows
      </p>

      {selectedRows.length > 0 && (
        <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-lg">
            <span className="tnum text-[12px] font-semibold text-slate-800">
              {selectedRows.length} selected
            </span>
            <span className="h-4 w-px bg-slate-200" />
            {bulkActions?.(selectedRows, () => setSelected(new Set()))}
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:text-slate-900"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
