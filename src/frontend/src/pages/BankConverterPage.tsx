import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankRow {
  date: string;
  rawDescription: string;
  extractedName: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
}

// ─── Name extraction logic ─────────────────────────────────────────────────────

function extractName(raw: string): string {
  let name = raw;

  // Remove UPI transaction IDs (12+ digit numeric strings)
  name = name.replace(/\b\d{10,}\b/g, "");

  // Remove UPI addresses (xxx@yyy format)
  name = name.replace(/\b[\w.\-]+@[\w.\-]+\b/g, "");

  // Remove IMPS/NEFT/RTGS/UTR reference codes (alphanumeric, usually 12–22 chars)
  name = name.replace(
    /\b(NEFT|IMPS|RTGS|UPI|UTR)[/\-\s]?[A-Z0-9]{6,22}\b/gi,
    "",
  );

  // Remove standalone alphanumeric reference codes (all caps, 8+ chars mixed)
  name = name.replace(/\b[A-Z0-9]{8,}\b/g, "");

  // Remove slash-separated bank prefixes like "SBI/", "HDFC/", "ICICI/"
  name = name.replace(/\b[A-Z]{2,8}\/+/g, "");

  // Remove leading/trailing slashes
  name = name.replace(/^[/\-\s]+|[/\-\s]+$/g, "");

  // Collapse multiple spaces
  name = name.replace(/\s{2,}/g, " ").trim();

  // If the result is empty or too short (≤2 chars), fall back to first ~30 chars of raw
  if (name.length <= 2) {
    name = raw.trim().slice(0, 40);
  }

  return name;
}

// ─── Amount parsing ────────────────────────────────────────────────────────────

function parseAmount(val: string): number | null {
  const cleaned = val.replace(/[,\s₹$]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "") return null;
  const n = Number.parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function formatAmount(val: number | null): string {
  if (val === null) return "—";
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(raw: string): string {
  // Try to parse common date formats and return DD-MM-YYYY
  const s = raw.trim();
  // Already DD-MM-YYYY or DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m1) {
    const [, d, mo, y] = m1;
    const year = y.length === 2 ? `20${y}` : y;
    return `${d.padStart(2, "0")}-${mo.padStart(2, "0")}-${year}`;
  }
  // YYYY-MM-DD ISO
  const m2 = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (m2) {
    const [, y, mo, d] = m2;
    return `${d.padStart(2, "0")}-${mo.padStart(2, "0")}-${y}`;
  }
  return s; // return as-is
}

// ─── PDF Parsing ──────────────────────────────────────────────────────────────

async function parseBankStatementPDF(file: File): Promise<BankRow[]> {
  // Dynamically import pdfjs to avoid build issues with worker
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Group items by approximate Y position (same line)
    const yGroups: Map<number, string[]> = new Map();
    for (const item of textContent.items) {
      if ("str" in item && item.str.trim()) {
        const y = Math.round((item as { transform: number[] }).transform[5]);
        if (!yGroups.has(y)) yGroups.set(y, []);
        yGroups.get(y)!.push(item.str);
      }
    }
    // Sort by Y desc (top to bottom) and join each line
    const sortedYs = Array.from(yGroups.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const lineText = yGroups.get(y)!.join(" ").trim();
      if (lineText) allLines.push(lineText);
    }
  }

  // Attempt to detect tabular bank statement rows
  // Heuristic: look for lines that contain date-like patterns and numeric amounts
  const rows: BankRow[] = [];

  // Date pattern: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dateRegex = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/;

  for (const line of allLines) {
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;

    const date = formatDate(dateMatch[1]);

    // Extract all numeric values from the line
    const numbers: number[] = [];
    const amtRegex = /([\d,]+\.\d{2})/g;
    for (const matchResult of line.matchAll(amtRegex)) {
      const n = parseAmount(matchResult[1]);
      if (n !== null && n > 0) numbers.push(n);
    }

    // Remove date from description
    let desc = line.replace(dateRegex, "").trim();
    // Remove amounts from description (keep text only)
    desc = desc.replace(/[\d,]+\.\d{2}/g, "").trim();
    // Clean extra punctuation
    desc = desc
      .replace(/[|]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!desc && numbers.length === 0) continue;

    // Try to determine debit/credit/balance from the numbers
    let debit: number | null = null;
    let credit: number | null = null;
    let balance: number | null = null;

    if (numbers.length >= 3) {
      // Usually: Debit, Credit, Balance columns (one of debit/credit will be 0 or absent)
      debit = numbers[0] || null;
      credit = numbers[1] || null;
      balance = numbers[2];
      // If both are non-null and similar, it might be just one amount + balance
      if (debit && credit && debit === credit) {
        debit = null;
      }
    } else if (numbers.length === 2) {
      // Amount + Balance
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("cr") || lowerLine.includes("credit")) {
        credit = numbers[0];
      } else {
        debit = numbers[0];
      }
      balance = numbers[1];
    } else if (numbers.length === 1) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("cr") || lowerLine.includes("credit")) {
        credit = numbers[0];
      } else {
        debit = numbers[0];
      }
    }

    const extractedName = extractName(desc);

    rows.push({
      date,
      rawDescription: desc,
      extractedName,
      debit,
      credit,
      balance,
    });
  }

  return rows;
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

