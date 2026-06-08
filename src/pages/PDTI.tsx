import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Download, FileSpreadsheet, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { useAssessments } from "@/hooks/useAssessments";
import { useCompanies } from "@/hooks/useCompanies";
import { useCreatePDTI, useDeletePDTI, useGeneratePDTI, usePDTIs } from "@/hooks/usePDTI";
import type { Assessment } from "@/lib/types";
import { pdtiService } from "@/services/pdti.service";
import { PDTIStatus, type CreatePDTIInput, type PDTI } from "@/types/pdti";

const statusStyles: Record<PDTIStatus, string> = {
  [PDTIStatus.RASCUNHO]: "border-slate-200 bg-slate-100 text-slate-700",
  [PDTIStatus.EM_REVISAO]: "border-amber-200 bg-amber-100 text-amber-800",
  [PDTIStatus.APROVADO]: "border-blue-200 bg-blue-100 text-blue-800",
  [PDTIStatus.VIGENTE]: "border-emerald-200 bg-emerald-100 text-emerald-800",
  [PDTIStatus.ENCERRADO]: "border-red-200 bg-red-100 text-red-800",
};

const defaultCreateState = {
  title: "",
  companyId: "",
  year: String(new Date().getFullYear()),
  period: "Anual",
  assessmentId: "",
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function PDTIPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [createState, setCreateState] = useState(defaultCreateState);
  const [deleteTarget, setDeleteTarget] = useState<PDTI | null>(null);

  const companiesQuery = useCompanies();
  const assessmentsQuery = useAssessments();
  const pdtiQuery = usePDTIs();
  const createPDTI = useCreatePDTI();
  const generatePDTI = useGeneratePDTI();
  const deletePDTI = useDeletePDTI();

  const companies = companiesQuery.data ?? [];
  const assessments = (assessmentsQuery.data ?? []) as Assessment[];

  const pdtis = pdtiQuery.data ?? [];
  const eligibleAssessments = assessments.filter((assessment) =>
    ["SUBMITTED", "COMPLETED"].includes(String(assessment.status).toUpperCase()),
  );

  const total = pdtis.length;
  const vigentes = pdtis.filter((plan) => plan.status === PDTIStatus.VIGENTE).length;
  const emRevisao = pdtis.filter((plan) => plan.status === PDTIStatus.EM_REVISAO).length;
  const concluídos = pdtis.filter((plan) => plan.status === PDTIStatus.ENCERRADO).length;

  const handleCreate = async () => {
    if (!createState.title.trim()) {
      toast.error("Informe um título para o PDTI.");
      return;
    }
    if (!createState.companyId) {
      toast.error("Selecione uma empresa.");
      return;
    }

    const payload: CreatePDTIInput = {
      title: createState.title.trim(),
      companyId: Number(createState.companyId),
      year: Number(createState.year || new Date().getFullYear()),
      period: createState.period.trim() || "Anual",
      assessmentId: createState.assessmentId ? Number(createState.assessmentId) : null,
      status: PDTIStatus.RASCUNHO,
    };

    try {
      const created = await createPDTI.mutateAsync(payload);
      toast.success("PDTI criado com sucesso.");
      setCreateOpen(false);
      setCreateState(defaultCreateState);
      navigate(`/pdti/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar PDTI.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedAssessmentId) {
      toast.error("Selecione um assessment.");
      return;
    }

    try {
      const generated = await generatePDTI.mutateAsync(Number(selectedAssessmentId));
      const navigation = () => navigate(`/pdti/${generated.id}`);
      toast.success(
        <div className="space-y-2">
          <p className="font-medium">PDTI gerado com sucesso.</p>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            onClick={navigation}
          >
            Ver PDTI gerado
          </button>
        </div>,
      );
      setGenerateOpen(false);
      setSelectedAssessmentId("");
      navigation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar PDTI.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePDTI.mutateAsync(deleteTarget.id);
      toast.success("PDTI removido com sucesso.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir PDTI.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">PDTI - Plano Diretor de TI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centralize os planos estratégicos, objetivos, cronogramas e indicadores de TI.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => setGenerateOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar do Assessment
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo PDTI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total", value: total, tone: "text-slate-700" },
          { label: "Vigentes", value: vigentes, tone: "text-emerald-700" },
          { label: "Em Revisão", value: emRevisao, tone: "text-amber-700" },
          { label: "Concluídos", value: concluídos, tone: "text-red-700" },
        ].map((item) => (
          <Card key={item.label} className="rounded-2xl">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-bold">{item.value}</p>
              </div>
              <div className={`rounded-xl bg-muted p-2 ${item.tone}`}>
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">PDTIs cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {pdtiQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : pdtis.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assessment Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pdtis.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">#{plan.id}</TableCell>
                      <TableCell className="font-medium">{plan.title}</TableCell>
                      <TableCell>{plan.company?.name ?? `Empresa #${plan.companyId}`}</TableCell>
                      <TableCell>{plan.year}</TableCell>
                      <TableCell>
                        {plan.period ? (
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">{plan.period}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusStyles[plan.status]}>{plan.status.replaceAll("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>{plan.assessmentId ? `#${plan.assessmentId}` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/pdti/${plan.id}`)}>
                            Ver
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/pdti/${plan.id}`)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const exportData = await pdtiService.exportData(plan.id);
                                downloadJson(`pdti-${plan.id}.json`, exportData);
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Falha ao exportar PDTI.");
                              }
                            }}
                          >
                            <Download className="mr-1 h-4 w-4" />
                            Exportar
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(plan)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum PDTI encontrado.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo PDTI</DialogTitle>
            <DialogDescription>Crie um plano diretor de TI manualmente com os dados básicos.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Título</label>
              <Input
                value={createState.title}
                onChange={(event) => setCreateState((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex: PDTI 2026"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Empresa</label>
                <Select
                  value={createState.companyId}
                  onValueChange={(value) => setCreateState((current) => ({ ...current, companyId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={String(company.id)}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Ano</label>
                <Input
                  type="number"
                  value={createState.year}
                  onChange={(event) => setCreateState((current) => ({ ...current, year: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Período</label>
                <Input
                  value={createState.period}
                  onChange={(event) => setCreateState((current) => ({ ...current, period: event.target.value }))}
                  placeholder="Anual"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Assessment de origem</label>
                <Select
                  value={createState.assessmentId}
                  onValueChange={(value) => setCreateState((current) => ({ ...current, assessmentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem vínculo</SelectItem>
                    {assessments.map((assessment) => (
                      <SelectItem key={assessment.id} value={String(assessment.id)}>
                        {assessment.company?.name ? `#${assessment.id} - ${assessment.company.name}` : `Assessment #${assessment.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={createPDTI.isPending}>
              {createPDTI.isPending ? "Criando..." : "Criar PDTI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar do Assessment</DialogTitle>
            <DialogDescription>Selecione um assessment concluído para gerar o PDTI automaticamente.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {eligibleAssessments.length ? (
              eligibleAssessments.map((assessment) => (
                <button
                  key={assessment.id}
                  type="button"
                  onClick={() => setSelectedAssessmentId(String(assessment.id))}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    String(assessment.id) === selectedAssessmentId
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        #{assessment.id} - {assessment.company?.name ?? `Empresa #${assessment.companyId}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Status: {assessment.status} · Criado em {assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                      {assessment.maturityLevel ?? "Sem nível"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Score de maturidade: {assessment.totalScore ?? "—"}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum assessment elegível para geração.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleGenerate()} disabled={!selectedAssessmentId || generatePDTI.isPending}>
              {generatePDTI.isPending ? "Gerando..." : "Gerar PDTI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir PDTI?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove permanentemente o PDTI
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
