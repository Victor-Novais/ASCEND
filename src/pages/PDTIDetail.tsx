import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BarChart3, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Download, Edit2, FileText, Loader2, Pencil, Plus, Printer, ShieldCheck, Sparkles, Target, Trash2, TrendingUp } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreatePDTIIndicator,
  useCreatePDTIObjective,
  useDeletePDTIIndicator,
  useDeletePDTIObjective,
  useExportPDTI,
  usePDTI,
  useUpdatePDTI,
  useUpdatePDTIIndicator,
  useUpdatePDTIObjective,
} from "@/hooks/usePDTI";
import { useDownloadPdtiDocx, useDownloadPdtiPdf } from "@/hooks/useExports";
import { useDocumentExport } from "@/hooks/useDocumentExport";
import { downloadPdtiPdf, downloadPdtiDocx } from "@/services/documents.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PDTIStatus, type PDTIDiagnostic, type PDTIAction, type PDTIIndicator, type PDTIObjective, type PDTI } from "@/types/pdti";
import PDTIDocumentView from "@/components/PDTIDocumentView";

const identityFields = [
  { key: "mission", label: "Missão" },
  { key: "vision", label: "Visão" },
  { key: "values", label: "Valores" },
] as const;

const scenarioFields = [
  { key: "currentScenario", label: "Cenário Atual (AS-IS)" },
  { key: "desiredScenario", label: "Cenário Desejado (TO-BE)" },
  { key: "legalRequirements", label: "Requisitos Legais e Normativos" },
  { key: "strategicGoals", label: "Alinhamento Estratégico" },
] as const;

const statusStyles: Record<PDTIStatus, string> = {
  [PDTIStatus.RASCUNHO]: "border-slate-200 bg-slate-100 text-slate-700",
  [PDTIStatus.EM_REVISAO]: "border-amber-200 bg-amber-100 text-amber-800",
  [PDTIStatus.APROVADO]: "border-blue-200 bg-blue-100 text-blue-800",
  [PDTIStatus.VIGENTE]: "border-emerald-200 bg-emerald-100 text-emerald-800",
  [PDTIStatus.ENCERRADO]: "border-red-200 bg-red-100 text-red-800",
};

const statusFlow: PDTIStatus[] = [
  PDTIStatus.RASCUNHO,
  PDTIStatus.EM_REVISAO,
  PDTIStatus.APROVADO,
  PDTIStatus.VIGENTE,
  PDTIStatus.ENCERRADO,
];

function getNextStatus(current: PDTIStatus): PDTIStatus | null {
  const index = statusFlow.indexOf(current);
  if (index === -1 || index >= statusFlow.length - 1) return null;
  return statusFlow[index + 1];
}

function getPreviousStatus(current: PDTIStatus): PDTIStatus | null {
  const index = statusFlow.indexOf(current);
  if (index <= 0) return null;
  return statusFlow[index - 1];
}

function getNextStatusLabel(current: PDTIStatus): string {
  const labels: Record<PDTIStatus, string> = {
    [PDTIStatus.RASCUNHO]: "Enviar para Revisão",
    [PDTIStatus.EM_REVISAO]: "Aprovar",
    [PDTIStatus.APROVADO]: "Tornar Vigente",
    [PDTIStatus.VIGENTE]: "Encerrar",
    [PDTIStatus.ENCERRADO]: "",
  };
  return labels[current];
}

function formatStatusLabel(status: PDTIStatus) {
  return status.replaceAll("_", " ");
}

const emptyObjectiveForm = {
  title: "",
  description: "",
  priority: "MEDIA",
  status: "EM_REVISAO",
};

const emptyIndicatorForm = {
  name: "",
  unit: "%",
  baseline: "0",
  target: "100",
  currentValue: "0",
  frequency: "Mensal",
};

const diagnosticMeta = [
  { key: "strengths", label: "Pontos Fortes", icon: ShieldCheck, accent: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "improvements", label: "Pontos de Melhoria", icon: TrendingUp, accent: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "opportunities", label: "Oportunidades", icon: Sparkles, accent: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "threats", label: "Ameaças", icon: AlertTriangle, accent: "bg-red-50 text-red-700 border-red-200" },
] as const;

const actionStatusStyles: Record<string, string> = {
  PENDENTE: "border-slate-200 bg-slate-100 text-slate-700",
  EM_ANDAMENTO: "border-blue-200 bg-blue-100 text-blue-800",
  CONCLUIDO: "border-emerald-200 bg-emerald-100 text-emerald-800",
  CANCELADO: "border-red-200 bg-red-100 text-red-800",
};

