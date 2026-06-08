import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ActionPlanCategory,
  ActionPlanPriority,
  ActionPlanStatus,
  type ActionPlan,
  type ActionPlanCategory as ActionPlanCategoryType,
  type CreateActionPlanInput,
  type UpdateActionPlanInput,
} from "@/types/action-plan";
import {
  actionPlanCategoryLabels,
  actionPlanPriorityLabels,
  getPriorityBadgeClass,
} from "@/components/action-plans/action-plan-utils";

const categoryValues = Object.values(ActionPlanCategory);
const priorityValues = Object.values(ActionPlanPriority);
const statusValues = Object.values(ActionPlanStatus);

const monetaryCurrencyValues = ["BRL", "USD", "EUR"] as const;

const numberFieldSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : Number(value)),
  z.number().min(0, "Valor deve ser maior ou igual a zero").optional(),
);

const actionPlanSchema = z.object({
  title: z.string().min(5, "Informe pelo menos 5 caracteres").max(200, "Máximo de 200 caracteres"),
  description: z.string().min(10, "Informe pelo menos 10 caracteres"),
  category: z.enum(["GOVERNANCA", "SEGURANCA", "PROCESSOS", "INFRAESTRUTURA", "CULTURA"]),
  frameworkRef: z.string().max(100, "Máximo de 100 caracteres").optional().or(z.literal("")),
  priority: z.enum(["ALTA", "MEDIA", "BAIXA"]),
  status: z.enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"]),
  responsibleId: z.string().uuid("Responsável inválido").optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  observations: z.string().optional().or(z.literal("")),
  whatObjective: z.string().max(1000, "Máximo de 1000 caracteres").optional().or(z.literal("")),
  whyJustification: z.string().max(1000, "Máximo de 1000 caracteres").optional().or(z.literal("")),
  whereLocation: z.string().max(255, "Máximo de 255 caracteres").optional().or(z.literal("")),
  howMethod: z.string().max(1000, "Máximo de 1000 caracteres").optional().or(z.literal("")),
  howMuchCost: numberFieldSchema,
  howMuchCurrency: z.enum(monetaryCurrencyValues).optional(),
  companyId: z.coerce.number().int().positive("Selecione uma empresa"),
  assessmentId: z.coerce.number().int().positive().optional(),
});

type ActionPlanFormValues = z.infer<typeof actionPlanSchema>;

type CompanyOption = {
  id: number;
  name: string;
};

type ResponsibleOption = {
  id: string;
  name: string;
  email: string;
};

type AssessmentOption = {
  id: number;
  companyId: number;
  companyName?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateActionPlanInput | UpdateActionPlanInput) => Promise<void>;
  isSubmitting: boolean;
  plan?: ActionPlan | null;
  companies: CompanyOption[];
  responsibles: ResponsibleOption[];
  assessments: AssessmentOption[];
  fixedCompanyId?: number;
};

function getDefaultValues(plan?: ActionPlan | null, fixedCompanyId?: number): ActionPlanFormValues {
  return {
    title: plan?.title ?? "",
    description: plan?.description ?? "",
    category: (plan?.category as ActionPlanCategoryType) ?? ActionPlanCategory.GOVERNANCA,
    frameworkRef: plan?.frameworkRef ?? "",
    priority: plan?.priority ?? ActionPlanPriority.MEDIA,
    status: plan?.status ?? ActionPlanStatus.PENDENTE,
    responsibleId: plan?.responsibleId ?? "",
    dueDate: plan?.dueDate ?? "",
    observations: plan?.observations ?? "",
    whatObjective: plan?.whatObjective ?? "",
    whyJustification: plan?.whyJustification ?? "",
    whereLocation: plan?.whereLocation ?? "",
    howMethod: plan?.howMethod ?? "",
    howMuchCost: plan?.howMuchCost ?? undefined,
    howMuchCurrency: (plan?.howMuchCurrency as "BRL" | "USD" | "EUR" | undefined) ?? "BRL",
    companyId: plan?.companyId ?? fixedCompanyId ?? 0,
    assessmentId: plan?.assessmentId ?? undefined,
  };
}

