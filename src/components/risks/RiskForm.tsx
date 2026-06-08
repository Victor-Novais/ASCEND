import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  RiskCategory,
  RiskStatus,
  RiskTreatment,
  type CreateRiskInput,
  type Risk,
  type UpdateRiskInput,
} from "@/types/risk";
import {
  getRiskLevelBadgeClass,
  getRiskLevelFromScore,
  riskCategoryOptions,
  riskLevelLabels,
  riskStatusLabels,
  riskStatusOptions,
  riskTreatmentOptions,
} from "@/components/risks/risk-utils";

const optionalString = z.string().trim().optional().transform((value) => (value === "" ? undefined : value));

const riskSchema = z.object({
  title: z.string().min(5, "Informe um titulo com pelo menos 5 caracteres"),
  description: z.string().min(10, "Descreva o risco com pelo menos 10 caracteres"),
  category: z.nativeEnum(RiskCategory),
  frameworkRef: z.string().optional(),
  probability: z.coerce.number().min(1).max(5),
  impact: z.coerce.number().min(1).max(5),
  treatment: z.nativeEnum(RiskTreatment),
  status: z.nativeEnum(RiskStatus),
  responsibleId: z.string().optional(),
  reviewDate: z.string().optional(),
  companyId: z.number().int().positive("Selecione uma empresa"),
  assessmentId: z.number().int().positive().optional().nullable(),
  assetCategory: optionalString,
  assetName: optionalString,
  threat: optionalString,
  vulnerability: optionalString,
  inherentProbability: z.number().int().min(1).max(5).optional(),
  inherentImpact: z.number().int().min(1).max(5).optional(),
  existingControls: optionalString,
  proposedControls: optionalString,
  residualProbability: z.number().int().min(1).max(5).optional(),
  residualImpact: z.number().int().min(1).max(5).optional(),
});

type RiskFormValues = z.infer<typeof riskSchema>;

type Option = { id: number; name: string };
type ResponsibleOption = { id: string; name: string };
type AssessmentOption = { id: number; companyId: number; companyName?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateRiskInput | UpdateRiskInput) => Promise<void>;
  isSubmitting: boolean;
  risk?: Risk | null;
  companies: Option[];
  responsibles: ResponsibleOption[];
  assessments: AssessmentOption[];
  fixedCompanyId?: number;
};