function normalizeDiagnostic(value: PDTIDiagnostic | null | undefined): PDTIDiagnostic {
  return {
    strengths: Array.isArray(value?.strengths) ? value.strengths : [],
    improvements: Array.isArray(value?.improvements) ? value.improvements : [],
    opportunities: Array.isArray(value?.opportunities) ? value.opportunities : [],
    threats: Array.isArray(value?.threats) ? value.threats : [],
  };
}

function toNumber(value: number | string | undefined | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildExportText(data: PDTI) {
  const lines = [
    `PDTI: ${data.title}`,
    `Empresa: ${data.company?.name ?? `#${data.companyId}`}`,
    `Ano: ${data.year}`,
    `Período: ${data.period}`,
    `Status: ${data.status}`,
    "",
    "Visão Geral",
    `Missão: ${data.mission || "—"}`,
    `Visão: ${data.vision || "—"}`,
    `Valores: ${data.values || "—"}`,
    `Alinhamento Estratégico: ${data.strategicGoals || "—"}`,
    `Requisitos Legais: ${data.legalRequirements || "—"}`,
    `Cenário Atual: ${data.currentScenario || "—"}`,
    `Cenário Desejado: ${data.desiredScenario || "—"}`,
  ];

  const diagnostic = normalizeDiagnostic(data.diagnostic);
  lines.push("", "Diagnóstico");
  (Object.entries(diagnostic) as [keyof PDTIDiagnostic, string[]][]).forEach(([key, items]) => {
    lines.push(`${key}:`);
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item || "—"}`);
    });
  });

  lines.push("", "Objetivos Estratégicos");
  (data.objectives ?? []).forEach((objective, index) => {
    lines.push(`${index + 1}. ${objective.title}`);
    lines.push(`   Prioridade: ${objective.priority}`);
    lines.push(`   Status: ${objective.status}`);
    lines.push(`   Descrição: ${objective.description || "—"}`);
    lines.push(`   Ações: ${(objective.actions ?? []).length || 0}`);
  });

  lines.push("", "Indicadores");
  (data.indicators ?? []).forEach((indicator, index) => {
    lines.push(`${index + 1}. ${indicator.name}`);
    lines.push(`   Unidade: ${indicator.unit}`);
    lines.push(`   Baseline: ${indicator.baseline}`);
    lines.push(`   Meta: ${indicator.target}`);
    lines.push(`   Atual: ${indicator.currentValue}`);
    lines.push(`   % Atingido: ${indicator.achievedPercent ?? 0}`);
    lines.push(`   Frequência: ${indicator.frequency}`);
  });

  lines.push("", "Cronograma");
  (data.actions ?? []).forEach((action, index) => {
    lines.push(`${index + 1}. ${action.title}`);
    lines.push(`   Status: ${action.status}`);
    lines.push(`   Prioridade: ${action.priority || "—"}`);
    lines.push(`   Início: ${action.startDate ? new Date(action.startDate).toLocaleDateString("pt-BR") : "—"}`);
    lines.push(`   Prazo: ${action.dueDate ? new Date(action.dueDate).toLocaleDateString("pt-BR") : "—"}`);
    lines.push(`   Responsável: ${action.assignee || "—"}`);
  });

  return lines.join("\n");
}

function buildWordHtml(data: PDTI) {
  const sections = [
    `<h1>${escapeHtml(data.title)}</h1>`,
    `<p><strong>Empresa:</strong> ${escapeHtml(data.company?.name ?? `#${data.companyId}`)}</p>`,
    `<p><strong>Ano:</strong> ${escapeHtml(data.year)} | <strong>Período:</strong> ${escapeHtml(data.period)} | <strong>Status:</strong> ${escapeHtml(data.status)}</p>`,
    `<h2>Visão Geral</h2>`,
    `<ul><li><strong>Missão:</strong> ${escapeHtml(data.mission || "—")}</li><li><strong>Visão:</strong> ${escapeHtml(data.vision || "—")}</li><li><strong>Valores:</strong> ${escapeHtml(data.values || "—")}</li><li><strong>Alinhamento Estratégico:</strong> ${escapeHtml(data.strategicGoals || "—")}</li><li><strong>Requisitos Legais:</strong> ${escapeHtml(data.legalRequirements || "—")}</li><li><strong>Cenário Atual:</strong> ${escapeHtml(data.currentScenario || "—")}</li><li><strong>Cenário Desejado:</strong> ${escapeHtml(data.desiredScenario || "—")}</li></ul>`,
  ];

  const diagnostic = normalizeDiagnostic(data.diagnostic);
  sections.push("<h2>Diagnóstico</h2>");
  (Object.entries(diagnostic) as [keyof PDTIDiagnostic, string[]][]).forEach(([key, items]) => {
    sections.push(`<h3>${escapeHtml(key)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item || "—")}</li>`).join("")}</ul>`);
  });

  sections.push("<h2>Objetivos Estratégicos</h2>");
  sections.push((data.objectives ?? []).map((objective, index) => `
    <section>
      <h3>${index + 1}. ${escapeHtml(objective.title)}</h3>
      <p><strong>Prioridade:</strong> ${escapeHtml(objective.priority)} | <strong>Status:</strong> ${escapeHtml(objective.status)}</p>
      <p><strong>Descrição:</strong> ${escapeHtml(objective.description || "—")}</p>
      <p><strong>Ações vinculadas:</strong> ${escapeHtml((objective.actions ?? []).length)}</p>
    </section>
  `).join(""));

  sections.push("<h2>Indicadores</h2>");
  sections.push((data.indicators ?? []).map((indicator, index) => `
    <section>
      <h3>${index + 1}. ${escapeHtml(indicator.name)}</h3>
      <p><strong>Unidade:</strong> ${escapeHtml(indicator.unit)} | <strong>Frequência:</strong> ${escapeHtml(indicator.frequency)}</p>
      <p><strong>Baseline:</strong> ${escapeHtml(indicator.baseline)} | <strong>Meta:</strong> ${escapeHtml(indicator.target)} | <strong>Atual:</strong> ${escapeHtml(indicator.currentValue)}</p>
      <p><strong>% Atingido:</strong> ${escapeHtml(indicator.achievedPercent ?? 0)}</p>
    </section>
  `).join(""));

  sections.push("<h2>Cronograma</h2>");
  sections.push((data.actions ?? []).map((action, index) => `
    <section>
      <h3>${index + 1}. ${escapeHtml(action.title)}</h3>
      <p><strong>Status:</strong> ${escapeHtml(action.status)} | <strong>Prioridade:</strong> ${escapeHtml(action.priority || "—")}</p>
      <p><strong>Início:</strong> ${escapeHtml(action.startDate ? new Date(action.startDate).toLocaleDateString("pt-BR") : "—")}</p>
      <p><strong>Prazo:</strong> ${escapeHtml(action.dueDate ? new Date(action.dueDate).toLocaleDateString("pt-BR") : "—")}</p>
      <p><strong>Responsável:</strong> ${escapeHtml(action.assignee || "—")}</p>
    </section>
  `).join(""));

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeHtml(data.title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2937;} h1,h2,h3{color:#111827;} p,li{font-size:12pt;} section{margin-bottom:20px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;} ul{padding-left:20px;}</style></head><body>${sections.join("")}</body></html>`;
}

