import { useMemo, useState } from "react";
import { format, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentExport } from "@/hooks/useDocumentExport";
import { downloadActionPlansPdf } from "@/services/documents.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { utils, writeFile } from "xlsx";
import ActionPlan5W2HCard from "@/components/action-plans/ActionPlan5W2HCard";
import ActionPlanForm from "@/components/action-plans/ActionPlanForm";
import {
  actionPlanCategoryLabels,
  actionPlanPriorityLabels,
  actionPlanStatusLabels,
  getPriorityBadgeClass,
  getStatusBadgeClass,
} from "@/components/action-plans/action-plan-utils";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useActionPlans, useActionPlanStats, useCreateActionPlan, useDeleteActionPlan, useExportActionPlans, useGenerateFromAssessment, useUpdateActionPlan } from "@/hooks/useActionPlans";
import { useAssessments } from "@/hooks/useAssessments";
import { useCompanies } from "@/hooks/useCompanies";
import { useUsers } from "@/hooks/useUser";
import type { Assessment, CompanyWithRelations, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ActionPlanPriority,
  ActionPlanStatus,
  type ActionPlan,
  type ActionPlanFilters,
  type CreateActionPlanInput,
  type UpdateActionPlanInput,
} from "@/types/action-plan";

const statusOptions = ["ALL", ...Object.values(ActionPlanStatus)] as const;
const priorityOptions = ["ALL", ...Object.values(ActionPlanPriority)] as const;

function isEvaluatorRole(role?: string | null) {
  const normalized = String(role ?? "").toUpperCase();
  return (
    normalized === "ADMIN" ||
    normalized === "CLIENTE" ||
    normalized === "COLLABORATOR" ||
    normalized === "AVALIADOR"
  );
}

function formatDueDate(value?: string) {
  if (!value) return "Sem prazo";
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy", { locale: ptBR }) : value;
}

