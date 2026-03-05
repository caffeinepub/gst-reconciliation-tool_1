import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ReconciliationRow, ReconciliationSummary } from "../backend.d.ts";
import { useSaveSession } from "../hooks/useQueries";
import { ReconciliationStatus } from "../types/gst";
import { exportToExcel, formatINR } from "../utils/reconcile";
import { DiffCell } from "./DiffCell";
import { StatusBadge } from "./StatusBadge";

type FilterTab = "all" | "matched" | "missing-2b" | "missing-books";

interface ReconciliationTableProps {
  rows: ReconciliationRow[];
  summary: ReconciliationSummary;
  sessionName: string;
  readOnly?: boolean;
}

export function ReconciliationTable({
  rows,
  summary,
  sessionName,
  readOnly = false,
}: ReconciliationTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const saveSession = useSaveSession();

  const filteredRows = rows.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "matched")
      return (r.status as string) === ReconciliationStatus.matched;
    if (activeFilter === "missing-2b")
      return (r.status as string) === ReconciliationStatus.missingIn2b;
    if (activeFilter === "missing-books")
      return (r.status as string) === ReconciliationStatus.missingInBooks;
    return true;
  });

  const counts = {
    all: rows.length,
    matched: rows.filter(
      (r) => (r.status as string) === ReconciliationStatus.matched,
    ).length,
    "missing-2b": rows.filter(
      (r) => (r.status as string) === ReconciliationStatus.missingIn2b,
    ).length,
    "missing-books": rows.filter(
      (r) => (r.status as string) === ReconciliationStatus.missingInBooks,
    ).length,
  };

  const handleExport = () => {
    exportToExcel(filteredRows, `${sessionName.replace(/\s+/g, "_")}.xlsx`);
  };

  const handleSave = async () => {
    try {
      await saveSession.mutateAsync({
        name: sessionName,
        summary,
        results: rows,
      });
      toast.success("Session saved successfully", {
        description: `"${sessionName}" has been saved.`,
      });
    } catch {
      toast.error("Failed to save session", {
        description: "Please try again.",
      });
    }
  };

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "matched", label: "Matched" },
    { value: "missing-2b", label: "Missing in 2B" },
    { value: "missing-books", label: "Missing in Books" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as FilterTab)}
        >
          <TabsList className="h-9" data-ocid="filter.tab">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs gap-1.5"
                data-ocid="results.tab"
              >
                {tab.label}
                <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs tabular-nums">
                  {counts[tab.value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              data-ocid="export.primary_button"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveSession.isPending}
              data-ocid="save.primary_button"
              className="gap-2"
            >
              {saveSession.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Session
            </Button>
          </div>
        )}
      </div>

      {/* Results table */}
      <div
        className="border border-border rounded-lg overflow-hidden"
        data-ocid="results.table"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap sticky left-0 bg-muted/50 z-10 min-w-[160px]">
                  GSTIN
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap min-w-[120px]">
                  Invoice No
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">
                  Invoice Date
                </TableHead>
                {/* Taxable Value group */}
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right border-l border-border/50">
                  TV (Book)
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right">
                  TV (2B)
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right">
                  TV Diff
                </TableHead>
                {/* IGST group */}
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right border-l border-border/50">
                  IGST (Bk)
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right">
                  IGST (2B)
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right">
                  IGST Diff
                </TableHead>
                {/* CGST group */}
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right border-l border-border/50">
                  CGST (Bk)
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right">
                  CGST (2B)
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right">
                  CGST Diff
                </TableHead>
                {/* SGST group */}
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right border-l border-border/50">
                  SGST (Bk)
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right">
                  SGST (2B)
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-right">
                  SGST Diff
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow data-ocid="results.empty_state">
                  <TableCell
                    colSpan={16}
                    className="text-center py-12 text-muted-foreground text-sm"
                  >
                    No records match the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, idx) => (
                  <TableRow
                    key={`${row.gstin}-${row.invoiceNo}-${idx}`}
                    data-ocid="results.row"
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs sticky left-0 bg-card z-10 border-r border-border/30">
                      {row.gstin || "—"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {row.invoiceNo || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.invoiceDate || "—"}
                    </TableCell>
                    {/* Taxable Value */}
                    <TableCell className="text-xs text-right tabular-nums border-l border-border/30">
                      {formatINR(row.taxableValueBook)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {formatINR(row.taxableValue2b)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <DiffCell
                        value={row.taxableValueBook - row.taxableValue2b}
                      />
                    </TableCell>
                    {/* IGST */}
                    <TableCell className="text-xs text-right tabular-nums border-l border-border/30">
                      {formatINR(row.igstBook)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {formatINR(row.igst2b)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <DiffCell value={row.igstBook - row.igst2b} />
                    </TableCell>
                    {/* CGST */}
                    <TableCell className="text-xs text-right tabular-nums border-l border-border/30">
                      {formatINR(row.cgstBook)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {formatINR(row.cgst2b)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <DiffCell value={row.cgstBook - row.cgst2b} />
                    </TableCell>
                    {/* SGST */}
                    <TableCell className="text-xs text-right tabular-nums border-l border-border/30">
                      {formatINR(row.sgstBook)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {formatINR(row.sgst2b)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <DiffCell value={row.sgstBook - row.sgst2b} />
                    </TableCell>
                    {/* Status */}
                    <TableCell className="text-center">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredRows.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {filteredRows.length} of {rows.length} records
        </p>
      )}
    </div>
  );
}