export default function PDTIDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const planId = Number(id);
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const pdtiQuery = usePDTI(planId);
  const exportQuery = useExportPDTI(planId);
  const updatePDTI = useUpdatePDTI();
  const createObjective = useCreatePDTIObjective(planId);
  const updateObjective = useUpdatePDTIObjective(planId);
  const deleteObjective = useDeletePDTIObjective(planId);
  const createIndicator = useCreatePDTIIndicator(planId);
  const updateIndicator = useUpdatePDTIIndicator(planId);
  const deleteIndicator = useDeletePDTIIndicator(planId);
  const downloadPdtiPdf = useDownloadPdtiPdf();
  const downloadPdtiDocx = useDownloadPdtiDocx();
  const { loading: docExportLoading, exportDoc } = useDocumentExport();

  const [viewMode, setViewMode] = useState<"edit" | "document">("edit");
  const [overviewDraft, setOverviewDraft] = useState<Record<string, string>>({});
  const [diagnosticDraft, setDiagnosticDraft] = useState<PDTIDiagnostic>({
    strengths: [],
    improvements: [],
    opportunities: [],
    threats: [],
  });
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<PDTIObjective | null>(null);
  const [objectiveForm, setObjectiveForm] = useState(emptyObjectiveForm);
  const [deleteObjectiveTarget, setDeleteObjectiveTarget] = useState<PDTIObjective | null>(null);
  const [indicatorDialogOpen, setIndicatorDialogOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<PDTIIndicator | null>(null);
  const [indicatorForm, setIndicatorForm] = useState(emptyIndicatorForm);
  const [deleteIndicatorTarget, setDeleteIndicatorTarget] = useState<PDTIIndicator | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvedByDraft, setApprovedByDraft] = useState("");

  useEffect(() => {
    const plan = pdtiQuery.data;
    if (!plan) return;

    setOverviewDraft({
      mission: plan.mission ?? "",
      vision: plan.vision ?? "",
      values: plan.values ?? "",
      strategicGoals: plan.strategicGoals ?? "",
      legalRequirements: plan.legalRequirements ?? "",
      currentScenario: plan.currentScenario ?? "",
      desiredScenario: plan.desiredScenario ?? "",
      period: plan.period ?? "",
      responsible: plan.responsible ?? "",
      swotStrengths: plan.swotStrengths ?? "",
      swotWeaknesses: plan.swotWeaknesses ?? "",
      swotOpportunities: plan.swotOpportunities ?? "",
      swotThreats: plan.swotThreats ?? "",
    });
    setDiagnosticDraft(normalizeDiagnostic(plan.diagnostic));
  }, [pdtiQuery.data]);

  const orderedActions = useMemo(() => {
    const actions = (pdtiQuery.data?.actions ?? []).slice().sort((a, b) => {
      const left = new Date(a.dueDate ?? a.startDate ?? 0).getTime();
      const right = new Date(b.dueDate ?? b.startDate ?? 0).getTime();
      return left - right;
    });
    return actions;
  }, [pdtiQuery.data?.actions]);

  const handleSaveSection = async (field: keyof typeof overviewDraft) => {
    try {
      await updatePDTI.mutateAsync({
        id: planId,
        payload: { [field]: overviewDraft[field] },
      });
      toast.success("Seção atualizada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar seção.");
    }
  };

  const handleSaveDiagnostic = async () => {
    try {
      await updatePDTI.mutateAsync({
        id: planId,
        payload: { diagnostic: diagnosticDraft },
      });
      toast.success("Diagnóstico atualizado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar diagnóstico.");
    }
  };

  const handleSaveSWOT = async () => {
    try {
      await updatePDTI.mutateAsync({
        id: planId,
        payload: {
          swotStrengths: overviewDraft.swotStrengths || null,
          swotWeaknesses: overviewDraft.swotWeaknesses || null,
          swotOpportunities: overviewDraft.swotOpportunities || null,
          swotThreats: overviewDraft.swotThreats || null,
        },
      });
      toast.success("Análise SWOT salva com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar análise SWOT.");
    }
  };

  const openCreateObjective = () => {
    setEditingObjective(null);
    setObjectiveForm(emptyObjectiveForm);
    setObjectiveDialogOpen(true);
  };

  const openEditObjective = (objective: PDTIObjective) => {
    setEditingObjective(objective);
    setObjectiveForm({
      title: objective.title,
      description: objective.description ?? "",
      priority: objective.priority,
      status: objective.status,
    });
    setObjectiveDialogOpen(true);
  };

  const handleSubmitObjective = async () => {
    if (!objectiveForm.title.trim()) {
      toast.error("Informe um título para o objetivo.");
      return;
    }

    const payload = {
      title: objectiveForm.title.trim(),
      description: objectiveForm.description.trim() || null,
      priority: objectiveForm.priority,
      status: objectiveForm.status,
    };

    try {
      if (editingObjective) {
        await updateObjective.mutateAsync({ objectiveId: editingObjective.id, payload });
        toast.success("Objetivo atualizado com sucesso.");
      } else {
        await createObjective.mutateAsync(payload);
        toast.success("Objetivo adicionado com sucesso.");
      }
      setObjectiveDialogOpen(false);
      setEditingObjective(null);
      setObjectiveForm(emptyObjectiveForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar objetivo.");
    }
  };

  const handleDeleteObjective = async () => {
    if (!deleteObjectiveTarget) return;
    try {
      await deleteObjective.mutateAsync(deleteObjectiveTarget.id);
      toast.success("Objetivo removido com sucesso.");
      setDeleteObjectiveTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir objetivo.");
    }
  };

  const openCreateIndicator = () => {
    setEditingIndicator(null);
    setIndicatorForm(emptyIndicatorForm);
    setIndicatorDialogOpen(true);
  };

  const openEditIndicator = (indicator: PDTIIndicator) => {
    setEditingIndicator(indicator);
    setIndicatorForm({
      name: indicator.name,
      unit: indicator.unit,
      baseline: String(indicator.baseline),
      target: String(indicator.target),
      currentValue: String(indicator.currentValue),
      frequency: indicator.frequency,
    });
    setIndicatorDialogOpen(true);
  };

  const handleSubmitIndicator = async () => {
    if (!indicatorForm.name.trim()) {
      toast.error("Informe um nome para o KPI.");
      return;
    }

    const payload = {
      name: indicatorForm.name.trim(),
      unit: indicatorForm.unit.trim() || "%",
      baseline: Number(indicatorForm.baseline) || 0,
      target: Number(indicatorForm.target) || 0,
      currentValue: Number(indicatorForm.currentValue) || 0,
      frequency: indicatorForm.frequency.trim() || "Mensal",
    };

    try {
      if (editingIndicator) {
        await updateIndicator.mutateAsync({ indicatorId: editingIndicator.id, payload });
        toast.success("Indicador atualizado com sucesso.");
      } else {
        await createIndicator.mutateAsync(payload);
        toast.success("Indicador adicionado com sucesso.");
      }
      setIndicatorDialogOpen(false);
      setEditingIndicator(null);
      setIndicatorForm(emptyIndicatorForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar indicador.");
    }
  };

  const handleDeleteIndicator = async () => {
    if (!deleteIndicatorTarget) return;
    try {
      await deleteIndicator.mutateAsync(deleteIndicatorTarget.id);
      toast.success("Indicador removido com sucesso.");
      setDeleteIndicatorTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir indicador.");
    }
  };

  const handleStatusChange = async (status: PDTIStatus, extra?: { approvedBy?: string; approvedAt?: string }) => {
    try {
      await updatePDTI.mutateAsync({
        id: planId,
        payload: { status, ...extra },
      });
      toast.success(`PDTI movido para ${formatStatusLabel(status)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar status.");
    }
  };

  const handleAdvanceStatus = () => {
    const currentStatus = pdtiQuery.data?.status;
    if (!currentStatus) return;

    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return;

    if (nextStatus === PDTIStatus.APROVADO) {
      setApprovedByDraft(pdtiQuery.data?.approvedBy ?? "");
      setApproveDialogOpen(true);
      return;
    }

    void handleStatusChange(nextStatus);
  };

  const handleConfirmApproval = async () => {
    if (!approvedByDraft.trim()) {
      toast.error("Informe quem aprovou o PDTI.");
      return;
    }

    try {
      await updatePDTI.mutateAsync({
        id: planId,
        payload: {
          status: PDTIStatus.APROVADO,
          approvedBy: approvedByDraft.trim(),
          approvedAt: new Date().toISOString(),
        },
      });
      toast.success(`PDTI movido para ${formatStatusLabel(PDTIStatus.APROVADO)}`);
      setApproveDialogOpen(false);
      setApprovedByDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao aprovar PDTI.");
    }
  };

  const handleRevertStatus = () => {
    const currentStatus = pdtiQuery.data?.status;
    if (!currentStatus) return;

    const previousStatus = getPreviousStatus(currentStatus);
    if (!previousStatus) return;

    void handleStatusChange(previousStatus);
  };

  if (pdtiQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const plan = pdtiQuery.data;

  if (!plan) {
    return <div className="rounded-xl border p-6 text-sm text-muted-foreground">PDTI não encontrado.</div>;
  }

  const exportedData = exportQuery.data ?? plan;
  const nextStatus = getNextStatus(plan.status);
  const previousStatus = getPreviousStatus(plan.status);

  const handleExportPdf = async () => {
    try {
      const toastId = toast.loading("📋 Gerando PDF... isso pode levar alguns segundos");
      await downloadPdtiPdf.mutateAsync(planId);
      toast.dismiss(toastId);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar PDF.");
    }
  };

  const handleExportWord = async () => {
    try {
      const toastId = toast.loading("📄 Gerando Word... isso pode levar alguns segundos");
      await downloadPdtiDocx.mutateAsync(planId);
      toast.dismiss(toastId);
      toast.success("Documento Word baixado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar documento Word.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button type="button" variant="outline" onClick={() => navigate("/pdti")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para PDTIs
          </Button>
          <div className="mt-3">
            <h1 className="text-2xl font-bold">{plan.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.company?.name ?? `Empresa #${plan.companyId}`} · {plan.year} · {plan.period}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2">
            <Badge className={statusStyles[plan.status]}>{formatStatusLabel(plan.status)}</Badge>
            {nextStatus ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={statusStyles[nextStatus]}
                disabled={updatePDTI.isPending}
                onClick={handleAdvanceStatus}
              >
                {updatePDTI.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                {getNextStatusLabel(plan.status)}
              </Button>
            ) : null}
            {isAdmin && previousStatus ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={updatePDTI.isPending}
                onClick={handleRevertStatus}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            ) : null}
          </div>

          <Button
            type="button"
            variant={viewMode === "document" ? "default" : "outline"}
            onClick={() => setViewMode(viewMode === "document" ? "edit" : "document")}
          >
            {viewMode === "document" ? (
              <Edit2 className="mr-2 h-4 w-4" />
            ) : (
              <BookOpen className="mr-2 h-4 w-4" />
            )}
            {viewMode === "document" ? "Editar" : "Visualizar Documento"}
          </Button>

          {viewMode === "document" && (
            <Button
              type="button"
              variant="outline"
              data-print-hide
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={docExportLoading}>
                {docExportLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void exportDoc(() => downloadPdtiPdf(planId), "PDF")}>
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportDoc(() => downloadPdtiDocx(planId), "Word (.docx)")}>
                <FileText className="mr-2 h-4 w-4" />
                Baixar Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {viewMode === "document" ? (
        <PDTIDocumentView pdti={plan} />
      ) : null}

      {viewMode === "edit" ? (
      <Tabs defaultValue="identidade" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          <TabsTrigger value="swot">SWOT</TabsTrigger>
          <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {identityFields.map((field) => (
              <Card key={field.key} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{field.label}</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSaveSection(field.key)}
                    >
                      Salvar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-28"
                    value={overviewDraft[field.key] ?? ""}
                    onChange={(event) =>
                      setOverviewDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </CardContent>
              </Card>
            ))}

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Período de Vigência</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleSaveSection("period")}>
                    Salvar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Input
                  value={overviewDraft.period ?? ""}
                  onChange={(event) => setOverviewDraft((current) => ({ ...current, period: event.target.value }))}
                  placeholder="2025-2026"
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Responsável pelo PDTI</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleSaveSection("responsible")}>
                    Salvar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Input
                  value={overviewDraft.responsible ?? ""}
                  onChange={(event) => setOverviewDraft((current) => ({ ...current, responsible: event.target.value }))}
                  placeholder="Nome do responsável"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {scenarioFields.map((field) => (
              <Card key={field.key} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{field.label}</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSaveSection(field.key)}
                    >
                      Salvar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-28"
                    value={overviewDraft[field.key] ?? ""}
                    onChange={(event) =>
                      setOverviewDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-lg font-semibold">Análise do Assessment (arrays)</h2>
              <p className="text-sm text-muted-foreground">Pontos fortes, melhorias, oportunidades e ameaças identificados.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void handleSaveDiagnostic()}>
              Salvar Análise
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {diagnosticMeta.map((entry) => {
              const Icon = entry.icon;
              const items = diagnosticDraft[entry.key] ?? [];

              return (
                <Card key={entry.key} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg border p-2 ${entry.accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{entry.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((item, index) => (
                      <div key={`${entry.key}-${index}`} className="rounded-xl border bg-muted/40 p-3 text-sm">
                        <textarea
                          className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm"
                          value={item}
                          onChange={(event) => {
                            const next = [...items];
                            next[index] = event.target.value;
                            setDiagnosticDraft((current) => ({ ...current, [entry.key]: next }));
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setDiagnosticDraft((current) => ({
                          ...current,
                          [entry.key]: [...items, ""],
                        }));
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar item
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="swot" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Análise SWOT</h2>
              <p className="text-sm text-muted-foreground">Forças, Fraquezas, Oportunidades e Ameaças do ambiente de TI.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void handleSaveSWOT()}>
              Salvar SWOT
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-800">Forças (Strengths)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-40 border-emerald-200 bg-white focus-visible:ring-emerald-400"
                  placeholder="Descreva os pontos fortes internos..."
                  value={overviewDraft.swotStrengths ?? ""}
                  onChange={(event) =>
                    setOverviewDraft((current) => ({ ...current, swotStrengths: event.target.value }))
                  }
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-800">Fraquezas (Weaknesses)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-40 border-red-200 bg-white focus-visible:ring-red-400"
                  placeholder="Descreva as fraquezas internas..."
                  value={overviewDraft.swotWeaknesses ?? ""}
                  onChange={(event) =>
                    setOverviewDraft((current) => ({ ...current, swotWeaknesses: event.target.value }))
                  }
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-blue-800">Oportunidades (Opportunities)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-40 border-blue-200 bg-white focus-visible:ring-blue-400"
                  placeholder="Descreva as oportunidades externas..."
                  value={overviewDraft.swotOpportunities ?? ""}
                  onChange={(event) =>
                    setOverviewDraft((current) => ({ ...current, swotOpportunities: event.target.value }))
                  }
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-orange-800">Ameaças (Threats)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-40 border-orange-200 bg-white focus-visible:ring-orange-400"
                  placeholder="Descreva as ameaças externas..."
                  value={overviewDraft.swotThreats ?? ""}
                  onChange={(event) =>
                    setOverviewDraft((current) => ({ ...current, swotThreats: event.target.value }))
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="objetivos" className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" onClick={openCreateObjective}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Objetivo
            </Button>
          </div>

          <div className="space-y-3">
            {(plan.objectives ?? []).length ? (
              (plan.objectives ?? []).map((objective) => (
              <Card key={objective.id} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{objective.title}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">{objective.priority}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusStyles[objective.status as PDTIStatus] ?? "border-slate-200 bg-slate-100 text-slate-700"}>{objective.status}</Badge>
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEditObjective(objective)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteObjectiveTarget(objective)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{objective.description || "Sem descrição detalhada."}</p>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value={`actions-${objective.id}`}>
                      <AccordionTrigger className="text-sm font-medium">Ações vinculadas ({objective.actions?.length ?? 0})</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {(objective.actions ?? []).length ? (
                            objective.actions?.map((action: PDTIAction) => (
                              <div key={action.id} className="rounded-xl border bg-muted/40 p-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium">{action.title}</p>
                                  <Badge className={actionStatusStyles[action.status] ?? "border-slate-200 bg-slate-100 text-slate-700"}>{action.status}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {action.dueDate ? `Prazo: ${new Date(action.dueDate).toLocaleDateString("pt-BR")}` : "Sem prazo definido"}
                                </p>
                                {action.actionPlanId ? (
                                  <p className="mt-2 text-xs text-primary">Vinculado ao ActionPlan #{action.actionPlanId}</p>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma ação vinculada ainda.</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Nenhum objetivo cadastrado ainda.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cronograma" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Cronograma de ações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderedActions.length ? (
                    orderedActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">{action.title}</TableCell>
                        <TableCell>{action.startDate ? new Date(action.startDate).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell>{action.dueDate ? new Date(action.dueDate).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell>
                          <Badge className={actionStatusStyles[action.status] ?? "border-slate-200 bg-slate-100 text-slate-700"}>{action.status}</Badge>
                        </TableCell>
                        <TableCell>{action.priority ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        Nenhuma ação cadastrada no cronograma.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicadores" className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" onClick={openCreateIndicator}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Indicador
            </Button>
          </div>

          <Card className="rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Baseline</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Atual</TableHead>
                    <TableHead>% Atingido</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(plan.indicators ?? []).length ? (
                    (plan.indicators ?? []).map((indicator) => {
                      const baseline = toNumber(indicator.baseline);
                      const target = toNumber(indicator.target);
                      const current = toNumber(indicator.currentValue);
                      const achieved = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;

                      return (
                        <TableRow key={indicator.id}>
                          <TableCell className="font-medium">{indicator.name}</TableCell>
                          <TableCell>{indicator.unit}</TableCell>
                          <TableCell>{baseline}</TableCell>
                          <TableCell>{target}</TableCell>
                          <TableCell>{current}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="h-2 rounded-full bg-muted">
                                <div className="h-2 rounded-full bg-primary" style={{ width: `${achieved}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground">{achieved.toFixed(0)}%</p>
                            </div>
                          </TableCell>
                          <TableCell>{indicator.frequency}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => openEditIndicator(indicator)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteIndicatorTarget(indicator)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                        Nenhum KPI cadastrado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exportar" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Pré-visualização de exportação</CardTitle>
              </CardHeader>
              <CardContent>
                {exportQuery.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : exportedData ? (
                  <pre className="max-h-[520px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(exportedData, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum dado de exportação carregado.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Ações de exportação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExportPdf()}
                  disabled={downloadPdtiPdf.isPending}
                >
                  {downloadPdtiPdf.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  📋 Baixar PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExportWord()}
                  disabled={downloadPdtiDocx.isPending}
                >
                  {downloadPdtiDocx.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  📄 Baixar Word (.docx)
                </Button>
                <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                  Os dados exportados refletem a estrutura completa do PDTI, incluindo objetivos, ações, indicadores e cenário estratégico.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      ) : null}

      <Dialog
        open={objectiveDialogOpen}
        onOpenChange={(open) => {
          setObjectiveDialogOpen(open);
          if (!open) {
            setEditingObjective(null);
            setObjectiveForm(emptyObjectiveForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingObjective ? "Editar objetivo" : "Novo objetivo"}</DialogTitle>
            <DialogDescription>
              {editingObjective ? "Atualize os dados do objetivo estratégico." : "Cadastre um novo objetivo estratégico para o PDTI."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Título do objetivo</label>
              <Input
                value={objectiveForm.title}
                onChange={(event) => setObjectiveForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex: Modernizar infraestrutura de rede"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Prioridade</label>
                <Select
                  value={objectiveForm.priority}
                  onValueChange={(value) => setObjectiveForm((current) => ({ ...current, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {["ALTA", "MEDIA", "BAIXA"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <Select
                  value={objectiveForm.status}
                  onValueChange={(value) => setObjectiveForm((current) => ({ ...current, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PDTIStatus).map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatStatusLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Descrição</label>
              <Textarea
                className="min-h-24"
                value={objectiveForm.description}
                onChange={(event) => setObjectiveForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descreva o objetivo estratégico"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setObjectiveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={createObjective.isPending || updateObjective.isPending}
              onClick={() => void handleSubmitObjective()}
            >
              {(createObjective.isPending || updateObjective.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingObjective ? "Salvar alterações" : "Criar objetivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={indicatorDialogOpen}
        onOpenChange={(open) => {
          setIndicatorDialogOpen(open);
          if (!open) {
            setEditingIndicator(null);
            setIndicatorForm(emptyIndicatorForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIndicator ? "Editar indicador" : "Novo indicador"}</DialogTitle>
            <DialogDescription>
              {editingIndicator ? "Atualize os dados do KPI." : "Cadastre um novo indicador para o PDTI."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Nome do KPI</label>
              <Input
                value={indicatorForm.name}
                onChange={(event) => setIndicatorForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex: Disponibilidade da infraestrutura"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Unidade</label>
              <Input
                value={indicatorForm.unit}
                onChange={(event) => setIndicatorForm((current) => ({ ...current, unit: event.target.value }))}
                placeholder="%"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Frequência</label>
              <Input
                value={indicatorForm.frequency}
                onChange={(event) => setIndicatorForm((current) => ({ ...current, frequency: event.target.value }))}
                placeholder="Mensal"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Baseline</label>
              <Input
                type="number"
                value={indicatorForm.baseline}
                onChange={(event) => setIndicatorForm((current) => ({ ...current, baseline: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Meta</label>
              <Input
                type="number"
                value={indicatorForm.target}
                onChange={(event) => setIndicatorForm((current) => ({ ...current, target: event.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Valor atual</label>
              <Input
                type="number"
                value={indicatorForm.currentValue}
                onChange={(event) => setIndicatorForm((current) => ({ ...current, currentValue: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIndicatorDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={createIndicator.isPending || updateIndicator.isPending}
              onClick={() => void handleSubmitIndicator()}
            >
              {(createIndicator.isPending || updateIndicator.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingIndicator ? "Salvar alterações" : "Criar indicador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteObjectiveTarget} onOpenChange={(open) => !open && setDeleteObjectiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove permanentemente o objetivo
              {deleteObjectiveTarget ? ` "${deleteObjectiveTarget.title}"` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteObjective()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteIndicatorTarget} onOpenChange={(open) => !open && setDeleteIndicatorTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir indicador?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove permanentemente o indicador
              {deleteIndicatorTarget ? ` "${deleteIndicatorTarget.name}"` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteIndicator()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar PDTI</DialogTitle>
            <DialogDescription>
              Informe o responsável pela aprovação para mover o PDTI para o status Aprovado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="approved-by">
              Aprovado por
            </label>
            <Input
              id="approved-by"
              placeholder="Nome do aprovador"
              value={approvedByDraft}
              onChange={(event) => setApprovedByDraft(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className={statusStyles[PDTIStatus.APROVADO]}
              disabled={updatePDTI.isPending}
              onClick={() => void handleConfirmApproval()}
            >
              {updatePDTI.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
