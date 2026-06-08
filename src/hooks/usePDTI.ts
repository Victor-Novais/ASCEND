import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pdtiService } from "@/services/pdti.service";
import type { CreatePDTIInput, UpdatePDTIInput } from "@/types/pdti";

export function usePDTIs(filters?: { companyId?: number; status?: string; assessmentId?: number }) {
  return useQuery({
    queryKey: ["pdti", filters],
    queryFn: () => pdtiService.list(filters),
    retry: false,
  });
}

export function usePDTI(id: number, enabled = true) {
  return useQuery({
    queryKey: ["pdti", id],
    queryFn: () => pdtiService.getById(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
    retry: false,
  });
}

export function useCreatePDTI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePDTIInput) => pdtiService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pdti"] });
    },
  });
}

export function useUpdatePDTI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePDTIInput }) => pdtiService.update(id, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["pdti"] });
      void queryClient.invalidateQueries({ queryKey: ["pdti", variables.id] });
    },
  });
}

export function useDeletePDTI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pdtiService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pdti"] });
    },
  });
}

export function useGeneratePDTI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: number) => pdtiService.generateFromAssessment(assessmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pdti"] });
    },
  });
}

export function useExportPDTI(id: number, enabled = true) {
  return useQuery({
    queryKey: ["pdti-export", id],
    queryFn: () => pdtiService.exportData(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
    retry: false,
  });
}
