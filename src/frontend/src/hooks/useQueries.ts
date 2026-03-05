import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ReconciliationRow,
  ReconciliationSession,
  ReconciliationSummary,
  SessionMetadata,
} from "../backend.d.ts";
import { useActor } from "./useActor";

export function useListSessions() {
  const { actor, isFetching } = useActor();
  return useQuery<SessionMetadata[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listSessions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSession(id: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ReconciliationSession | null>({
    queryKey: ["session", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getSession(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useSaveSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      summary,
      results,
    }: {
      name: string;
      summary: ReconciliationSummary;
      results: ReconciliationRow[];
    }) => {
      if (!actor) throw new Error("No actor available");
      return actor.saveSession(name, summary, results);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useDeleteSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor available");
      return actor.deleteSession(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
