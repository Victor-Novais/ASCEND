import { useMemo } from "react";
import { isAfter, isBefore, addDays, parseISO, isValid } from "date-fns";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanies } from "@/hooks/useCompanies";
import { usePDTIs } from "@/hooks/usePDTI";
import { useRisks, useRiskStats } from "@/hooks/useRisks";
import { useActionPlans, useActionPlanStats } from "@/hooks/useActionPlans";
import { useAssessments } from "@/hooks/useAssessments";
import { RiskLevel, RiskStatus, type Risk } from "@/types/risk";
import { ActionPlanStatus, ActionPlanPriority, type ActionPlan } from "@/types/action-plan";
import { PDTIStatus } from "@/types/pdti";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

const riskLevelLabel: Record<string, string> = {
  [RiskLevel.CRITICO]: "Crítico",
  [RiskLevel.ALTO]: "Alto",
  [RiskLevel.MEDIO]: "Médio",
  [RiskLevel.BAIXO]: "Baixo",
};

const riskLevelColor: Record<string, string> = {
  [RiskLevel.CRITICO]: "#ef4444",
  [RiskLevel.ALTO]: "#f97316",
  [RiskLevel.MEDIO]: "#eab308",
  [RiskLevel.BAIXO]: "#22c55e",
};

const maturityBadge: Record<string, string> = {
  ARTESANAL: "border-red-200 bg-red-100 text-red-800",
  EFICIENTE: "border-amber-200 bg-amber-100 text-amber-800",
  EFICAZ: "border-blue-200 bg-blue-100 text-blue-800",
  ESTRATEGICO: "border-emerald-200 bg-emerald-100 text-emerald-800",
};

const statusBadge: Record<string, string> = {
  PENDENTE: "border-slate-200 bg-slate-100 text-slate-700",
  EM_ANDAMENTO: "border-blue-200 bg-blue-100 text-blue-800",
  CONCLUIDO: "border-emerald-200 bg-emerald-100 text-emerald-800",
  CANCELADO: "border-red-200 bg-red-100 text-red-800",
};

const pdtiBadge: Record<PDTIStatus, string> = {
  [PDTIStatus.RASCUNHO]: "border-slate-200 bg-slate-100 text-slate-700",
  [PDTIStatus.EM_REVISAO]: "border-amber-200 bg-amber-100 text-amber-800",
  [PDTIStatus.APROVADO]: "border-blue-200 bg-blue-100 text-blue-800",
  [PDTIStatus.VIGENTE]: "border-emerald-200 bg-emerald-100 text-emerald-800",
  [PDTIStatus.ENCERRADO]: "border-red-200 bg-red-100 text-red-800",
};

