import { cn } from "@/lib/utils";
import { formatDiff } from "../utils/reconcile";

interface DiffCellProps {
  value: number;
}

export function DiffCell({ value }: DiffCellProps) {
  const isZero = value === 0;
  const isNeg = value < 0;

  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums font-medium",
        isZero ? "diff-zero" : isNeg ? "diff-negative" : "diff-positive",
      )}
    >
      {formatDiff(value)}
    </span>
  );
}
