import type { Company, QuestionCategory, User } from "@/lib/types";

export enum RiskLevel {
  CRITICO = "CRITICO",
  ALTO = "ALTO",
  MEDIO = "MEDIO",
  BAIXO = "BAIXO",
}

export enum RiskStatus {
  IDENTIFICADO = "IDENTIFICADO",
  EM_TRATAMENTO = "EM_TRATAMENTO",
  MITIGADO = "MITIGADO",
  ACEITO = "ACEITO",
  TRANSFERIDO = "TRANSFERIDO",
}

export enum RiskTreatment {
  MITIGAR = "MITIGAR",
  ACEITAR = "ACEITAR",
  TRANSFERIR = "TRANSFERIR",
  ELIMINAR = "ELIMINAR",
}

export enum RiskCategory {
  GOVERNANCA = "GOVERNANCA",
  SEGURANCA = "SEGURANCA",
  PROCESSOS = "PROCESSOS",
  INFRAESTRUTURA = "INFRAESTRUTURA",
  CULTURA = "CULTURA",
}

export interface Risk {
  id: number;
  companyId: number;
  assessmentId?: number | null;
  title: string;
  description: string;
  category: RiskCategory | QuestionCategory | string;
  frameworkRef: string | null;
  probability: number;
  impact: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: RiskStatus | string;
  treatment: RiskTreatment | string | null;
  responsibleId: string | null;
  reviewDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  responsible?: Pick<User, "id" | "name" | "email" | "role"> | null;
  company?: Pick<Company, "id" | "name" | "segment"> | null;
  assetCategory?: string;
  assetName?: string;
  threat?: string;
  vulnerability?: string;
  inherentProbability?: number;
  inherentImpact?: number;
  inherentScore?: number;
  existingControls?: string;
  proposedControls?: string;
  residualProbability?: number;
  residualImpact?: number;
  residualScore?: number;
  residualLevel?: string;
}

export interface RiskFilters {
  companyId?: number;
  assessmentId?: number;
  responsibleId?: string;
  status?: RiskStatus | string;
  riskLevel?: RiskLevel;
  category?: RiskCategory | string;
}

export interface CreateRiskInput {
  companyId: number;
  assessmentId?: number | null;
  title: string;
  description: string;
  category: RiskCategory;
  frameworkRef?: string | null;
  probability: number;
  impact: number;
  riskScore?: number;
  riskLevel?: RiskLevel;
  status?: RiskStatus | string;
  treatment?: RiskTreatment | string | null;
  responsibleId?: string | null;
  reviewDate?: string | null;
  assetCategory?: string;
  assetName?: string;
  threat?: string;
  vulnerability?: string;
  inherentProbability?: number;
  inherentImpact?: number;
  inherentScore?: number;
  existingControls?: string;
  proposedControls?: string;
  residualProbability?: number;
  residualImpact?: number;
  residualScore?: number;
  residualLevel?: string;
}

export type UpdateRiskInput = Partial<CreateRiskInput>;

export interface GenerateRisksResponse {
  count: number;
  items: Risk[];
}

export interface RiskStats {
  critical: number;
  high: number;
  inTreatment: number;
  mitigated: number;
  total?: number;
  byLevel?: Record<RiskLevel, number>;
  byStatus?: Record<string, number>;
}

export interface RiskMatrixCell {
  probability: number;
  impact: number;
  score: number;
  riskLevel: RiskLevel;
  count: number;
}
