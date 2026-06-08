import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actionPlansService } from "@/services/action-plans.service";
import type {
  ActionPlanFilters,
  CreateActionPlanInput,
  UpdateActionPlanInput,
} from "@/types/action-plan";

export function useActionPlans(filters?: ActionPlanFilters) {
  return useQuery({
    queryKey: ["action-plans", filters],
    queryFn: () => actionPlansService.list(filters),
    retry: false,
  });
}

export function useActionPlan(id: number) {
  return useQuery({
    queryKey: ["action-plans", id],
    queryFn: () => actionPlansService.getById(id),
    enabled: Number.isFinite(id) && id > 0,
    retry: false,
  });
}

export function useActionPlanStats(companyId?: number) {
  return useQuery({
    queryKey: ["action-plans-stats", companyId],
    queryFn: () => actionPlansService.getStats(companyId),
    retry: false,
  });
}

export function useExport5W2H() {
  return useMutation({
    mutationFn: (filters?: ActionPlanFilters) => actionPlansService.export5W2H(filters),
  });
}

export function useExportActionPlans() {
  return useMutation({
    mutationFn: (filters?: ActionPlanFilters) => actionPlansService.exportTo5W2H(filters),
  });
}

export function useCreateActionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateActionPlanInput) => actionPlansService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["action-plans"] });
      void queryClient.invalidateQueries({ queryKey: ["action-plans-stats"] });
    },
  });
}

export function useGenerateFromAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: number) => actionPlansService.generateFromAssessment(assessmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["action-plans"] });
      void queryClient.invalidateQueries({ queryKey: ["action-plans-stats"] });
    },
  });
}

export function useUpdateActionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateActionPlanInput }) =>
      actionPlansService.update(id, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["action-plans"] });
      void queryClient.invalidateQueries({ queryKey: ["action-plans", variables.id] });
      void queryClient.invalidateQueries({ queryKey: ["action-plans-stats"] });
    },
  });
}

export function useDeleteActionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => actionPlansService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["action-plans"] });
      void queryClient.invalidateQueries({ queryKey: ["action-plans-stats"] });
    },
  });
}
