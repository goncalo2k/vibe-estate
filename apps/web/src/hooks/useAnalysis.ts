import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../client";

export function useAnalysis(propertyId: string) {
  return useQuery({
    queryKey: ["analysis", propertyId],
    queryFn: async () => {
      const res = await client.api.analysis.properties[":id"].analysis.$get({
        param: { id: propertyId },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch analysis");
      return res.json();
    },
    enabled: !!propertyId,
  });
}

export function useTriggerAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const res = await client.api.analysis.properties[":id"].analysis.$post({
        param: { id: propertyId },
      });
      if (!res.ok) throw new Error("Failed to trigger analysis");
      return res.json();
    },
    onSuccess: (_, propertyId) => {
      queryClient.invalidateQueries({ queryKey: ["analysis", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });
}
