import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Download,
  FileText,
  Flame,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentExport } from "@/hooks/useDocumentExport";
import { downloadRisksExcel, downloadRisksPdf } from "@/services/documents.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RiskDetail from "@/components/risks/RiskDetail";
import RiskForm from "@/components/risks/RiskForm";
import RiskMatrix from "@/components/RiskMatrix";
import {
  getRiskCategoryBadgeClass,
  getRiskLevelBadgeClass,
  getRiskStatusBadgeClass,
  isRiskUntreated,
  riskCategoryLabels,
  riskCategoryOptions,
  riskLevelLabels,
  riskStatusLabels,
  riskStatusOptions,
} from "@/components/risks/risk-utils";
import FrameworkBadge from "@/components/FrameworkBadge";
import { SkeletonBlock, SkeletonTable } from "@/components/ui/skeleton-card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useAssessments } from "@/hooks/useAssessments";
import { useCompanies } from "@/hooks/useCompanies";
import {
  useCreateRisk,
  useDeleteRisk,
  useGenerateRisksFromAssessment,
  useRisk,
  useRiskMatrix,
  useRiskMatrixComparison,
  useRisks,
  useRiskStats,
  useUpdateRisk,
} from "@/hooks/useRisks";
import { useUsers } from "@/hooks/useUser";
import type { AssessmentWithRelations, CompanyWithRelations, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  RiskLevel,
  RiskStatus,
  type CreateRiskInput,
  type Risk,
  type RiskCategory,
  type RiskFilters,
  type UpdateRiskInput,
} from "@/types/risk";

function getResponsibleUsers(users: User[] | undefined) {
  return (users ?? []).filter((user) => {
    const role = String(user.role ?? "").toUpperCase();
    return role.includes("AVALIADOR") || role.includes("COLLABORATOR") || role.includes("COLABORADOR");
  });
}

function formatReviewDate(value?: string | null) {
  if (!value) return "Sem prazo";
  return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
}

