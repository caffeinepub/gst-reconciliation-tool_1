import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ReconciliationSummary {
    matched: bigint;
    missingInBooks: bigint;
    missingIn2b: bigint;
    totalRecords: bigint;
}
export interface SessionMetadata {
    id: string;
    name: string;
    summary: ReconciliationSummary;
    timestamp: Time;
}
export type Time = bigint;
export interface ReconciliationSession {
    id: string;
    name: string;
    results: Array<ReconciliationRow>;
    summary: ReconciliationSummary;
    timestamp: Time;
}
export interface ReconciliationRow {
    status: ReconciliationStatus;
    igstBook: number;
    cgst2b: number;
    invoiceNo: string;
    sgstBook: number;
    invoiceDate: string;
    sgst2b: number;
    igst2b: number;
    gstin: string;
    taxableValue2b: number;
    cgstBook: number;
    taxableValueBook: number;
}
export enum ReconciliationStatus {
    matched = "matched",
    missingInBooks = "missingInBooks",
    missingIn2b = "missingIn2b"
}
export interface backendInterface {
    deleteSession(id: string): Promise<void>;
    getSession(id: string): Promise<ReconciliationSession | null>;
    listSessions(): Promise<Array<SessionMetadata>>;
    saveSession(name: string, summary: ReconciliationSummary, results: Array<ReconciliationRow>): Promise<string>;
}
