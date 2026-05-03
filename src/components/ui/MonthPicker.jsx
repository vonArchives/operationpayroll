import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function MonthPicker({ value, onChange, disabledMonths }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) return Number(value.split("-")[0]);
    return new Date().getFullYear();
  });
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleSelect = useCallback(
    (monthIndex) => {
      const key = `${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`;
      if (disabledMonths?.has(key)) return;
      onChange(key);
      setOpen(false);
    },
    [viewYear, onChange, disabledMonths]
  );

  const selectedYear = value ? Number(value.split("-")[0]) : null;
  const selectedMonth = value ? Number(value.split("-")[1]) - 1 : null;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
          open
            ? "border-indigo-400/50 ring-1 ring-indigo-400/20"
            : "border-white/10 hover:border-white/20"
        )}
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <CalendarDays className="h-4 w-4 text-white/40 shrink-0" />
        <span className={value ? "text-white" : "text-white/40"}>
          {value
            ? new Date(`${value}-01`).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : "Select month..."}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute z-50 mt-2 w-full rounded-xl border p-4 shadow-2xl"
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          {/* Year nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-white font-semibold text-lg">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((label, index) => {
              const key = `${viewYear}-${String(index + 1).padStart(2, "0")}`;
              const isDisabled = disabledMonths?.has(key);
              const isSelected =
                selectedYear === viewYear && selectedMonth === index;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(index)}
                  className={cn(
                    "py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isSelected &&
                      "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25",
                    !isSelected &&
                      !isDisabled &&
                      "text-white/70 hover:bg-white/10 hover:text-white",
                    isDisabled &&
                      "text-white/20 cursor-not-allowed line-through"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
