import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsService } from "@/services/analytics.service";

export function useCompanyEvolution(companyId: number) {
  return useQuery({
    queryKey: ["analytics", "company-evolution", companyId],
    queryFn: () => analyticsService.getCompanyEvolution(companyId),
    enabled: Number.isFinite(companyId) && companyId > 0,
    retry: false,
  });
}

export function useCompanyComparison(companyIds: number[]) {
  return useQuery({
    queryKey: ["analytics", "comparison", companyIds],
    queryFn: () => analyticsService.getComparison(companyIds),
    enabled: companyIds.length >= 2,
    retry: false,
  });
}

export function useBenchmark(segment: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics", "benchmark", segment],
    queryFn: () => analyticsService.getBenchmark(segment),
    enabled: !!segment,
    retry: false,
  });
}

export function usePlatformStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics", "platform-stats"],
    queryFn: () => analyticsService.getPlatformStats(),
    enabled: user?.role === "ADMIN",
    retry: false,
  });
}

export function useCompanyRadar(companyId: number) {
  return useQuery({
    queryKey: ["analytics", "company-radar", companyId],
    queryFn: () => analyticsService.getCompanyRadar(companyId),
    enabled: Number.isFinite(companyId) && companyId > 0,
    retry: false,
  });
}