function getDueDateState(value?: string) {
  if (!value) return null;
  const dueDate = startOfDay(parseISO(value));
  if (!isValid(dueDate)) return null;

  const today = startOfDay(new Date());
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  if (isBefore(dueDate, today)) return "overdue" as const;
  if (dueDate <= nextWeek) return "soon" as const;
  return null;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ActionPlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]>("ALL");
  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "5w2h">("table");
  const [deleteTarget, setDeleteTarget] = useState<ActionPlan | null>(null);

  const companiesQuery = useCompanies();
  const usersQuery = useUsers();
  const assessmentsQuery = useAssessments();

  const firstCompanyId = companiesQuery.data?.[0]?.id;
  const filters = useMemo<ActionPlanFilters>(
    () => ({
      companyId: user?.role === "CLIENTE" ? firstCompanyId : undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      priority: priorityFilter === "ALL" ? undefined : priorityFilter,
    }),
    [firstCompanyId, priorityFilter, statusFilter, user?.role],
  );

  const plansQuery = useActionPlans(filters);
  const statsQuery = useActionPlanStats(user?.role === "CLIENTE" ? firstCompanyId : undefined);
  const createActionPlan = useCreateActionPlan();
  const updateActionPlan = useUpdateActionPlan();
  const deleteActionPlan = useDeleteActionPlan();
  const exportActionPlans = useExportActionPlans();
  const generateFromAssessment = useGenerateFromAssessment();
  const { loading: pdfExportLoading, exportDoc } = useDocumentExport();

  if (!isEvaluatorRole(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const plans = plansQuery.data ?? [];
  const assessments = (assessmentsQuery.data ?? []) as Assessment[];
  const companies = ((companiesQuery.data ?? []) as CompanyWithRelations[]).map((company) => ({
    id: company.id,
    name: company.name,
  }));
  const responsibles = ((usersQuery.data ?? []) as User[])
    .filter((candidate) => {
      const role = String(candidate.role ?? "").toUpperCase();
      return role === "ADMIN" || role === "COLLABORATOR" || role === "AVALIADOR";
    })
    .map((responsible) => ({
      id: responsible.id,
      name: responsible.name ?? responsible.email,
      email: responsible.email,
    }));

  const statCards = [
    {
      title: "Total",
      value: statsQuery.data?.total ?? 0,
      icon: ListChecks,
      tone: "text-slate-600",
    },
    {
      title: "Pendentes",
      value: statsQuery.data?.porStatus.PENDENTE ?? 0,
      icon: Clock,
      tone: "text-yellow-500",
    },
    {
      title: "Em Andamento",
      value: statsQuery.data?.porStatus.EM_ANDAMENTO ?? 0,
      icon: PlayCircle,
      tone: "text-blue-500",
    },
    {
      title: "Concluídos",
      value: statsQuery.data?.porStatus.CONCLUIDO ?? 0,
      icon: CheckCircle2,
      tone: "text-green-500",
    },
  ];

  const handleSubmit = async (payload: CreateActionPlanInput | UpdateActionPlanInput) => {
    try {
      if (editingPlan) {
        await updateActionPlan.mutateAsync({ id: editingPlan.id, payload });
        toast.success("Plano atualizado com sucesso.");
      } else {
        await createActionPlan.mutateAsync(payload as CreateActionPlanInput);
        toast.success("Plano criado com sucesso.");
      }
      setEditingPlan(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar plano.");
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteActionPlan.mutateAsync(deleteTarget.id);
      toast.success("Plano removido com sucesso.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir plano.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedAssessmentId) {
      toast.error("Selecione um assessment.");
      return;
    }

    try {
      const response = await generateFromAssessment.mutateAsync(Number(selectedAssessmentId));
      toast.success(`${response.count} planos criados automaticamente!`);
      setGenerateDialogOpen(false);
      setSelectedAssessmentId("");
      navigate("/action-plans");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar planos.");
    }
  };

  const handleExport5W2H = async () => {
    try {
      const exportedPlans = await exportActionPlans.mutateAsync(filters);

      const rows = exportedPlans.map((plan) => ({
        "O QUÊ": plan.whatObjective ?? "",
        "POR QUÊ": plan.whyJustification ?? "",
        "QUEM": plan.responsible?.name ?? "Não atribuído",
        "ONDE": plan.whereLocation ?? "",
        "QUANDO": plan.dueDate ? format(parseISO(plan.dueDate), "dd/MM/yyyy", { locale: ptBR }) : "",
        "COMO": plan.howMethod ?? "",
        "QUANTO CUSTA": plan.howMuchCost !== undefined ? `${plan.howMuchCost} ${plan.howMuchCurrency ?? ""}`.trim() : "",
        "STATUS": actionPlanStatusLabels[plan.status],
        "PRIORIDADE": actionPlanPriorityLabels[plan.priority],
        "EMPRESA": plan.company?.name ?? "",
      }));

      const workbook = utils.book_new();
      const worksheet = utils.json_to_sheet(rows);
      utils.book_append_sheet(workbook, worksheet, "5W2H");
      writeFile(workbook, `Plano_Acao_5W2H_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

      toast.success(`Exportado com sucesso! ${exportedPlans.length} planos no arquivo.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar 5W2H.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos de Ação</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os planos corretivos gerados pelos assessments e acompanhe os prazos de execução.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar do Assessment
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={exportActionPlans.isPending || pdfExportLoading}>
                {exportActionPlans.isPending || pdfExportLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport5W2H()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel (5W2H)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (!firstCompanyId) {
                    toast.warning("Nenhuma empresa disponível para exportar o PDF.");
                    return;
                  }
                  void exportDoc(() => downloadActionPlansPdf(firstCompanyId), "PDF de planos de ação");
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            onClick={() => {
              setEditingPlan(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Button>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title} className="rounded-2xl">
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold">{card.value}</p>
                </div>
                <card.icon className={cn("h-8 w-8", card.tone)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">Filtros</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as (typeof statusOptions)[number])}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {Object.values(ActionPlanStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {actionPlanStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as (typeof priorityOptions)[number])}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {Object.values(ActionPlanPriority).map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {actionPlanPriorityLabels[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">Planos cadastrados</CardTitle>
          <div className="inline-flex rounded-full border bg-muted/40 p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setViewMode("table")}
            >
              Visão Tabela
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "5w2h" ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setViewMode("5w2h")}
            >
              Visão 5W2H
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {plansQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : viewMode === "5w2h" ? (
            plans.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {plans.map((plan) => (
                  <ActionPlan5W2HCard
                    key={plan.id}
                    plan={plan}
                    onEdit={(editablePlan) => {
                      setEditingPlan(editablePlan);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleteTarget(plan)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Nenhum plano encontrado para os filtros atuais.
              </div>
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length ? (
                  plans.map((plan) => {
                    const dueDateState = getDueDateState(plan.dueDate);
                    return (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">#{plan.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{plan.title}</p>
                            <p className="text-xs text-muted-foreground">{plan.frameworkRef || "Sem framework vinculado"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{actionPlanCategoryLabels[plan.category as keyof typeof actionPlanCategoryLabels] ?? plan.category}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", getPriorityBadgeClass(plan.priority))}>
                            {actionPlanPriorityLabels[plan.priority]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", getStatusBadgeClass(plan.status))}>
                            {actionPlanStatusLabels[plan.status]}
                          </span>
                        </TableCell>
                        <TableCell>{plan.responsible?.name ?? "Não atribuído"}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-sm",
                              dueDateState === "overdue" && "text-red-600",
                              dueDateState === "soon" && "text-yellow-600",
                            )}
                          >
                            {dueDateState === "overdue" ? <AlertTriangle className="h-4 w-4" /> : null}
                            {formatDueDate(plan.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPlan(plan);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(plan)}>
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
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Nenhum plano encontrado para os filtros atuais.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ActionPlanForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPlan(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={createActionPlan.isPending || updateActionPlan.isPending}
        plan={editingPlan}
        companies={companies}
        responsibles={responsibles}
        assessments={assessments.map((assessment) => ({
          id: assessment.id,
          companyId: assessment.companyId,
          companyName: assessment.company?.name,
        }))}
      />

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar do Assessment</DialogTitle>
            <DialogDescription>Selecione um assessment para criar os planos de ação automaticamente.</DialogDescription>
          </DialogHeader>

          <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o assessment" />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((assessment) => (
                <SelectItem key={assessment.id} value={String(assessment.id)}>
                  {assessment.company?.name ? `#${assessment.id} - ${assessment.company.name}` : `Assessment #${assessment.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleGenerate()} disabled={generateFromAssessment.isPending}>
              <Target className="mr-2 h-4 w-4" />
              Gerar Planos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano de ação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove permanentemente o plano
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
