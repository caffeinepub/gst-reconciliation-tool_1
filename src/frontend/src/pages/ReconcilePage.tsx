import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ChevronDown, Info, Loader2, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { ReconciliationRow, ReconciliationSummary } from "../backend.d.ts";
import { FileUploadZone } from "../components/FileUploadZone";
import { ReconciliationTable } from "../components/ReconciliationTable";
import { SummaryCards } from "../components/SummaryCards";
import { parseExcelFile, reconcile } from "../utils/reconcile";

export function ReconcilePage() {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const [gstr2bFile, setGstr2bFile] = useState<File | null>(null);
  const [purchaseFile, setPurchaseFile] = useState<File | null>(null);
  const [sessionName, setSessionName] = useState(`Reconciliation - ${today}`);
  const [isColumnHintOpen, setIsColumnHintOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ReconciliationRow[] | null>(null);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);

  const canReconcile = !!gstr2bFile && !!purchaseFile && !isProcessing;

  const handleReconcile = async () => {
    if (!gstr2bFile || !purchaseFile) return;
    setIsProcessing(true);
    setError(null);
    setResults(null);
    setSummary(null);

    try {
      const [gstr2bRows, purchaseRows] = await Promise.all([
        parseExcelFile(gstr2bFile),
        parseExcelFile(purchaseFile),
      ]);

      if (gstr2bRows.length === 0) {
        throw new Error(
          "GSTR-2B file appears to be empty or columns weren't recognized.",
        );
      }
      if (purchaseRows.length === 0) {
        throw new Error(
          "Purchase Book file appears to be empty or columns weren't recognized.",
        );
      }

      const { rows, summary: newSummary } = reconcile(gstr2bRows, purchaseRows);
      setResults(rows);
      setSummary(newSummary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process files. Please check the file format.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm text-foreground">
          <span className="font-semibold">Note:</span> GSTR-2B auto-download is
          not supported due to GST portal restrictions. Please download your
          GSTR-2B file manually from{" "}
          <a
            href="https://www.gst.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary hover:text-primary/80 font-medium"
          >
            gst.gov.in
          </a>{" "}
          and upload it below.
        </AlertDescription>
      </Alert>

      {/* File upload section */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-5 shadow-card">
        <h2 className="text-base font-semibold text-foreground">
          Upload Files
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FileUploadZone
            label="GSTR-2B File"
            file={gstr2bFile}
            onFileChange={setGstr2bFile}
            data-ocid="gstr2b.upload_button"
          />
          <FileUploadZone
            label="Purchase Book File"
            file={purchaseFile}
            onFileChange={setPurchaseFile}
            data-ocid="purchase.upload_button"
          />
        </div>

        {/* Column format hint */}
        <Collapsible open={isColumnHintOpen} onOpenChange={setIsColumnHintOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isColumnHintOpen ? "rotate-180" : ""}`}
            />
            Expected column format
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted/50 rounded-md p-4">
              <div>
                <p className="font-semibold text-foreground mb-2">
                  GSTR-2B File Columns
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {[
                    "GSTIN",
                    "Invoice No",
                    "Invoice Date",
                    "Taxable Value",
                    "IGST",
                    "CGST",
                    "SGST",
                  ].map((col) => (
                    <li key={col} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
                      <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border border-border">
                        {col}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-2">
                  Purchase Book Columns
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {[
                    "GSTIN",
                    "Invoice No",
                    "Invoice Date",
                    "Taxable Value",
                    "IGST",
                    "CGST",
                    "SGST",
                  ].map((col) => (
                    <li key={col} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground/40 inline-block" />
                      <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border border-border">
                        {col}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Column names are case-insensitive. Alternate names (e.g., "Bill
              No", "Invoice Number") are also supported.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Session name + run button */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-card">
        <h2 className="text-base font-semibold text-foreground">
          Session Details
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="session-name" className="text-sm font-medium">
              Session Name{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="session-name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter session name..."
              data-ocid="session.input"
              className="text-sm"
            />
          </div>

          <Button
            onClick={handleReconcile}
            disabled={!canReconcile}
            data-ocid="reconcile.primary_button"
            className="gap-2 min-w-[180px] h-10"
            size="default"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Reconciliation
              </>
            )}
          </Button>
        </div>

        {!gstr2bFile && !purchaseFile && (
          <p className="text-xs text-muted-foreground">
            Upload both files above to enable reconciliation.
          </p>
        )}
        {(gstr2bFile || purchaseFile) && (!gstr2bFile || !purchaseFile) && (
          <p className="text-xs text-warning-foreground/70">
            {!gstr2bFile
              ? "Please upload the GSTR-2B file."
              : "Please upload the Purchase Book file."}
          </p>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {results && summary && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <SummaryCards summary={summary} />

            <div className="bg-card border border-border rounded-lg p-4 md:p-6 shadow-card">
              <h2 className="text-base font-semibold text-foreground mb-4">
                Reconciliation Results
              </h2>
              <ReconciliationTable
                rows={results}
                summary={summary}
                sessionName={sessionName}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
