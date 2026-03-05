// Runtime constants matching ReconciliationStatus enum from backend.d.ts
export const ReconciliationStatus = {
  matched: "matched",
  missingInBooks: "missingInBooks",
  missingIn2b: "missingIn2b",
} as const;

export type ReconciliationStatusType =
  (typeof ReconciliationStatus)[keyof typeof ReconciliationStatus];