export default function ActionPlanForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  plan,
  companies,
  responsibles,
  assessments,
  fixedCompanyId,
}: Props) {
  const form = useForm<ActionPlanFormValues>({
    resolver: zodResolver(actionPlanSchema),
    defaultValues: getDefaultValues(plan, fixedCompanyId),
  });

  const companyId = form.watch("companyId");

  useEffect(() => {
    form.reset(getDefaultValues(plan, fixedCompanyId));
  }, [fixedCompanyId, form, open, plan]);

  const filteredAssessments = companyId
    ? assessments.filter((assessment) => assessment.companyId === companyId)
    : assessments;

  const handleSubmit = async (values: ActionPlanFormValues) => {
    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      frameworkRef: values.frameworkRef?.trim() || undefined,
      priority: values.priority,
      status: values.status,
      responsibleId: values.responsibleId || undefined,
      dueDate: values.dueDate || undefined,
      observations: values.observations?.trim() || undefined,
      whatObjective: values.whatObjective?.trim() || undefined,
      whyJustification: values.whyJustification?.trim() || undefined,
      whereLocation: values.whereLocation?.trim() || undefined,
      howMethod: values.howMethod?.trim() || undefined,
      howMuchCost: Number.isFinite(values.howMuchCost ?? NaN) ? values.howMuchCost : undefined,
      howMuchCurrency: Number.isFinite(values.howMuchCost ?? NaN)
        ? values.howMuchCurrency || "BRL"
        : undefined,
      companyId: values.companyId,
      assessmentId: values.assessmentId || undefined,
    } satisfies CreateActionPlanInput;

    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{plan ? "Editar plano" : "Novo plano"}</SheetTitle>
          <SheetDescription>Preencha os dados do plano de ação. A metodologia 5W2H é opcional.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form className="mt-6 space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Revisar política de backup" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-28" placeholder="Descreva a ação a ser executada..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
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
                            {categoryValues.map((category) => (
                              <SelectItem key={category} value={category}>
                                {actionPlanCategoryLabels[category]}
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
                          <Input placeholder="Ex: APO12.01" {...field} value={field.value ?? ""} />
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
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value ? String(field.value) : undefined}
                          disabled={Boolean(fixedCompanyId)}
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
                          onValueChange={(value) => field.onChange(value === "all" ? undefined : Number(value))}
                          value={field.value ? String(field.value) : "all"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o assessment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Sem vínculo</SelectItem>
                            {filteredAssessments.map((assessment) => (
                              <SelectItem key={assessment.id} value={String(assessment.id)}>
                                {assessment.companyName ? `#${assessment.id} - ${assessment.companyName}` : `Assessment #${assessment.id}`}
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
                        <FormLabel>Responsável</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "all" ? "" : value)} value={field.value || "all"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {responsibles.length === 0 ? (
                              <SelectItem value="none" disabled>
                                Nenhum responsável disponível
                              </SelectItem>
                            ) : (
                              <>
                                <SelectItem value="all">Não atribuído</SelectItem>
                                {responsibles.map((responsible) => (
                                  <SelectItem key={responsible.id} value={responsible.id}>
                                    {responsible.name}
                                  </SelectItem>
                                ))}
                              </>
                            )}
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
                            {statusValues.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
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
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Prioridade</FormLabel>
                      <FormControl>
                        <RadioGroup className="grid gap-3 sm:grid-cols-3" onValueChange={field.onChange} value={field.value}>
                          {priorityValues.map((priority) => (
                            <label
                              key={priority}
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                                field.value === priority ? getPriorityBadgeClass(priority) : "border-border hover:bg-muted/40",
                              )}
                            >
                              <RadioGroupItem value={priority} />
                              <span className="font-medium">{actionPlanPriorityLabels[priority]}</span>
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
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-24" placeholder="Anotações adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-2">
                  <p className="text-sm font-medium text-muted-foreground">Metodologia 5W2H (opcional)</p>
                  <div className="relative flex items-center">
                    <Separator className="flex-1" />
                    <span className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">5W2H</span>
                    <Separator className="flex-1" />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="whatObjective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>O Quê</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-24" placeholder="Defina o objetivo da ação" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whyJustification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Por Quê</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-24" placeholder="Explique a motivação da ação" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whereLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onde</FormLabel>
                      <FormControl>
                        <Input placeholder="Local ou área de aplicação" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="howMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Como</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-24" placeholder="Descreva o método ou estratégia" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="howMuchCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quanto Custa</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="howMuchCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moeda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? "BRL"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="BRL" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {monetaryCurrencyValues.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {plan ? "Salvar alterações" : "Criar plano"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
