import { api } from "@/lib/api";
import {
  RiskLevel,
  RiskStatus,
  type CreateRiskInput,
  type GenerateRisksResponse,
  type Risk,
  type RiskFilters,
  type RiskMatrixCell,
  type RiskMatrixComparison,
  type RiskStats,
  type UpdateRiskInput,
} from "@/types/risk";

type RiskListResponse = Risk[] | { items?: Risk[]; data?: Risk[] };
type RiskMatrixResponse =
  | RiskMatrixCell[]
  | {
      matrix?: RiskMatrixCell[];
      cells?: RiskMatrixCell[];
      data?: RiskMatrixCell[];
    };
type RiskMatrixComparisonResponse =
  | RiskMatrixComparison
  | {
      inherent?: RiskMatrixCell[];
      residual?: RiskMatrixCell[];
      inerente?: RiskMatrixCell[];
      residualMatrix?: RiskMatrixCell[];
    };
type RiskGenerateResponse =
  | GenerateRisksResponse
  | Risk[]
  | { count?: number; createdCount?: number; items?: Risk[]; data?: Risk[] };
type RiskStatsResponse =
  | RiskStats
  | {
      critical?: number;
      criticos?: number;
      high?: number;
      altos?: number;
      inTreatment?: number;
      emTratamento?: number;
      mitigated?: number;
      mitigados?: number;
      total?: number;
      byLevel?: Partial<Record<RiskLevel, number>>;
      porNivel?: Partial<Record<RiskLevel, number>>;
      byStatus?: Partial<Record<string, number>>;
      porStatus?: Partial<Record<string, number>>;
    };

function normalizeList(response: RiskListResponse): Risk[] {
  if (Array.isArray(response)) return response;
  return response.items ?? response.data ?? [];
}

function getRiskLevelFromScore(score: number) {
  if (score >= 20) return RiskLevel.CRITICO;
  if (score >= 12) return RiskLevel.ALTO;
  if (score >= 6) return RiskLevel.MEDIO;
  return RiskLevel.BAIXO;
}

function normalizeStats(response: RiskStatsResponse): RiskStats {
  return {
    critical: Number(response.critical ?? response.criticos ?? response.byLevel?.[RiskLevel.CRITICO] ?? response.porNivel?.[RiskLevel.CRITICO] ?? 0),
    high: Number(response.high ?? response.altos ?? response.byLevel?.[RiskLevel.ALTO] ?? response.porNivel?.[RiskLevel.ALTO] ?? 0),
    inTreatment: Number(response.inTreatment ?? response.emTratamento ?? response.byStatus?.[RiskStatus.EM_TRATAMENTO] ?? response.porStatus?.[RiskStatus.EM_TRATAMENTO] ?? 0),
    mitigated: Number(response.mitigated ?? response.mitigados ?? response.byStatus?.[RiskStatus.MITIGADO] ?? response.porStatus?.[RiskStatus.MITIGADO] ?? 0),
    total: Number(response.total ?? 0),
    byLevel: {
      [RiskLevel.CRITICO]: Number(response.byLevel?.[RiskLevel.CRITICO] ?? response.porNivel?.[RiskLevel.CRITICO] ?? 0),
      [RiskLevel.ALTO]: Number(response.byLevel?.[RiskLevel.ALTO] ?? response.porNivel?.[RiskLevel.ALTO] ?? 0),
      [RiskLevel.MEDIO]: Number(response.byLevel?.[RiskLevel.MEDIO] ?? response.porNivel?.[RiskLevel.MEDIO] ?? 0),
      [RiskLevel.BAIXO]: Number(response.byLevel?.[RiskLevel.BAIXO] ?? response.porNivel?.[RiskLevel.BAIXO] ?? 0),
    },
    byStatus: {
      [RiskStatus.IDENTIFICADO]: Number(response.byStatus?.[RiskStatus.IDENTIFICADO] ?? response.porStatus?.[RiskStatus.IDENTIFICADO] ?? 0),
      [RiskStatus.EM_TRATAMENTO]: Number(response.byStatus?.[RiskStatus.EM_TRATAMENTO] ?? response.porStatus?.[RiskStatus.EM_TRATAMENTO] ?? 0),
      [RiskStatus.MITIGADO]: Number(response.byStatus?.[RiskStatus.MITIGADO] ?? response.porStatus?.[RiskStatus.MITIGADO] ?? 0),
      [RiskStatus.ACEITO]: Number(response.byStatus?.[RiskStatus.ACEITO] ?? response.porStatus?.[RiskStatus.ACEITO] ?? 0),
    },
  };
}

