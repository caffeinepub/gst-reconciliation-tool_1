import { cn } from "@/lib/utils";
import type { ReconciliationStatus as BackendStatusEnum } from "../backend.d.ts";
import { ReconciliationStatus } from "../types/gst";

interface StatusBadgeProps {
  status: BackendStatusEnum | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status as string;
  const config: Record<string, { label: string; className: string }> = {
    [ReconciliationStatus.matched]: {
      label: "Matched",
      className: "status-matched",
    },
    [ReconciliationStatus.missingIn2b]: {
      label: "Missing in 2B",
      className: "status-missing-2b",
    },
    [ReconciliationStatus.missingInBooks]: {
      label: "Missing in Books",
      className: "status-missing-books",
    },
  };

  const entry = config[s] ?? { label: s, className: "status-matched" };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
        entry.className,
      )}
    >
      {entry.label}
    </span>
  );
}