const scoreLabels = [
  { value: 1, label: "Muito Baixo", tone: "border-green-200 bg-green-50 text-green-700" },
  { value: 2, label: "Baixo", tone: "border-lime-200 bg-lime-50 text-lime-700" },
  { value: 3, label: "Medio", tone: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  { value: 4, label: "Alto", tone: "border-orange-200 bg-orange-50 text-orange-700" },
  { value: 5, label: "Muito Alto", tone: "border-red-200 bg-red-50 text-red-700" },
];

function getDefaultValues(risk: Risk | null | undefined, fixedCompanyId?: number): RiskFormValues {
  return {
    title: risk?.title ?? "",
    description: risk?.description ?? "",
    category: (risk?.category as RiskCategory) ?? RiskCategory.GOVERNANCA,
    frameworkRef: risk?.frameworkRef ?? "",
    probability: risk?.probability ?? 3,
    impact: risk?.impact ?? 3,
    treatment: (risk?.treatment as RiskTreatment) ?? RiskTreatment.MITIGAR,
    status: (risk?.status as RiskStatus) ?? RiskStatus.IDENTIFICADO,
    responsibleId: risk?.responsibleId ?? "",
    reviewDate: risk?.reviewDate ?? "",
    companyId: risk?.companyId ?? fixedCompanyId ?? 0,
    assessmentId: risk?.assessmentId ?? null,
    assetCategory: risk?.assetCategory ?? undefined,
    assetName: risk?.assetName ?? undefined,
    threat: risk?.threat ?? undefined,
    vulnerability: risk?.vulnerability ?? undefined,
    inherentProbability: risk?.inherentProbability ?? undefined,
    inherentImpact: risk?.inherentImpact ?? undefined,
    existingControls: risk?.existingControls ?? undefined,
    proposedControls: risk?.proposedControls ?? undefined,
    residualProbability: risk?.residualProbability ?? undefined,
    residualImpact: risk?.residualImpact ?? undefined,
  };
}

function ScoreSelectField({
  value,
  onChange,
  placeholder,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder: string;
}) {
  return (
    <Select
      value={value ? String(value) : "none"}
      onValueChange={(next) => onChange(next === "none" ? undefined : Number(next))}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem value="none">Sem seleção</SelectItem>
        {scoreLabels.map((item) => (
          <SelectItem key={item.value} value={String(item.value)}>
            {item.value} - {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function RiskForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  risk,
  companies,
  responsibles,
  assessments,
  fixedCompanyId,
}: Props) {
  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: getDefaultValues(risk, fixedCompanyId),
  });

  const companyId = form.watch("companyId");
  const probability = useWatch({ control: form.control, name: "probability" }) ?? 1;
  const impact = useWatch({ control: form.control, name: "impact" }) ?? 1;
  const probMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  const impMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  const score = (probMap[Number(probability)] || 0) * (impMap[Number(impact)] || 0);
  const riskLevel = getRiskLevelFromScore(score);

  useEffect(() => {
    form.reset(getDefaultValues(risk, fixedCompanyId));
  }, [fixedCompanyId, form, open, risk]);

  const filteredAssessments = companyId
    ? assessments.filter((assessment) => assessment.companyId === companyId)
    : assessments;

  const handleSubmit = async (values: RiskFormValues) => {
    const payload = {
      companyId: values.companyId,
      assessmentId: values.assessmentId ?? null,
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      frameworkRef: values.frameworkRef?.trim() || null,
      probability: values.probability,
      impact: values.impact,
      riskScore: values.probability * values.impact,
      riskLevel: getRiskLevelFromScore(values.probability * values.impact),
      treatment: values.treatment,
      status: values.status,
      responsibleId: values.responsibleId || null,
      reviewDate: values.reviewDate || null,
      assetCategory: values.assetCategory?.trim() || undefined,
      assetName: values.assetName?.trim() || undefined,
      threat: values.threat?.trim() || undefined,
      vulnerability: values.vulnerability?.trim() || undefined,
      inherentProbability: values.inherentProbability,
      inherentImpact: values.inherentImpact,
      existingControls: values.existingControls?.trim() || undefined,
      proposedControls: values.proposedControls?.trim() || undefined,
      residualProbability: values.residualProbability,
      residualImpact: values.residualImpact,
    } satisfies CreateRiskInput;

    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{risk ? "Editar risco" : "Novo risco"}</DialogTitle>
          <DialogDescription>
            Avalie probabilidade e impacto para classificar o risco automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Titulo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Exposicao de credenciais administrativas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descricao</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-28" placeholder="Descreva o evento de risco e o impacto esperado." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {riskCategoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frameworkRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Framework</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: COBIT DSS05.04" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={!!fixedCompanyId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={String(company.id)}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assessmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vincule a um assessment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem vinculo</SelectItem>
                        {filteredAssessments.map((assessment) => (
                          <SelectItem key={assessment.id} value={String(assessment.id)}>
                            {assessment.companyName
                              ? `#${assessment.id} - ${assessment.companyName}`
                              : `Assessment #${assessment.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1fr_280px]">
              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probabilidade</FormLabel>
                    <FormControl>
                      <RadioGroup
                        className="grid gap-3"
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        {scoreLabels.map((item) => (
                          <label
                            key={`prob-${item.value}`}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                              Number(field.value) === item.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                            )}
                          >
                            <RadioGroupItem value={String(item.value)} />
                            <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold", item.tone)}>
                              {item.value}
                            </span>
                            <span className="text-sm font-medium">{`${item.value} - ${item.label}`}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impacto</FormLabel>
                    <FormControl>
                      <RadioGroup
                        className="grid gap-3"
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        {scoreLabels.map((item) => (
                          <label
                            key={`impact-${item.value}`}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                              Number(field.value) === item.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                            )}
                          >
                            <RadioGroupItem value={String(item.value)} />
                            <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold", item.tone)}>
                              {item.value}
                            </span>
                            <span className="text-sm font-medium">{`${item.value} - ${item.label}`}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-2xl border bg-muted/10 p-5">
                <p className="text-sm font-medium text-muted-foreground">Preview em tempo real</p>
                <p className="mt-4 text-5xl font-bold">{score}</p>
                <p className="mt-1 text-sm text-muted-foreground">Score de risco</p>
                <p className="mt-4 text-sm font-medium">{`Score: ${score} -> `}<span className="inline-block align-middle"><Badge className={cn(getRiskLevelBadgeClass(riskLevel))}>{riskLevelLabels[riskLevel]}</Badge></span></p>
                <Badge className={cn("mt-4", getRiskLevelBadgeClass(riskLevel))}>
                  {riskLevelLabels[riskLevel]}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="treatment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tratamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tratamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {riskTreatmentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {riskStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {riskStatusLabels[option.value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsibleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsavel</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsavel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nao atribuido</SelectItem>
                        {responsibles.map((responsible) => (
                          <SelectItem key={responsible.id} value={responsible.id}>
                            {responsible.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reviewDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Prazo de revisao</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-5">
              <p className="text-sm font-medium text-muted-foreground">Modelo TIC — Análise Detalhada (opcional)</p>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="assetCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria do Ativo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Hardware, Software, Dados" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Ativo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Servidor de arquivos" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="threat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ameaça</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-24" placeholder="Descreva a ameaça relevante" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vulnerability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vulnerabilidade</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-24" placeholder="Descreva a vulnerabilidade" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="existingControls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Controles Existentes</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-24" placeholder="Liste controles existentes" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="proposedControls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Controles Propostos</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-24" placeholder="Descreva os controles propostos" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="relative flex items-center">
                <Separator className="flex-1" />
                <span className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Risco Inerente</span>
                <Separator className="flex-1" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="inherentProbability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidade Inerente</FormLabel>
                      <ScoreSelectField
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione a probabilidade"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inherentImpact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impacto Inerente</FormLabel>
                      <ScoreSelectField
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione o impacto"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="relative flex items-center">
                <Separator className="flex-1" />
                <span className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Risco Residual</span>
                <Separator className="flex-1" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="residualProbability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidade Residual</FormLabel>
                      <ScoreSelectField
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione a probabilidade"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="residualImpact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impacto Residual</FormLabel>
                      <ScoreSelectField
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione o impacto"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {risk ? "Salvar alteracoes" : "Criar risco"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
