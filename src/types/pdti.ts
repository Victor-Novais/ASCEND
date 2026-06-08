import type { Assessment, Company } from "@/lib/types";

export enum PDTIStatus {
  RASCUNHO = "RASCUNHO",
  EM_REVISAO = "EM_REVISAO",
  APROVADO = "APROVADO",
  VIGENTE = "VIGENTE",
  ENCERRADO = "ENCERRADO",
}

export interface PDTIDiagnostic {
  strengths: string[];
  improvements: string[];
  opportunities: string[];
  threats: string[];
}

export interface PDTIIndicator {
  id: number;
  pdtiId: number;
  name: string;
  unit: string;
  baseline: number | string;
  target: number | string;
  currentValue: number | string;
  achievedPercent?: number;
  frequency: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PDTIAction {
  id: number;
  pdtiId: number;
  objectiveId?: number | null;
  title: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  endDate?: string | null;
  status: string;
  priority?: string | null;
  actionPlanId?: number | null;
  actionPlanName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PDTIObjective {
  id: number;
  pdtiId: number;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  order?: number;
  actions?: PDTIAction[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PDTI {
  id: number;
  companyId: number;
  assessmentId?: number | null;
  title: string;
  year: number;
  period: string;
  status: PDTIStatus;
  mission?: string | null;
  vision?: string | null;
  values?: string | null;
  strategicGoals?: string | null;
  generatedBy?: string | null;
  legalRequirements?: string | null;
  currentScenario?: string | null;
  desiredScenario?: string | null;
  responsible?: string | null;
  swotStrengths?: string | null;
  swotWeaknesses?: string | null;
  swotOpportunities?: string | null;
  swotThreats?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  diagnostic?: PDTIDiagnostic | null;
  objectives?: PDTIObjective[];
  actions?: PDTIAction[];
  indicators?: PDTIIndicator[];
  company?: Pick<Company, "id" | "name"> | null;
  assessment?: Pick<Assessment, "id" | "status" | "maturityLevel"> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePDTIInput {
  companyId: number;
  assessmentId?: number | null;
  title: string;
  year: number;
  period: string;
  status?: PDTIStatus;
  mission?: string | null;
  vision?: string | null;
  values?: string | null;
  strategicGoals?: string | null;
  legalRequirements?: string | null;
  currentScenario?: string | null;
  desiredScenario?: string | null;
  responsible?: string | null;
  swotStrengths?: string | null;
  swotWeaknesses?: string | null;
  swotOpportunities?: string | null;
  swotThreats?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  diagnostic?: PDTIDiagnostic | null;
  objectives?: PDTIObjective[];
  actions?: PDTIAction[];
  indicators?: PDTIIndicator[];
}

export type UpdatePDTIInput = Partial<CreatePDTIInput>;

export type PDTIExportData = PDTI;
