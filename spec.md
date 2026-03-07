# GST Reconciliation Tool + Bank Statement Converter

## Current State
The app has two tabs:
- **Reconcile**: Upload GSTR-2B and Purchase Book files, run reconciliation, view matched/missing records with difference columns, export to Excel.
- **Saved Sessions**: List, view, and delete saved reconciliation sessions stored in the backend.

Backend (Motoko) stores reconciliation sessions with summary and row-level data.

## Requested Changes (Diff)

### Add
- **Bank Statement Converter** tab (new third tab in the top navigation).
- **PDF Upload**: Accept a bank statement PDF file via drag-and-drop or file picker.
- **Name Extractor**: Parse and extract party/payee names from the PDF text.
- **Table Preview**: Display extracted transactions in a table with columns: Date, Description/Name, Debit, Credit, Balance.
- **Name Column Highlight**: Show the extracted/cleaned "Name" column separately (stripped of transaction codes, ref numbers, etc.).
- **Export to Excel**: Download the parsed transactions as an `.xlsx` file formatted for Tally import (columns: Date, Particulars/Name, Voucher Type, Debit, Credit).
- All PDF parsing is done entirely in the browser (no backend needed) using `pdfjs-dist`.
- Name extraction logic: strip UPI IDs, transaction IDs, bank codes, and alphanumeric codes to surface clean party names.

### Modify
- `App.tsx`: Add a third tab "Bank Converter" with a `FileSpreadsheet` icon routing to the new `BankConverterPage`.
- Navigation tab list extended from 2 to 3 tabs.

### Remove
- Nothing removed from existing features.

## Implementation Plan
1. Install `pdfjs-dist` and `xlsx` npm packages in the frontend (xlsx likely already present for reconcile export).
2. Create `src/pages/BankConverterPage.tsx` with:
   - File upload zone (drag-and-drop + click) for PDF.
   - PDF text extraction using `pdfjs-dist` entirely client-side.
   - Heuristic row parser: detect date patterns, debit/credit/balance columns from the raw text lines.
   - Name cleaner: remove transaction ref codes, UPI strings, numeric IDs to extract human-readable names.
   - Preview table with columns: Date, Name (Extracted), Description (Raw), Debit, Credit, Balance.
   - "Export to Excel (Tally Format)" button that generates `.xlsx` with Tally-compatible columns.
3. Update `App.tsx` to add the third tab.
4. No backend changes needed.
