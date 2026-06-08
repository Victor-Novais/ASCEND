import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  RiskCategory,
  RiskLevel,
  RiskStatus,
  RiskTreatment,
  type Risk,
} from "@/types/risk";

export const riskCategoryLabels: Record<RiskCategory, string> = {
  [RiskCategory.GOVERNANCA]: "Governanca",
  [RiskCategory.SEGURANCA]: "Seguranca",
  [RiskCategory.PROCESSOS]: "Processos",
  [RiskCategory.INFRAESTRUTURA]: "Infraestrutura",
  [RiskCategory.CULTURA]: "Cultura",
};

export const riskStatusLabels: Record<RiskStatus, string> = {
  [RiskStatus.IDENTIFICADO]: "Identificado",
  [RiskStatus.EM_TRATAMENTO]: "Em tratamento",
  [RiskStatus.MITIGADO]: "Mitigado",
  [RiskStatus.ACEITO]: "Aceito",
  [RiskStatus.TRANSFERIDO]: "Transferido",
};

export const riskTreatmentLabels: Record<RiskTreatment, string> = {
  [RiskTreatment.MITIGAR]: "Mitigar",
  [RiskTreatment.ACEITAR]: "Aceitar",
  [RiskTreatment.TRANSFERIR]: "Transferir",
  [RiskTreatment.ELIMINAR]: "Eliminar",
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  [RiskLevel.CRITICO]: "Critico",
  [RiskLevel.ALTO]: "Alto",
  [RiskLevel.MEDIO]: "Medio",
  [RiskLevel.BAIXO]: "Baixo",
};

export const riskCategoryOptions = Object.values(RiskCategory).map((value) => ({
  value,
  label: riskCategoryLabels[value],
}));

export const riskStatusOptions = Object.values(RiskStatus).map((value) => ({
  value,
  label: riskStatusLabels[value],
}));

export const riskTreatmentOptions = Object.values(RiskTreatment).map((value) => ({
  value,
  label: riskTreatmentLabels[value],
}));

export function getRiskLevelFromScore(score: number) {
  if (score >= 20) return RiskLevel.CRITICO;
  if (score >= 12) return RiskLevel.ALTO;
  if (score >= 6) return RiskLevel.MEDIO;
  return RiskLevel.BAIXO;
}

export function getRiskLevelBadgeClass(level: RiskLevel | string) {
  if (level === RiskLevel.CRITICO) return "border-red-200 bg-red-50 text-red-700";
  if (level === RiskLevel.ALTO) return "border-orange-200 bg-orange-50 text-orange-700";
  if (level === RiskLevel.MEDIO) return "border-yellow-200 bg-yellow-50 text-yellow-700";
  return "border-green-200 bg-green-50 text-green-700";
}

export function getRiskStatusBadgeClass(status: RiskStatus | string) {
  if (status === RiskStatus.EM_TRATAMENTO) return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === RiskStatus.MITIGADO) return "border-green-200 bg-green-50 text-green-700";
  if (status === RiskStatus.ACEITO) return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === RiskStatus.TRANSFERIDO) return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function getRiskCategoryBadgeClass(category: string) {
  if (category === RiskCategory.GOVERNANCA) return "border-violet-200 bg-violet-50 text-violet-700";
  if (category === RiskCategory.SEGURANCA) return "border-red-200 bg-red-50 text-red-700";
  if (category === RiskCategory.PROCESSOS) return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (category === RiskCategory.INFRAESTRUTURA) return "border-sky-200 bg-sky-50 text-sky-700";
  if (category === RiskCategory.CULTURA) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function getRiskMatrixColor(score: number) {
  if (score <= 5) return "#16a34a";
  if (score <= 11) return "#ca8a04";
  if (score <= 19) return "#ea580c";
  return "#dc2626";
}

export function getRiskMatrixHoverColor(score: number) {
  if (score <= 5) return "#15803d";
  if (score <= 11) return "#a16207";
  if (score <= 19) return "#c2410c";
  return "#b91c1c";
}

export function getRiskMatrixLabel(probability: number, impact: number) {
  const score = probability * impact;
  const level = getRiskLevelFromScore(score);
  return `Probabilidade ${probability} × Impacto ${impact} = Score ${score} (${riskLevelLabels[level]})`;
}

export function getRiskStatIcon(status: "critical" | "high" | "inTreatment" | "mitigated"): LucideIcon {
  if (status === "critical") return AlertTriangle;
  if (status === "high") return TrendingUp;
  if (status === "inTreatment") return Shield;
  return CheckCircle2;
}

export function isRiskUntreated(risk: Pick<Risk, "status">) {
  return risk.status !== RiskStatus.MITIGADO;
}