function normalizeGenerateResponse(response: RiskGenerateResponse): GenerateRisksResponse {
  if (Array.isArray(response)) {
    return { count: response.length, items: response };
  }
  const items = response.items ?? response.data ?? [];
  return {
    count: Number(response.count ?? response.createdCount ?? items.length),
    items,
  };
}

function normalizeMatrix(response: RiskMatrixResponse): RiskMatrixCell[] {
  const rawCells = Array.isArray(response) ? response : response.matrix ?? response.cells ?? response.data ?? [];
  const cellMap = new Map<string, RiskMatrixCell>();

  for (const cell of rawCells) {
    const probability = Number(cell.probability);
    const impact = Number(cell.impact);
    const score = Number(cell.score ?? probability * impact);
    cellMap.set(`${probability}-${impact}`, {
      probability,
      impact,
      score,
      riskLevel: cell.riskLevel ?? getRiskLevelFromScore(score),
      count: Number(cell.count ?? 0),
    });
  }

  const matrix: RiskMatrixCell[] = [];
  for (let probability = 1; probability <= 5; probability += 1) {
    for (let impact = 1; impact <= 5; impact += 1) {
      const existing = cellMap.get(`${probability}-${impact}`);
      const score = probability * impact;
      matrix.push(
        existing ?? {
          probability,
          impact,
          score,
          riskLevel: getRiskLevelFromScore(score),
          count: 0,
        },
      );
    }
  }
  return matrix;
}

function normalizeMatrixComparison(response: RiskMatrixComparisonResponse): RiskMatrixComparison {
  const inherentSource = "inherent" in response ? response.inherent : undefined;
  const inerenteSource = "inerente" in response ? response.inerente : undefined;
  const residualSource =
    "residual" in response
      ? response.residual
      : "residualMatrix" in response
        ? response.residualMatrix
        : undefined;

  return {
    inherent: normalizeMatrix(inherentSource ?? inerenteSource ?? []),
    residual: normalizeMatrix(residualSource ?? []),
  };
}

export const risksService = {
  list(filters?: RiskFilters) {
    return api.get<RiskListResponse>("/risks", filters).then(normalizeList);
  },
  getById(id: number) {
    return api.get<Risk>(`/risks/${id}`);
  },
  getStats(companyId?: number) {
    return api
      .get<RiskStatsResponse>("/risks/stats", companyId ? { companyId } : undefined)
      .then(normalizeStats);
  },
  getMatrix(companyId?: number) {
    return api
      .get<RiskMatrixResponse>("/risks/matrix", companyId ? { companyId } : undefined)
      .then(normalizeMatrix);
  },
  getMatrixComparison(companyId?: number) {
    return api
      .get<RiskMatrixComparisonResponse>(
        "/risks/matrix-comparison",
        companyId ? { companyId } : undefined,
      )
      .then(normalizeMatrixComparison);
  },
  create(payload: CreateRiskInput) {
    return api.post<Risk>("/risks", payload);
  },
  generateFromAssessment(assessmentId: number) {
    return api
      .post<RiskGenerateResponse>(`/risks/from-assessment/${assessmentId}`)
      .then(normalizeGenerateResponse);
  },
  update(id: number, payload: UpdateRiskInput) {
    return api.patch<Risk>(`/risks/${id}`, payload);
  },
  remove(id: number) {
    return api.delete<void>(`/risks/${id}`);
  },
};
