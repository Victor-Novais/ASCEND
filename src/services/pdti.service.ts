import { api } from "@/lib/api";
import type {
  PDTI,
  PDTIExportData,
  PDTIDiagnostic,
  PDTIIndicator,
  PDTIObjective,
  PDTIAction,
  CreatePDTIInput,
  UpdatePDTIInput,
  CreatePDTIObjectiveInput,
  UpdatePDTIObjectiveInput,
  CreatePDTIIndicatorInput,
  UpdatePDTIIndicatorInput,
} from "@/types/pdti";

type PDTIListResponse = PDTI[] | { items?: PDTI[]; data?: PDTI[] };
type PDTIResponse = PDTI | { data?: PDTI; item?: PDTI };
type PDTIGenerateResponse = PDTI | { data?: PDTI; item?: PDTI };

type PDTIExportResponse = PDTIExportData | { data?: PDTIExportData; item?: PDTIExportData };

function normalizeDiagnostic(value: PDTIDiagnostic | null | undefined): PDTIDiagnostic {
  return {
    strengths: Array.isArray(value?.strengths) ? value.strengths : [],
    improvements: Array.isArray(value?.improvements) ? value.improvements : [],
    opportunities: Array.isArray(value?.opportunities) ? value.opportunities : [],
    threats: Array.isArray(value?.threats) ? value.threats : [],
  };
}

function normalizeArray<T>(values?: T[] | null): T[] {
  return Array.isArray(values) ? values : [];
}

function normalizePDTI(payload: PDTIResponse | PDTIGenerateResponse | PDTIExportResponse): PDTI {
  const data = Array.isArray(payload)
    ? payload[0]
    : (payload as { data?: PDTI; item?: PDTI }).data ?? (payload as { data?: PDTI; item?: PDTI }).item ?? payload;

  const normalized = data as PDTI;
  return {
    ...normalized,
    diagnostic: normalizeDiagnostic(normalized.diagnostic),
    objectives: normalizeArray(normalized.objectives).map((objective: PDTIObjective) => ({
      ...objective,
      actions: normalizeArray(objective.actions),
    })),
    actions: normalizeArray(normalized.actions),
    indicators: normalizeArray(normalized.indicators),
  };
}

function normalizeList(response: PDTIListResponse): PDTI[] {
  if (Array.isArray(response)) return response.map((item) => normalizePDTI(item));
  return normalizeArray(response.items ?? response.data).map((item) => normalizePDTI(item));
}

type NestedEntityResponse<T> = T | { data?: T; item?: T };

function normalizeObjective(response: NestedEntityResponse<PDTIObjective>): PDTIObjective {
  const data = (response as { data?: PDTIObjective; item?: PDTIObjective }).data
    ?? (response as { data?: PDTIObjective; item?: PDTIObjective }).item
    ?? response;
  return {
    ...data,
    actions: normalizeArray(data.actions),
  };
}

function normalizeIndicator(response: NestedEntityResponse<PDTIIndicator>): PDTIIndicator {
  const data = (response as { data?: PDTIIndicator; item?: PDTIIndicator }).data
    ?? (response as { data?: PDTIIndicator; item?: PDTIIndicator }).item
    ?? response;
  return data;
}

export const pdtiService = {
  list(filters?: { companyId?: number; status?: string; assessmentId?: number }) {
    return api.get<PDTIListResponse>("/pdti", filters).then(normalizeList);
  },
  getById(id: number) {
    return api.get<PDTIResponse>(`/pdti/${id}`).then((response) => normalizePDTI(response));
  },
  create(payload: CreatePDTIInput) {
    return api.post<PDTIResponse>("/pdti", payload).then((response) => normalizePDTI(response));
  },
  update(id: number, payload: UpdatePDTIInput) {
    return api.patch<PDTIResponse>(`/pdti/${id}`, payload).then((response) => normalizePDTI(response));
  },
  remove(id: number) {
    return api.delete<void>(`/pdti/${id}`);
  },
  generateFromAssessment(assessmentId: number) {
    return api.post<PDTIGenerateResponse>(`/pdti/generate/${assessmentId}`).then((response) => normalizePDTI(response));
  },
  exportData(id: number) {
    return api.get<PDTIExportResponse>(`/pdti/${id}/export`).then((response) => normalizePDTI(response));
  },
  createObjective(pdtiId: number, payload: CreatePDTIObjectiveInput) {
    return api
      .post<NestedEntityResponse<PDTIObjective>>(`/pdti/${pdtiId}/objectives`, payload)
      .then((response) => normalizeObjective(response));
  },
  updateObjective(pdtiId: number, objectiveId: number, payload: UpdatePDTIObjectiveInput) {
    return api
      .patch<NestedEntityResponse<PDTIObjective>>(`/pdti/${pdtiId}/objectives/${objectiveId}`, payload)
      .then((response) => normalizeObjective(response));
  },
  removeObjective(pdtiId: number, objectiveId: number) {
    return api.delete<void>(`/pdti/${pdtiId}/objectives/${objectiveId}`);
  },
  createIndicator(pdtiId: number, payload: CreatePDTIIndicatorInput) {
    return api
      .post<NestedEntityResponse<PDTIIndicator>>(`/pdti/${pdtiId}/indicators`, payload)
      .then((response) => normalizeIndicator(response));
  },
  updateIndicator(pdtiId: number, indicatorId: number, payload: UpdatePDTIIndicatorInput) {
    return api
      .patch<NestedEntityResponse<PDTIIndicator>>(`/pdti/${pdtiId}/indicators/${indicatorId}`, payload)
      .then((response) => normalizeIndicator(response));
  },
  removeIndicator(pdtiId: number, indicatorId: number) {
    return api.delete<void>(`/pdti/${pdtiId}/indicators/${indicatorId}`);
  },
};