function generateRisksXlsx(
  risks: Risk[],
  stats: { critical: number; high: number; inTreatment: number; mitigated: number } | undefined
) {
  const workbook = XLSX.utils.book_new();

  // Aba 1: Resumo com estatísticas
  const summaryData = [
    ["Resumo de Riscos", ""],
    ["", ""],
    ["Métrica", "Valor"],
    ["Riscos Críticos", stats?.critical ?? 0],
    ["Riscos Altos", stats?.high ?? 0],
    ["Em Tratamento", stats?.inTreatment ?? 0],
    ["Mitigados", stats?.mitigated ?? 0],
    ["Total de Riscos", risks.length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  if (summarySheet["A1"]) {
    summarySheet["A1"].fill = { fgColor: { rgb: "1F4E79" } };
    summarySheet["A1"].font = { bold: true, color: { rgb: "FFFFFF" } };
  }
  if (summarySheet["B1"]) {
    summarySheet["B1"].fill = { fgColor: { rgb: "1F4E79" } };
    summarySheet["B1"].font = { bold: true, color: { rgb: "FFFFFF" } };
  }

  // Aplicar estilo aos cabeçalhos
  for (let i = 65; i <= 66; i++) {
    const cellRef = String.fromCharCode(i) + "3";
    if (summarySheet[cellRef]) {
      summarySheet[cellRef].fill = { fgColor: { rgb: "1F4E79" } };
      summarySheet[cellRef].font = { bold: true, color: { rgb: "FFFFFF" } };
    }
  }

  summarySheet["!cols"] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  // Aba 2: Detalhes dos riscos
  const risksData: unknown[][] = [
    [
      "ID",
      "Título",
      "Descrição",
      "Categoria",
      "Nível",
      "Status",
      "Probabilidade",
      "Impacto",
      "Responsável",
      "Data de Revisão",
      "Observações",
    ],
    ...risks.map((risk) => [
      risk.id,
      risk.title,
      risk.description || "-",
      riskCategoryLabels[risk.category as RiskCategory] || risk.category,
      riskLevelLabels[risk.riskLevel as RiskLevel] || risk.riskLevel,
      riskStatusLabels[risk.status as RiskStatus] || risk.status,
      risk.probability,
      risk.impact,
      risk.responsible || "-",
      formatReviewDate(risk.reviewDate),
      risk.treatment || "-",
    ]),
  ];

  const risksSheet = XLSX.utils.aoa_to_sheet(risksData);

  // Aplicar estilos ao cabeçalho
  for (let i = 1; i <= 11; i++) {
    const cellRef = XLSX.utils.encode_col(i - 1) + "1";
    if (risksSheet[cellRef]) {
      risksSheet[cellRef].fill = { fgColor: { rgb: "1F4E79" } };
      risksSheet[cellRef].font = { bold: true, color: { rgb: "FFFFFF" } };
    }
  }

  // Aplicar cores aos níveis de risco
  const riskLevelColors: Record<RiskLevel, string> = {
    [RiskLevel.CRITICAL]: "FF0000", // Vermelho
    [RiskLevel.HIGH]: "FF9900", // Laranja
    [RiskLevel.MEDIUM]: "FFFF00", // Amarelo
    [RiskLevel.LOW]: "00B050", // Verde
  };

  risksData.forEach((row, rowIndex) => {
    if (rowIndex === 0) return; // Pular cabeçalho
    const riskLevel = row[4] as RiskLevel; // Coluna de nível
    const cellRef = XLSX.utils.encode_col(4) + (rowIndex + 1);
    if (risksSheet[cellRef] && riskLevelColors[riskLevel]) {
      risksSheet[cellRef].fill = { fgColor: { rgb: riskLevelColors[riskLevel] } };
    }
  });

  risksSheet["!cols"] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(workbook, risksSheet, "Riscos");

  // Gerar arquivo
  XLSX.writeFile(workbook, `Riscos_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

function RisksStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border bg-card p-5">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-4 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function RisksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [statusFilter, setStatusFilter] = useState<RiskStatus | "ALL">("ALL");
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | "ALL">("ALL");
  const [companyFilter, setCompanyFilter] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ probability: number; impact: number } | null>(null);
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [matrixViewMode, setMatrixViewMode] = useState<"current" | "comparison">("current");

  const companiesQuery = useCompanies();
  const firstCompanyId = companiesQuery.data?.[0]?.id;
  const activeCompanyId = isAdmin ? (companyFilter ?? firstCompanyId) : firstCompanyId;

  const filters: RiskFilters = {
    status: statusFilter === "ALL" ? undefined : statusFilter,
    riskLevel: levelFilter === "ALL" ? undefined : levelFilter,
    category: categoryFilter === "ALL" ? undefined : categoryFilter,
    companyId: isAdmin ? companyFilter ?? undefined : firstCompanyId,
  };

  const risksQuery = useRisks(filters);
  const statsQuery = useRiskStats(isAdmin ? companyFilter ?? undefined : firstCompanyId);
  const matrixQuery = useRiskMatrix(activeCompanyId, matrixViewMode === "current");
  const matrixComparisonQuery = useRiskMatrixComparison(
    activeCompanyId,
    matrixViewMode === "comparison",
  );
  const usersQuery = useUsers();
  const assessmentsQuery = useAssessments();
  const detailQuery = useRisk(selectedRiskId ?? 0);

  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const deleteRisk = useDeleteRisk();
  const generateFromAssessment = useGenerateRisksFromAssessment();
  const { loading: pdfExportLoading, exportDoc } = useDocumentExport();

  const risks = risksQuery.data ?? [];
  const selectedRisk = detailQuery.data ?? risks.find((risk) => risk.id === selectedRiskId) ?? null;
  const companies = (companiesQuery.data ?? []) as CompanyWithRelations[];
  const responsibles = getResponsibleUsers(usersQuery.data);
  const assessments = (assessmentsQuery.data ?? []) as AssessmentWithRelations[];
  const selectedAssessment = selectedAssessmentId
    ? assessments.find((assessment) => assessment.id === selectedAssessmentId)
    : undefined;

  const tableRisks = selectedCell
    ? risks.filter(
        (risk) => risk.probability === selectedCell.probability && risk.impact === selectedCell.impact,
      )
    : risks;

  async function handleCreateOrUpdate(payload: CreateRiskInput | UpdateRiskInput) {
    try {
      if (editingRisk) {
        await updateRisk.mutateAsync({ id: editingRisk.id, payload });
        toast.success("Risco atualizado com sucesso.");
      } else {
        await createRisk.mutateAsync(payload as CreateRiskInput);
        toast.success("Risco criado com sucesso.");
      }
      setEditingRisk(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar risco.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRisk.mutateAsync(deleteTarget.id);
      toast.success("Risco removido com sucesso.");
      setDeleteTarget(null);
      if (selectedRiskId === deleteTarget.id) setSelectedRiskId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir risco.");
    }
  }

  async function handleGenerate() {
    if (!selectedAssessmentId) {
      toast.error("Selecione um assessment para gerar a matriz de riscos.");
      return;
    }
    try {
      const response = await generateFromAssessment.mutateAsync(selectedAssessmentId);
      toast.success(`${response.count} riscos identificados e adicionados à matriz!`);
      setIsGenerateOpen(false);
      setSelectedAssessmentId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar riscos.");
    }
  }

  const handleExportXlsx = async () => {
    try {
      setIsExporting(true);
      const toastId = toast.loading("📊 Gerando planilha... isso pode levar alguns segundos");

      // Simular processamento assíncrono
      await new Promise((resolve) => setTimeout(resolve, 500));

      generateRisksXlsx(risks, statsQuery.data);

      toast.dismiss(toastId);
      toast.success("Planilha de riscos exportada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar planilha.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Riscos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Avalie, priorize e acompanhe os riscos identificados nas avaliacoes.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => void handleExportXlsx()}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar XLSX
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl" disabled={pdfExportLoading}>
                {pdfExportLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Exportar Relatório
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  const cId = isAdmin ? (companyFilter ?? firstCompanyId) : firstCompanyId;
                  if (!cId) {
                    toast.warning("Selecione uma empresa para exportar o relatório.");
                    return;
                  }
                  void exportDoc(() => downloadRisksPdf(cId), "PDF de riscos");
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF - Plano de Tratamento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const cId = isAdmin ? (companyFilter ?? firstCompanyId) : firstCompanyId;
                  if (!cId) {
                    toast.warning("Selecione uma empresa para exportar o relatório.");
                    return;
                  }
                  void exportDoc(() => downloadRisksExcel(cId), "Excel de riscos");
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Excel - Registro de Riscos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="rounded-xl" onClick={() => setIsGenerateOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar do Assessment
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditingRisk(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Risco
          </Button>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <RisksStatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Riscos Criticos", value: statsQuery.data?.critical ?? 0, icon: Flame, tone: "text-red-700 bg-red-100" },
            { title: "Riscos Altos", value: statsQuery.data?.high ?? 0, icon: TrendingUp, tone: "text-orange-700 bg-orange-100" },
            { title: "Em Tratamento", value: statsQuery.data?.inTreatment ?? 0, icon: Shield, tone: "text-blue-700 bg-blue-100" },
            { title: "Mitigados", value: statsQuery.data?.mitigated ?? 0, icon: CheckCircle, tone: "text-green-700 bg-green-100" },
          ].map((item) => (
            <Card key={item.title} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="mt-3 text-3xl font-bold">{item.value}</p>
                  </div>
                  <div className={cn("rounded-2xl p-3", item.tone)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg">Matriz de Riscos (Probabilidade × Impacto)</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {matrixViewMode === "current"
                ? "Clique em uma celula para filtrar a tabela por probabilidade e impacto."
                : "Compare a distribuicao dos riscos inerentes e residuais lado a lado."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-full border bg-muted/40 p-1">
              <Button
                type="button"
                size="sm"
                variant={matrixViewMode === "current" ? "default" : "ghost"}
                className="rounded-full"
                onClick={() => {
                  setMatrixViewMode("current");
                  setSelectedCell(null);
                }}
              >
                Matriz Atual
              </Button>
              <Button
                type="button"
                size="sm"
                variant={matrixViewMode === "comparison" ? "default" : "ghost"}
                className="rounded-full"
                onClick={() => {
                  setMatrixViewMode("comparison");
                  setSelectedCell(null);
                }}
              >
                Comparação Inerente vs Residual
              </Button>
            </div>
            {matrixViewMode === "current" && selectedCell ? (
              <Button variant="ghost" onClick={() => setSelectedCell(null)}>
                Limpar selecao
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {matrixViewMode === "current" ? (
            matrixQuery.isLoading ? (
              <SkeletonBlock className="h-[420px] w-full" />
            ) : (
              <RiskMatrix
                data={matrixQuery.data ?? []}
                selectedCell={selectedCell}
                companyId={activeCompanyId}
                onCellClick={(probability, impact) =>
                  setSelectedCell((current) =>
                    current?.probability === probability && current?.impact === impact
                      ? null
                      : { probability, impact },
                  )
                }
              />
            )
          ) : matrixComparisonQuery.isLoading ? (
            <SkeletonBlock className="h-[420px] w-full" />
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              <RiskMatrix
                title="Risco Inerente"
                data={matrixComparisonQuery.data?.inherent ?? []}
                companyId={activeCompanyId}
                readOnly
              />
              <RiskMatrix
                title="Risco Residual"
                data={matrixComparisonQuery.data?.residual ?? []}
                companyId={activeCompanyId}
                readOnly
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg">Riscos cadastrados</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Visualize o nível, status e responsável de cada risco identificado.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RiskStatus | "ALL")}>
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {riskStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as RiskLevel | "ALL")}>
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os niveis</SelectItem>
                {Object.values(RiskLevel).map((level) => (
                  <SelectItem key={level} value={level}>
                    {riskLevelLabels[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as RiskCategory | "ALL")}>
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as categorias</SelectItem>
                {riskCategoryOptions.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAdmin ? (
              <Select
                value={companyFilter ? String(companyFilter) : "ALL"}
                onValueChange={(value) => setCompanyFilter(value === "ALL" ? null : Number(value))}
              >
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {selectedCell ? (
            <div className="mb-4 rounded-xl border bg-muted/20 px-4 py-3 text-sm">
              Filtrando por Probabilidade {selectedCell.probability} × Impacto {selectedCell.impact}
            </div>
          ) : null}

          {risksQuery.isLoading ? (
            <SkeletonTable rows={6} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Framework</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsavel</TableHead>
                    <TableHead>Revisão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRisks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-semibold">#{risk.id}</TableCell>
                    <TableCell>
                      <button type="button" className="text-left hover:text-primary" onClick={() => setSelectedRiskId(risk.id)}>
                        <span className="line-clamp-1 font-medium">{risk.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {risk.company?.name ?? `Empresa #${risk.companyId}`}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskCategoryBadgeClass(String(risk.category))}>
                        {riskCategoryLabels[risk.category as keyof typeof riskCategoryLabels] ?? risk.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {risk.frameworkRef ? (
                        <FrameworkBadge frameworkRef={risk.frameworkRef} fallbackToDefault />
                      ) : (
                        <span className="text-sm text-muted-foreground">Nao informado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskLevelBadgeClass(risk.riskLevel)}>
                        {riskLevelLabels[risk.riskLevel]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{risk.riskScore}</TableCell>
                    <TableCell>
                      <Badge className={getRiskStatusBadgeClass(risk.status)}>
                        {riskStatusLabels[risk.status as keyof typeof riskStatusLabels] ?? risk.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{risk.responsible?.name ?? "Nao atribuido"}</TableCell>
                    <TableCell>{formatReviewDate(risk.reviewDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedRiskId(risk.id)}>
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingRisk(risk);
                            setIsFormOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(risk)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tableRisks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                      Nenhum risco encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RiskForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingRisk(null);
        }}
        onSubmit={handleCreateOrUpdate}
        isSubmitting={createRisk.isPending || updateRisk.isPending}
        risk={editingRisk}
        companies={companies.map((company) => ({ id: company.id, name: company.name }))}
        responsibles={responsibles.map((responsible) => ({ id: responsible.id, name: responsible.name ?? responsible.email }))}
        assessments={assessments.map((assessment) => ({
          id: assessment.id,
          companyId: assessment.companyId,
          companyName: assessment.company?.name,
        }))}
        fixedCompanyId={!editingRisk && !isAdmin ? companyFilter ?? undefined : undefined}
      />

      <RiskDetail
        open={!!selectedRiskId}
        onOpenChange={(open) => !open && setSelectedRiskId(null)}
        risk={selectedRisk}
        onEdit={() => {
          if (!selectedRisk) return;
          setEditingRisk(selectedRisk);
          setSelectedRiskId(null);
          setIsFormOpen(true);
        }}
      />

      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar do Assessment</DialogTitle>
            <DialogDescription>
              Selecione um assessment para identificar automaticamente os riscos associados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select
              value={selectedAssessmentId ? String(selectedAssessmentId) : undefined}
              onValueChange={(value) => setSelectedAssessmentId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o assessment" />
              </SelectTrigger>
              <SelectContent>
                {assessments.map((assessment) => (
                  <SelectItem key={assessment.id} value={String(assessment.id)}>
                    {assessment.company?.name
                      ? `#${assessment.id} - ${assessment.company.name}`
                      : `Assessment #${assessment.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAssessment ? (
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                <p className="font-medium">Assessment selecionado</p>
                <p className="mt-1 text-muted-foreground">
                  Empresa: {selectedAssessment.company?.name ?? `Empresa #${selectedAssessment.companyId}`}
                </p>
                <p className="text-muted-foreground">Status: {selectedAssessment.status}</p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleGenerate()} disabled={generateFromAssessment.isPending}>
              {generateFromAssessment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Gerar riscos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir risco?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao remove permanentemente o risco
              {deleteTarget ? ` "${deleteTarget.title}"` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
