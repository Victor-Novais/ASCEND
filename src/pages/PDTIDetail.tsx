import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BarChart3, BookOpen, CheckCircle2, Download, Edit2, FileText, Loader2, Plus, Printer, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useExportPDTI, usePDTI, useUpdatePDTI } from "@/hooks/usePDTI";
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

  const pdtiQuery = usePDTI(planId);
  const exportQuery = useExportPDTI(planId);
  const updatePDTI = useUpdatePDTI();
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
  const [objectivesDraft, setObjectivesDraft] = useState<PDTIObjective[]>([]);
  const [indicatorsDraft, setIndicatorsDraft] = useState<PDTIIndicator[]>([]);
  const [newObjectiveDraft, setNewObjectiveDraft] = useState({
    title: "",
    description: "",
    priority: "MEDIA",
    status: "EM_REVISAO",
  });
  const [newIndicatorDraft, setNewIndicatorDraft] = useState({
    name: "",
    unit: "%",
    baseline: "0",
    target: "100",
    currentValue: "0",
    frequency: "Mensal",
  });

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
    setObjectivesDraft(plan.objectives ?? []);
    setIndicatorsDraft(plan.indicators ?? []);
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

  const handleAddObjective = async () => {
    if (!newObjectiveDraft.title.trim()) {
      toast.error("Informe um título para o objetivo.");
      return;
    }

    const objective: PDTIObjective = {
      id: Date.now(),
      pdtiId: planId,
      title: newObjectiveDraft.title.trim(),
      description: newObjectiveDraft.description.trim() || null,
      priority: newObjectiveDraft.priority,
      status: newObjectiveDraft.status,
      actions: [],
    };

    const next = [...objectivesDraft, objective];
    setObjectivesDraft(next);
    setNewObjectiveDraft({
      title: "",
      description: "",
      priority: "MEDIA",
      status: "EM_REVISAO",
    });

    try {
      await updatePDTI.mutateAsync({
        id: planId,
        payload: { objectives: next },
      });
      toast.success("Objetivo adicionado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao adicionar objetivo.");
    }
  };

  const handleSaveIndicators = async () => {
    try {
      await updatePDTI.mutateAsync({
        id: planId,
        payload: { indicators: indicatorsDraft },
      });
      toast.success("Indicadores atualizados com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar indicadores.");
    }
  };

  const handleAddIndicator = async () => {
    if (!newIndicatorDraft.name.trim()) {
      toast.error("Informe um nome para o KPI.");
      return;
    }

    const indicator: PDTIIndicator = {
      id: Date.now(),
      pdtiId: planId,
      name: newIndicatorDraft.name.trim(),
      unit: newIndicatorDraft.unit.trim() || "%",
      baseline: Number(newIndicatorDraft.baseline) || 0,
      target: Number(newIndicatorDraft.target) || 0,
      currentValue: Number(newIndicatorDraft.currentValue) || 0,
      achievedPercent: (() => {
        const target = Number(newIndicatorDraft.target) || 0;
        if (!target) return 0;
        return Math.min(100, Math.max(0, (Number(newIndicatorDraft.currentValue) / target) * 100));
      })(),
      frequency: newIndicatorDraft.frequency.trim() || "Mensal",
    };

    const next = [...indicatorsDraft, indicator];
    setIndicatorsDraft(next);
    setNewIndicatorDraft({
      name: "",
      unit: "%",
      baseline: "0",
      target: "100",
      currentValue: "0",
      frequency: "Mensal",
    });

    try {
      await updatePDTI.mutateAsync({
        id: planId,
        payload: { indicators: next },
      });
      toast.success("KPI adicionado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao adicionar KPI.");
    }
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

        <div className="flex flex-wrap gap-2">
          <Badge className={statusStyles[plan.status]}>{plan.status}</Badge>

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
          <div className="rounded-2xl border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Título do objetivo</label>
                <Input
                  value={newObjectiveDraft.title}
                  onChange={(event) => setNewObjectiveDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ex: Modernizar infraestrutura de rede"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Prioridade</label>
                <Select
                  value={newObjectiveDraft.priority}
                  onValueChange={(value) => setNewObjectiveDraft((current) => ({ ...current, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {['ALTA','MEDIA','BAIXA'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <Select
                  value={newObjectiveDraft.status}
                  onValueChange={(value) => setNewObjectiveDraft((current) => ({ ...current, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PDTIStatus).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-2 block text-sm font-medium">Descrição</label>
              <Textarea
                className="min-h-24"
                value={newObjectiveDraft.description}
                onChange={(event) => setNewObjectiveDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descreva o objetivo estratégico"
              />
            </div>

            <div className="mt-3 flex justify-end">
              <Button type="button" onClick={() => void handleAddObjective()}>
                Adicionar objetivo
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {objectivesDraft.map((objective) => (
              <Card key={objective.id} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{objective.title}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">{objective.priority}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusStyles[objective.status as PDTIStatus] ?? "border-slate-200 bg-slate-100 text-slate-700"}>{objective.status}</Badge>
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
            ))}
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
          <div className="rounded-2xl border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Nome do KPI</label>
                <Input
                  value={newIndicatorDraft.name}
                  onChange={(event) => setNewIndicatorDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex: Disponibilidade da infraestrutura"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Unidade</label>
                <Input
                  value={newIndicatorDraft.unit}
                  onChange={(event) => setNewIndicatorDraft((current) => ({ ...current, unit: event.target.value }))}
                  placeholder="%"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Baseline</label>
                <Input
                  type="number"
                  value={newIndicatorDraft.baseline}
                  onChange={(event) => setNewIndicatorDraft((current) => ({ ...current, baseline: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Meta</label>
                <Input
                  type="number"
                  value={newIndicatorDraft.target}
                  onChange={(event) => setNewIndicatorDraft((current) => ({ ...current, target: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Atual</label>
                <Input
                  type="number"
                  value={newIndicatorDraft.currentValue}
                  onChange={(event) => setNewIndicatorDraft((current) => ({ ...current, currentValue: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Frequência</label>
                <Input
                  value={newIndicatorDraft.frequency}
                  onChange={(event) => setNewIndicatorDraft((current) => ({ ...current, frequency: event.target.value }))}
                  placeholder="Mensal"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => void handleSaveIndicators()}>
                Salvar indicadores
              </Button>
              <Button type="button" onClick={() => void handleAddIndicator()}>
                Adicionar KPI
              </Button>
            </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicatorsDraft.length ? (
                    indicatorsDraft.map((indicator) => {
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
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
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
    </div>
  );
}
