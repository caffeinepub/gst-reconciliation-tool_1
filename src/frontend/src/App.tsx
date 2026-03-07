import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Calculator, FileCheck, FileSpreadsheet, History } from "lucide-react";
import { useState } from "react";
import { BankConverterPage } from "./pages/BankConverterPage";
import { ReconcilePage } from "./pages/ReconcilePage";
import { SavedSessionsPage } from "./pages/SavedSessionsPage";

type ActiveTab = "reconcile" | "sessions" | "bank";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("reconcile");
  const currentYear = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="header-gradient border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Calculator
                  className="w-4.5 h-4.5 text-white"
                  strokeWidth={2}
                />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-none">
                  GST Reconciliation
                </h1>
                <p className="text-xs text-white/60 leading-none mt-0.5">
                  GSTR-2B vs Purchase Book
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav
              className="flex items-center gap-1"
              aria-label="Main navigation"
            >
              <button
                type="button"
                onClick={() => setActiveTab("reconcile")}
                data-ocid="nav.tab"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150",
                  activeTab === "reconcile"
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                <FileCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Reconcile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sessions")}
                data-ocid="nav.tab"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150",
                  activeTab === "sessions"
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Saved Sessions</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bank")}
                data-ocid="nav.bank.tab"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150",
                  activeTab === "bank"
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Bank Converter</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "reconcile" ? (
          <ReconcilePage />
        ) : activeTab === "sessions" ? (
          <SavedSessionsPage />
        ) : (
          <BankConverterPage />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-muted-foreground text-center">
            © {currentYear}. Built with{" "}
            <span className="text-destructive" aria-hidden="true">
              ♥
            </span>{" "}
            using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      <Toaster richColors position="top-right" />
    </div>
  );
}