function isWithin7Days(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  if (!isValid(d)) return false;
  const now = new Date();
  return isAfter(d, now) && isBefore(d, addDays(now, 7));
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = parseISO(dateStr);
  return isValid(d) ? d.toLocaleDateString("pt-BR") : "—";
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GovernancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const companiesQuery = useCompanies();
  const firstCompanyId = companiesQuery.data?.[0]?.id;

  const pdtiQuery = usePDTIs(firstCompanyId ? { companyId: firstCompanyId } : undefined);
  const risksQuery = useRisks(firstCompanyId ? { companyId: firstCompanyId } : undefined);
  const riskStatsQuery = useRiskStats(firstCompanyId);
  const plansQuery = useActionPlans(firstCompanyId ? { companyId: firstCompanyId } : undefined);
  const planStatsQuery = useActionPlanStats(firstCompanyId);
  const assessmentsQuery = useAssessments();

  const isLoading =
    companiesQuery.isLoading ||
    pdtiQuery.isLoading ||
    risksQuery.isLoading ||
    plansQuery.isLoading;

  // ── derived data ────────────────────────────────────────────────────────────

  const pdtis = pdtiQuery.data ?? [];
  const risks = risksQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const assessments = assessmentsQuery.data ?? [];

  const activePdti = useMemo(
    () => pdtis.find((p) => p.status === PDTIStatus.VIGENTE) ?? pdtis[0] ?? null,
    [pdtis],
  );

  const criticalCount = riskStatsQuery.data?.critical ?? 0;

  const expiringSoonPlans = useMemo(
    () =>
      plans.filter(
        (p) =>
          isWithin7Days(p.dueDate) &&
          p.status !== ActionPlanStatus.CONCLUIDO &&
          p.status !== ActionPlanStatus.CANCELADO,
      ),
    [plans],
  );

  const latestAssessment = useMemo(
    () =>
      [...assessments]
        .filter((a) => a.maturityLevel)
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0] ?? null,
    [assessments],
  );

  // top 5 critical/high risks
  const topRisks: Risk[] = useMemo(
    () =>
      risks
        .filter((r) => r.riskLevel === RiskLevel.CRITICO || r.riskLevel === RiskLevel.ALTO)
        .sort((a, b) => {
          const order = [RiskLevel.CRITICO, RiskLevel.ALTO];
          return order.indexOf(a.riskLevel as RiskLevel) - order.indexOf(b.riskLevel as RiskLevel);
        })
        .slice(0, 5),
    [risks],
  );

  // top 5 high-priority open plans
  const topPlans: ActionPlan[] = useMemo(
    () =>
      plans
        .filter(
          (p) =>
            p.priority === ActionPlanPriority.ALTA &&
            p.status !== ActionPlanStatus.CONCLUIDO &&
            p.status !== ActionPlanStatus.CANCELADO,
        )
        .slice(0, 5),
    [plans],
  );

  // pie chart data
  const riskPieData = useMemo(() => {
    const counts: Record<string, number> = {
      [RiskLevel.CRITICO]: 0,
      [RiskLevel.ALTO]: 0,
      [RiskLevel.MEDIO]: 0,
      [RiskLevel.BAIXO]: 0,
    };
    risks.forEach((r) => {
      if (r.riskLevel in counts) counts[r.riskLevel]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: riskLevelLabel[key] ?? key,
        value,
        color: riskLevelColor[key] ?? "#94a3b8",
      }));
  }, [risks]);

  // bar chart data
  const planBarData = useMemo(() => {
    const s = planStatsQuery.data?.porStatus;
    return [
      { name: "Pendente", count: s?.[ActionPlanStatus.PENDENTE] ?? 0, fill: "#94a3b8" },
      { name: "Em Andamento", count: s?.[ActionPlanStatus.EM_ANDAMENTO] ?? 0, fill: "#3b82f6" },
      { name: "Concluído", count: s?.[ActionPlanStatus.CONCLUIDO] ?? 0, fill: "#22c55e" },
    ];
  }, [planStatsQuery.data]);

  // objectives progress
  const objectivesTotal = activePdti?.objectives?.length ?? 0;
  const objectivesDone =
    activePdti?.objectives?.filter(
      (o) => o.status === PDTIStatus.VIGENTE || o.status === PDTIStatus.ENCERRADO,
    ).length ?? 0;
  const objectivesProgress = objectivesTotal > 0 ? Math.round((objectivesDone / objectivesTotal) * 100) : 0;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Governança TI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão executiva consolidada — PDTI, Riscos e Planos de Ação
          {companiesQuery.data?.[0]?.name ? ` · ${companiesQuery.data[0].name}` : ""}
        </p>
      </div>

      {/* ── Row 1: Status cards ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* PDTI ativo */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">PDTI Ativo</p>
                  {activePdti ? (
                    <>
                      <p className="mt-2 truncate font-semibold">{activePdti.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{activePdti.year}</p>
                      <Badge className={cn("mt-2 text-[10px]", pdtiBadge[activePdti.status])}>
                        {activePdti.status.replace(/_/g, " ")}
                      </Badge>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Nenhum PDTI</p>
                  )}
                </div>
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Riscos críticos */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Riscos Críticos</p>
                  <p className="mt-2 text-3xl font-bold text-red-600">{criticalCount}</p>
                  <Badge className="mt-2 text-[10px] border-red-200 bg-red-100 text-red-800">
                    {criticalCount === 0 ? "Nenhum" : criticalCount === 1 ? "1 risco" : `${criticalCount} riscos`}
                  </Badge>
                </div>
                <div className="rounded-xl bg-red-100 p-2 text-red-700 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações vencendo */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações Vencendo (7d)</p>
                  <p className="mt-2 text-3xl font-bold text-orange-600">{expiringSoonPlans.length}</p>
                  <Badge className="mt-2 text-[10px] border-orange-200 bg-orange-100 text-orange-800">
                    {expiringSoonPlans.length === 0 ? "Em dia" : "Atenção necessária"}
                  </Badge>
                </div>
                <div className="rounded-xl bg-orange-100 p-2 text-orange-700 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score maturidade */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Maturidade</p>
                  {latestAssessment ? (
                    <>
                      <p className="mt-2 text-3xl font-bold">
                        {latestAssessment.totalScore != null
                          ? Number(latestAssessment.totalScore).toFixed(0)
                          : "—"}
                      </p>
                      <Badge
                        className={cn(
                          "mt-2 text-[10px]",
                          maturityBadge[latestAssessment.maturityLevel ?? ""] ?? "border-slate-200 bg-slate-100 text-slate-700",
                        )}
                      >
                        {latestAssessment.maturityLevel ?? "Sem nível"}
                      </Badge>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Sem assessment</p>
                  )}
                </div>
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Row 2: Charts ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie — distribuição de riscos */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Distribuição de Riscos por Nível
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risksQuery.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : riskPieData.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                Nenhum risco cadastrado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={riskPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {riskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, "Riscos"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar — planos por status */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Planos de Ação por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {planStatsQuery.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={planBarData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" name="Planos" radius={[6, 6, 0, 0]}>
                    {planBarData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Tabela de riscos críticos/altos ─────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Riscos Críticos e Altos
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/risks">
              Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {risksQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : topRisks.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">Nenhum risco crítico ou alto encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tratamento</TableHead>
                  <TableHead>Revisão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRisks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{risk.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{risk.category}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          risk.riskLevel === RiskLevel.CRITICO
                            ? "border-red-200 bg-red-100 text-red-800"
                            : "border-orange-200 bg-orange-100 text-orange-800",
                        )}
                      >
                        {risk.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {risk.responsible?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{risk.treatment ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(risk.reviewDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Row 4: PDTI Status ──────────────────────────────────────────────── */}
      {activePdti && (
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-blue-500" />
              PDTI — {activePdti.title}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/pdti/${activePdti.id}`}>
                Ver PDTI completo <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mission + Vision */}
            <div className="grid gap-4 md:grid-cols-2">
              {activePdti.mission && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Missão</p>
                  <p className="mt-1 text-sm text-foreground line-clamp-3">{activePdti.mission}</p>
                </div>
              )}
              {activePdti.vision && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visão</p>
                  <p className="mt-1 text-sm text-foreground line-clamp-3">{activePdti.vision}</p>
                </div>
              )}
            </div>

            {/* Objectives progress */}
            {objectivesTotal > 0 && (
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">Progresso de Objetivos</span>
                  <span className="text-muted-foreground">
                    {objectivesDone}/{objectivesTotal} ({objectivesProgress}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${objectivesProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* First 3 objectives */}
            {(activePdti.objectives ?? []).length > 0 && (
              <div className="space-y-2">
                {activePdti.objectives!.slice(0, 3).map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{obj.title}</p>
                      <p className="text-xs text-muted-foreground">{obj.category} · {obj.priority}</p>
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", pdtiBadge[obj.status as PDTIStatus] ?? "border-slate-200 bg-slate-100 text-slate-700")}>
                      {obj.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Row 5: Ações prioritárias ───────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-orange-500" />
            Ações Prioritárias (Alta prioridade em aberto)
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/action-plans">
              Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {plansQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : topPlans.length === 0 ? (
            <div className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Nenhuma ação de alta prioridade em aberto.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{plan.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{plan.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {plan.responsible?.name ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-sm",
                        isWithin7Days(plan.dueDate) ? "font-semibold text-orange-600" : "text-muted-foreground",
                      )}
                    >
                      {formatDate(plan.dueDate)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px]", statusBadge[plan.status] ?? "")}>
                        {plan.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
