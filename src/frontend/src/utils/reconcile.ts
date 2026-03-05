import * as XLSX from "xlsx";
import type { ReconciliationRow, ReconciliationSummary } from "../backend.d.ts";
import { ReconciliationStatus } from "../types/gst";

export interface ParsedRow {
  gstin: string;
  invoiceNo: string;
  invoiceDate: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function getVal(
  row: Record<string, unknown>,
  ...candidates: string[]
): string | number {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [normalizeKey(k), v]),
  );
  for (const c of candidates) {
    const v = normalized[normalizeKey(c)];
    if (v !== undefined && v !== null && v !== "") return v as string | number;
  }
  return "";
}

function toNum(v: string | number | unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(/,/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function toStr(v: string | number | unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          {
            defval: "",
          },
        );

        const rows: ParsedRow[] = raw.map((r) => ({
          gstin: toStr(getVal(r, "GSTIN", "gstin", "Gstin")),
          invoiceNo: toStr(
            getVal(
              r,
              "Invoice No",
              "invoice no",
              "InvoiceNo",
              "invoice_no",
              "Invoice Number",
              "Bill No",
            ),
          ),
          invoiceDate: toStr(
            getVal(
              r,
              "Invoice Date",
              "invoice date",
              "InvoiceDate",
              "invoice_date",
              "Bill Date",
              "Date",
            ),
          ),
          taxableValue: toNum(
            getVal(
              r,
              "Taxable Value",
              "taxable value",
              "TaxableValue",
              "taxable_value",
              "Taxable Amt",
              "Taxable Amount",
            ),
          ),
          igst: toNum(getVal(r, "IGST", "igst", "IGST Amount", "igst amount")),
          cgst: toNum(getVal(r, "CGST", "cgst", "CGST Amount", "cgst amount")),
          sgst: toNum(
            getVal(
              r,
              "SGST",
              "sgst",
              "SGST Amount",
              "sgst amount",
              "UTGST",
              "utgst",
            ),
          ),
        }));

        resolve(rows.filter((r) => r.gstin || r.invoiceNo));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export interface ReconciliationResult {
  rows: ReconciliationRow[];
  summary: ReconciliationSummary;
}

/**
 * Normalises an invoice number for matching.
 * Examples:
 *   "ONSS/25-26/274"  -> "274"
 *   "INV/2025/274"    -> "274"
 *   "274"             -> "274"
 *   "ABC-274"         -> "274"
 *
 * Strategy: strip all leading non-numeric segments (letters, slashes,
 * hyphens, dots) and keep only the trailing numeric value.
 * If no trailing number is found the original value (uppercased, trimmed)
 * is returned so nothing is accidentally dropped.
 */
function normalizeInvoiceNo(invoiceNo: string): string {
  const s = invoiceNo.toUpperCase().trim();
  // Extract the last contiguous run of digits (optionally with decimals)
  const match = s.match(/(\d[\d.]*)$/);
  if (match) return match[1];
  return s;
}

export function reconcile(
  gstr2bRows: ParsedRow[],
  purchaseRows: ParsedRow[],
): ReconciliationResult {
  const makeKey = (r: ParsedRow) =>
    `${r.gstin.toUpperCase()}::${normalizeInvoiceNo(r.invoiceNo)}`;

  const gstr2bMap = new Map<string, ParsedRow>();
  for (const r of gstr2bRows) {
    gstr2bMap.set(makeKey(r), r);
  }

  const purchaseMap = new Map<string, ParsedRow>();
  for (const r of purchaseRows) {
    purchaseMap.set(makeKey(r), r);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultRows: ReconciliationRow[] = [] as any[];

  // LEFT join: purchase as base
  for (const [key, purchaseRow] of purchaseMap) {
    const gstr2bRow = gstr2bMap.get(key);
    if (gstr2bRow) {
      resultRows.push({
        status: ReconciliationStatus.matched as never,
        gstin: purchaseRow.gstin,
        invoiceNo: purchaseRow.invoiceNo,
        invoiceDate: purchaseRow.invoiceDate || gstr2bRow.invoiceDate,
        taxableValueBook: purchaseRow.taxableValue,
        taxableValue2b: gstr2bRow.taxableValue,
        igstBook: purchaseRow.igst,
        igst2b: gstr2bRow.igst,
        cgstBook: purchaseRow.cgst,
        cgst2b: gstr2bRow.cgst,
        sgstBook: purchaseRow.sgst,
        sgst2b: gstr2bRow.sgst,
      });
    } else {
      resultRows.push({
        status: ReconciliationStatus.missingIn2b as never,
        gstin: purchaseRow.gstin,
        invoiceNo: purchaseRow.invoiceNo,
        invoiceDate: purchaseRow.invoiceDate,
        taxableValueBook: purchaseRow.taxableValue,
        taxableValue2b: 0,
        igstBook: purchaseRow.igst,
        igst2b: 0,
        cgstBook: purchaseRow.cgst,
        cgst2b: 0,
        sgstBook: purchaseRow.sgst,
        sgst2b: 0,
      });
    }
  }

  // Rows only in 2B (missing in books)
  for (const [key, gstr2bRow] of gstr2bMap) {
    if (!purchaseMap.has(key)) {
      resultRows.push({
        status: ReconciliationStatus.missingInBooks as never,
        gstin: gstr2bRow.gstin,
        invoiceNo: gstr2bRow.invoiceNo,
        invoiceDate: gstr2bRow.invoiceDate,
        taxableValueBook: 0,
        taxableValue2b: gstr2bRow.taxableValue,
        igstBook: 0,
        igst2b: gstr2bRow.igst,
        cgstBook: 0,
        cgst2b: gstr2bRow.cgst,
        sgstBook: 0,
        sgst2b: gstr2bRow.sgst,
      });
    }
  }

  const matched = BigInt(
    resultRows.filter((r) => r.status === ReconciliationStatus.matched).length,
  );
  const missingIn2b = BigInt(
    resultRows.filter((r) => r.status === ReconciliationStatus.missingIn2b)
      .length,
  );
  const missingInBooks = BigInt(
    resultRows.filter((r) => r.status === ReconciliationStatus.missingInBooks)
      .length,
  );
  const totalRecords = BigInt(resultRows.length);

  return {
    rows: resultRows,
    summary: { matched, missingIn2b, missingInBooks, totalRecords },
  };
}

export function exportToExcel(
  rows: ReconciliationRow[],
  filename = "reconciliation.xlsx",
) {
  const data = rows.map((r) => ({
    GSTIN: r.gstin,
    "Invoice No": r.invoiceNo,
    "Invoice Date": r.invoiceDate,
    "Taxable Value (Book)": r.taxableValueBook,
    "Taxable Value (2B)": r.taxableValue2b,
    "Taxable Value Diff": r.taxableValueBook - r.taxableValue2b,
    "IGST (Book)": r.igstBook,
    "IGST (2B)": r.igst2b,
    "IGST Diff": r.igstBook - r.igst2b,
    "CGST (Book)": r.cgstBook,
    "CGST (2B)": r.cgst2b,
    "CGST Diff": r.cgstBook - r.cgst2b,
    "SGST (Book)": r.sgstBook,
    "SGST (2B)": r.sgst2b,
    "SGST Diff": r.sgstBook - r.sgst2b,
    Status:
      (r.status as string) === ReconciliationStatus.matched
        ? "Matched"
        : (r.status as string) === ReconciliationStatus.missingIn2b
          ? "Missing in 2B"
          : "Missing in Books",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reconciliation");
  XLSX.writeFile(wb, filename);
}

export function formatINR(value: number): string {
  if (value === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDiff(value: number): string {
  if (value === 0) return "—";
  const prefix = value > 0 ? "+" : "";
  return (
    prefix +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  );
}
