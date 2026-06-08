import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { actionPlanStatusLabels } from "@/components/action-plans/action-plan-utils";
import { cn } from "@/lib/utils";
import { ActionPlanStatus, type ActionPlan, type ActionPlanStatus as ActionPlanStatusType } from "@/types/action-plan";

const KANBAN_COLUMNS: ActionPlanStatusType[] = [
  ActionPlanStatus.PENDENTE,
  ActionPlanStatus.EM_ANDAMENTO,
  ActionPlanStatus.CONCLUIDO,
  ActionPlanStatus.CANCELADO,
];

const NEXT_STATUS: Partial<Record<ActionPlanStatusType, ActionPlanStatusType>> = {
  [ActionPlanStatus.PENDENTE]: ActionPlanStatus.EM_ANDAMENTO,
  [ActionPlanStatus.EM_ANDAMENTO]: ActionPlanStatus.CONCLUIDO,
};

const columnToneClasses: Record<ActionPlanStatusType, string> = {
  [ActionPlanStatus.PENDENTE]: "border-slate-200 bg-slate-50/80",
  [ActionPlanStatus.EM_ANDAMENTO]: "border-blue-200 bg-blue-50/50",
  [ActionPlanStatus.CONCLUIDO]: "border-green-200 bg-green-50/50",
  [ActionPlanStatus.CANCELADO]: "border-red-200 bg-red-50/50",
};

const columnHeaderClasses: Record<ActionPlanStatusType, string> = {
  [ActionPlanStatus.PENDENTE]: "text-slate-700",
  [ActionPlanStatus.EM_ANDAMENTO]: "text-blue-700",
  [ActionPlanStatus.CONCLUIDO]: "text-green-700",
  [ActionPlanStatus.CANCELADO]: "text-red-700",
};

const columnBadgeClasses: Record<ActionPlanStatusType, string> = {
  [ActionPlanStatus.PENDENTE]: "border-slate-200 bg-slate-100 text-slate-700",
  [ActionPlanStatus.EM_ANDAMENTO]: "border-blue-200 bg-blue-100 text-blue-700",
  [ActionPlanStatus.CONCLUIDO]: "border-green-200 bg-green-100 text-green-700",
  [ActionPlanStatus.CANCELADO]: "border-red-200 bg-red-100 text-red-700",
};

function formatDueDate(value?: string) {
  if (!value) return "Sem prazo";
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy", { locale: ptBR }) : value;
}

function getDueDateState(value?: string, status?: ActionPlanStatusType) {
  if (!value || status === ActionPlanStatus.CONCLUIDO || status === ActionPlanStatus.CANCELADO) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(parsed);
  dueDate.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  if (dueDate < today) return "overdue" as const;
  if (dueDate <= nextWeek) return "soon" as const;
  return null;
}

interface KanbanCardProps {
  plan: ActionPlan;
  onEdit: (plan: ActionPlan) => void;
  onAdvance: (plan: ActionPlan) => void;
  isAdvancing: boolean;
}

function KanbanCard({ plan, onEdit, onAdvance, isAdvancing }: KanbanCardProps) {
  const dueDateState = getDueDateState(plan.dueDate, plan.status);
  const nextStatus = NEXT_STATUS[plan.status];

  return (
    <Card className="rounded-xl border bg-background shadow-sm">
      <CardContent className="space-y-3 p-3">
        <p className="text-sm font-semibold leading-snug">{plan.title}</p>

        <p className="text-xs text-muted-foreground">{plan.responsible?.name ?? "Não atribuído"}</p>

        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            dueDateState === "overdue" && "font-medium text-red-600",
            dueDateState === "soon" && "font-medium text-yellow-600",
            !dueDateState && "text-muted-foreground",
          )}
        >
          {dueDateState === "overdue" ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
          {formatDueDate(plan.dueDate)}
        </span>

        <div className="flex flex-wrap gap-2 pt-1">
          {nextStatus ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-xs"
              disabled={isAdvancing}
              onClick={() => onAdvance(plan)}
            >
              {isAdvancing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              → Avançar
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 flex-1 text-xs"
            onClick={() => onEdit(plan)}
          >
            ✏ Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface KanbanBoardProps {
  plans: ActionPlan[];
  onEdit: (plan: ActionPlan) => void;
  onAdvance: (plan: ActionPlan) => Promise<void>;
  advancingPlanId: number | null;
}

export default function KanbanBoard({ plans, onEdit, onAdvance, advancingPlanId }: KanbanBoardProps) {
  const plansByStatus = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = plans.filter((plan) => plan.status === status);
      return acc;
    },
    {} as Record<ActionPlanStatusType, ActionPlan[]>,
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((status) => {
        const columnPlans = plansByStatus[status];

        return (
          <div
            key={status}
            className={cn(
              "flex max-h-[calc(100vh-22rem)] min-h-[320px] w-72 min-w-[280px] flex-col rounded-2xl border bg-muted/30",
              columnToneClasses[status],
            )}
          >
            <div className={cn("flex items-center justify-between border-b px-4 py-3", columnHeaderClasses[status])}>
              <span className="text-sm font-semibold">{actionPlanStatusLabels[status]}</span>
              <Badge variant="outline" className={cn("text-xs font-semibold", columnBadgeClasses[status])}>
                {columnPlans.length}
              </Badge>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
              {columnPlans.length ? (
                columnPlans.map((plan) => (
                  <KanbanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={onEdit}
                    onAdvance={(target) => void onAdvance(target)}
                    isAdvancing={advancingPlanId === plan.id}
                  />
                ))
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">Nenhum plano</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
