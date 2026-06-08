import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pdtiService } from "@/services/pdti.service";
import type {
  CreatePDTIIndicatorInput,
  CreatePDTIInput,
  CreatePDTIObjectiveInput,
  UpdatePDTIIndicatorInput,
  UpdatePDTIInput,
  UpdatePDTIObjectiveInput,
} from "@/types/pdti";

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

function invalidatePdti(queryClient: ReturnType<typeof useQueryClient>, pdtiId: number) {
  void queryClient.invalidateQueries({ queryKey: ["pdti"] });
  void queryClient.invalidateQueries({ queryKey: ["pdti", pdtiId] });
  void queryClient.invalidateQueries({ queryKey: ["pdti-export", pdtiId] });
}

export function useCreatePDTIObjective(pdtiId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePDTIObjectiveInput) => pdtiService.createObjective(pdtiId, payload),
    onSuccess: () => invalidatePdti(queryClient, pdtiId),
  });
}

export function useUpdatePDTIObjective(pdtiId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objectiveId, payload }: { objectiveId: number; payload: UpdatePDTIObjectiveInput }) =>
      pdtiService.updateObjective(pdtiId, objectiveId, payload),
    onSuccess: () => invalidatePdti(queryClient, pdtiId),
  });
}

export function useDeletePDTIObjective(pdtiId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (objectiveId: number) => pdtiService.removeObjective(pdtiId, objectiveId),
    onSuccess: () => invalidatePdti(queryClient, pdtiId),
  });
}

export function useCreatePDTIIndicator(pdtiId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePDTIIndicatorInput) => pdtiService.createIndicator(pdtiId, payload),
    onSuccess: () => invalidatePdti(queryClient, pdtiId),
  });
}

export function useUpdatePDTIIndicator(pdtiId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ indicatorId, payload }: { indicatorId: number; payload: UpdatePDTIIndicatorInput }) =>
      pdtiService.updateIndicator(pdtiId, indicatorId, payload),
    onSuccess: () => invalidatePdti(queryClient, pdtiId),
  });
}

export function useDeletePDTIIndicator(pdtiId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (indicatorId: number) => pdtiService.removeIndicator(pdtiId, indicatorId),
    onSuccess: () => invalidatePdti(queryClient, pdtiId),
  });
}