async function exportToExcel(rows: BankRow[], filename: string) {
  const XLSX = await import("xlsx");

  const headers = [
    "Date",
    "Particulars",
    "Voucher Type",
    "Debit Amount",
    "Credit Amount",
  ];
  const dataRows = rows.map((r) => [
    r.date,
    r.extractedName || r.rawDescription,
    r.debit ? "Payment" : r.credit ? "Receipt" : "",
    r.debit ?? "",
    r.credit ?? "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Column widths
  ws["!cols"] = [
    { wch: 14 },
    { wch: 40 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bank Statement");
  XLSX.writeFile(wb, filename);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BankConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BankRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalDebits = rows
    ? rows.reduce((sum, r) => sum + (r.debit ?? 0), 0)
    : 0;
  const totalCredits = rows
    ? rows.reduce((sum, r) => sum + (r.credit ?? 0), 0)
    : 0;

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setFile(f);
    setError(null);
    setRows(null);
    setIsProcessing(true);
    try {
      const parsed = await parseBankStatementPDF(f);
      if (parsed.length === 0) {
        setError(
          "No transaction rows found. The PDF may use a non-standard format or contain scanned images (not text-based).",
        );
        setRows(null);
      } else {
        setRows(parsed);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to parse PDF: ${err.message}`
          : "Failed to parse PDF. Ensure the file is a text-based (not scanned) bank statement.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const handleClear = () => {
    setFile(null);
    setRows(null);
    setError(null);
  };

  const handleExport = async () => {
    if (!rows) return;
    const name = file ? file.name.replace(/\.pdf$/i, "") : "bank_statement";
    await exportToExcel(rows, `${name}_tally.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Instructions banner */}
      <Alert className="border-primary/30 bg-primary/5">
        <FileText className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm text-foreground">
          <span className="font-semibold">How it works:</span> Upload your bank
          statement PDF. The tool extracts transaction data client-side, cleans
          party names (removes UPI IDs, reference codes), and exports a
          Tally-ready Excel file with Date, Particulars, Voucher Type, Debit,
          and Credit columns.
        </AlertDescription>
      </Alert>

      {/* Drop zone */}
      <section
        data-ocid="bank.dropzone"
        aria-label="Bank statement PDF upload"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-[200px] select-none",
          isDragging
            ? "border-primary bg-primary/8 scale-[1.01]"
            : file
              ? "border-success/50 bg-success/5"
              : "border-border bg-card hover:border-primary/50 hover:bg-primary/3",
        ].join(" ")}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isProcessing) {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="sr-only"
          onChange={handleInputChange}
          aria-label="Upload PDF bank statement"
        />

        {isProcessing ? (
          <div
            className="flex flex-col items-center gap-3 py-8"
            data-ocid="bank.loading_state"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Parsing PDF…</p>
            <p className="text-xs text-muted-foreground">
              Extracting transactions from {file?.name}
            </p>
          </div>
        ) : file && rows ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center">
              <FileText className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm font-semibold text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {rows.length} transactions found · Click to replace
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove file"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-3 py-10"
            data-ocid="bank.empty_state"
          >
            <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
              <Upload className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">
                Drop your bank statement PDF here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or{" "}
                <button
                  type="button"
                  data-ocid="bank.upload_button"
                  className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  browse to upload
                </button>
              </p>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>✓ PDF bank statements</span>
              <span>✓ Text-based (not scanned)</span>
              <span>✓ Any Indian bank</span>
            </div>
          </div>
        )}
      </section>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Alert variant="destructive" data-ocid="bank.error_state">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {rows && rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Summary cards */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              data-ocid="bank.success_state"
            >
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Transactions
                </p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                  {rows.length}
                </p>
              </div>
              <div className="bg-card border border-destructive/20 rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownCircle className="w-3.5 h-3.5 text-destructive" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Total Debits
                  </p>
                </div>
                <p className="text-2xl font-bold text-destructive tabular-nums">
                  ₹{formatAmount(totalDebits)}
                </p>
              </div>
              <div className="bg-card border border-success/20 rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpCircle className="w-3.5 h-3.5 text-success" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Total Credits
                  </p>
                </div>
                <p className="text-2xl font-bold text-success tabular-nums">
                  ₹{formatAmount(totalCredits)}
                </p>
              </div>
            </div>

            {/* Export button */}
            <div className="flex justify-end">
              <Button
                onClick={handleExport}
                data-ocid="bank.export_button"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export to Excel (Tally Format)
              </Button>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <h2 className="text-sm font-semibold text-foreground">
                  Extracted Transactions
                </h2>
                <Badge variant="secondary" className="tabular-nums text-xs">
                  {rows.length} rows
                </Badge>
              </div>
              <div className="overflow-x-auto" data-ocid="bank.table">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold text-foreground w-28">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-foreground min-w-[200px]">
                        Extracted Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-foreground min-w-[240px]">
                        Raw Description
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-foreground text-right w-32">
                        Debit (₹)
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-foreground text-right w-32">
                        Credit (₹)
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-foreground text-right w-32">
                        Balance (₹)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow
                        key={`${row.date}-${row.rawDescription.slice(0, 16)}-${idx}`}
                        data-ocid={`bank.row.item.${idx + 1}`}
                        className={[
                          "transition-colors text-xs",
                          row.debit
                            ? "bg-destructive/3 hover:bg-destructive/6"
                            : row.credit
                              ? "bg-success/3 hover:bg-success/6"
                              : "hover:bg-muted/30",
                        ].join(" ")}
                      >
                        <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap py-2">
                          {row.date}
                        </TableCell>
                        <TableCell className="font-medium text-foreground py-2 max-w-[200px]">
                          <span
                            className="line-clamp-2"
                            title={row.extractedName}
                          >
                            {row.extractedName || (
                              <span className="text-muted-foreground italic">
                                —
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground py-2 max-w-[240px]">
                          <span
                            className="line-clamp-2"
                            title={row.rawDescription}
                          >
                            {row.rawDescription || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums py-2 text-destructive font-medium">
                          {row.debit ? formatAmount(row.debit) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums py-2 text-success font-medium">
                          {row.credit ? formatAmount(row.credit) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums py-2 text-foreground">
                          {formatAmount(row.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
