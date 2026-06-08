import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { risksService } from "@/services/risks.service";
import type { CreateRiskInput, RiskFilters, UpdateRiskInput } from "@/types/risk";

export function useRisks(filters?: RiskFilters, enabled = true) {
  return useQuery({
    queryKey: ["risks", filters],
    queryFn: () => risksService.list(filters),
    enabled,
    retry: false,
  });
}

export function useRisk(id: number) {
  return useQuery({
    queryKey: ["risks", id],
    queryFn: () => risksService.getById(id),
    enabled: Number.isFinite(id) && id > 0,
    retry: false,
  });
}

export function useRiskStats(companyId?: number, enabled = true) {
  return useQuery({
    queryKey: ["risk-stats", companyId],
    queryFn: () => risksService.getStats(companyId),
    enabled,
    retry: false,
  });
}

export function useRiskMatrix(companyId?: number, enabled = true) {
  return useQuery({
    queryKey: ["risk-matrix", companyId],
    queryFn: () => risksService.getMatrix(companyId),
    enabled,
    retry: false,
  });
}

export function useRiskMatrixComparison(companyId?: number, enabled = true) {
  return useQuery({
    queryKey: ["risk-matrix-comparison", companyId],
    queryFn: () => risksService.getMatrixComparison(companyId),
    enabled,
    retry: false,
  });
}

export function useCreateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRiskInput) => risksService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["risks"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-matrix"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-matrix-comparison"] });
    },
  });
}

export function useGenerateRisksFromAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: number) => risksService.generateFromAssessment(assessmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["risks"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-matrix"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-matrix-comparison"] });
    },
  });
}

export function useUpdateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRiskInput }) =>
      risksService.update(id, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["risks"] });
      void queryClient.invalidateQueries({ queryKey: ["risks", variables.id] });
      void queryClient.invalidateQueries({ queryKey: ["risk-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-matrix"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-matrix-comparison"] });
    },
  });
}

export function useDeleteRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => risksService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["risks"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-matrix"] });
      void queryClient.invalidateQueries({ queryKey: ["risk-matrix-comparison"] });
    },
  });
}
