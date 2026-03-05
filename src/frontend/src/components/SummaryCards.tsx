import { AlertTriangle, BarChart3, CheckCircle2, XCircle } from "lucide-react";
import type { ReconciliationSummary } from "../backend.d.ts";

interface SummaryCardsProps {
  summary: ReconciliationSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Records",
      value: Number(summary.totalRecords),
      icon: BarChart3,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
    },
    {
      label: "Matched",
      value: Number(summary.matched),
      icon: CheckCircle2,
      colorClass: "text-success",
      bgClass: "bg-success/10",
    },
    {
      label: "Missing in 2B",
      value: Number(summary.missingIn2b),
      icon: AlertTriangle,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
    },
    {
      label: "Missing in Books",
      value: Number(summary.missingInBooks),
      icon: XCircle,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
    },
  ];

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      data-ocid="summary.card"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 shadow-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {card.label}
            </span>
            <div className={`p-1.5 rounded-md ${card.bgClass}`}>
              <card.icon
                className={`w-4 h-4 ${card.colorClass}`}
                strokeWidth={2}
              />
            </div>
          </div>
          <div className={`text-3xl font-bold tabular-nums ${card.colorClass}`}>
            {card.value.toLocaleString("en-IN")}
          </div>
        </div>
      ))}
    </div>
  );
}
