import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Eye, Loader2, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { SessionMetadata } from "../backend.d.ts";
import { ReconciliationTable } from "../components/ReconciliationTable";
import { SummaryCards } from "../components/SummaryCards";
import {
  useDeleteSession,
  useGetSession,
  useListSessions,
} from "../hooks/useQueries";

export function SavedSessionsPage() {
  const { data: sessions, isLoading, isError } = useListSessions();
  const deleteSession = useDeleteSession();
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: viewedSession, isLoading: isLoadingSession } =
    useGetSession(viewingSessionId);

  const formatDate = (timestamp: bigint) => {
    const ms = Number(timestamp / 1_000_000n);
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteSession.mutateAsync(deleteTargetId);
      toast.success("Session deleted successfully");
      if (viewingSessionId === deleteTargetId) {
        setViewingSessionId(null);
      }
    } catch {
      toast.error("Failed to delete session");
    } finally {
      setDeleteTargetId(null);
    }
  };

  if (viewingSessionId) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewingSessionId(null)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </Button>
          {viewedSession && (
            <h2 className="text-base font-semibold text-foreground">
              {viewedSession.name}
            </h2>
          )}
        </div>

        {isLoadingSession ? (
          <div className="space-y-3" data-ocid="sessions.loading_state">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : viewedSession ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <SummaryCards summary={viewedSession.summary} />
            <div className="bg-card border border-border rounded-lg p-4 md:p-6 shadow-card">
              <ReconciliationTable
                rows={viewedSession.results}
                summary={viewedSession.summary}
                sessionName={viewedSession.name}
                readOnly
              />
            </div>
          </motion.div>
        ) : (
          <div
            className="text-center py-12 text-muted-foreground"
            data-ocid="sessions.error_state"
          >
            Session not found.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Saved Sessions
        </h2>
        {sessions && sessions.length > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
        {isLoading ? (
          <div className="p-6 space-y-3" data-ocid="sessions.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div
            className="flex items-center justify-center py-16 text-destructive gap-2"
            data-ocid="sessions.error_state"
          >
            <span className="text-sm">
              Failed to load sessions. Please try again.
            </span>
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
            data-ocid="sessions.empty_state"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No saved sessions yet
              </p>
              <p className="text-xs mt-1">
                Run a reconciliation and save the session to see it here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto" data-ocid="sessions.table">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold text-foreground">
                    Session Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-right">
                    Total
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-right">
                    Matched
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-right">
                    Missing in 2B
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-right">
                    Missing in Books
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {sessions.map((session: SessionMetadata, idx: number) => (
                    <motion.tr
                      key={session.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.04 }}
                      className="hover:bg-muted/30 transition-colors border-b border-border last:border-0"
                      data-ocid="sessions.row"
                    >
                      <TableCell className="text-sm font-medium">
                        {session.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(session.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums font-medium">
                        {Number(session.summary.totalRecords).toLocaleString(
                          "en-IN",
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums text-success">
                        {Number(session.summary.matched).toLocaleString(
                          "en-IN",
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums text-warning">
                        {Number(session.summary.missingIn2b).toLocaleString(
                          "en-IN",
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums text-destructive">
                        {Number(session.summary.missingInBooks).toLocaleString(
                          "en-IN",
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingSessionId(session.id)}
                            data-ocid="session.edit_button"
                            className="gap-1.5 h-8 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTargetId(session.id)}
                            data-ocid="session.delete_button"
                            className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent data-ocid="session.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="session.cancel_button"
              onClick={() => setDeleteTargetId(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSession.isPending}
              data-ocid="session.confirm_button"
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteSession.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
