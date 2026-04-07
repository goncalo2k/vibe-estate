import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../client";

export function useSearches() {
  return useQuery({
    queryKey: ["searches"],
    queryFn: async () => {
      const res = await client.api.searches.$get();
      if (!res.ok) throw new Error("Failed to fetch searches");
      return res.json();
    },
  });
}

export function useCreateSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await client.api.searches.$post({ json: data });
      if (!res.ok) throw new Error("Failed to create search");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searches"] });
    },
  });
}

export function useDeleteSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.searches[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Failed to delete search");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searches"] });
    },
  });
}
