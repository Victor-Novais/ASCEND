import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDTIStatus, type PDTI } from "@/types/pdti";

const statusStyles: Record<PDTIStatus, string> = {
  [PDTIStatus.RASCUNHO]: "border border-slate-300 bg-slate-100 text-slate-700",
  [PDTIStatus.EM_REVISAO]: "border border-amber-300 bg-amber-100 text-amber-800",
  [PDTIStatus.APROVADO]: "border border-blue-300 bg-blue-100 text-blue-800",
  [PDTIStatus.VIGENTE]: "border border-emerald-300 bg-emerald-100 text-emerald-800",
  [PDTIStatus.ENCERRADO]: "border border-red-300 bg-red-100 text-red-800",
};

type Props = { pdti: PDTI };

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-6 flex items-baseline gap-4">
      <span className="shrink-0 font-serif text-5xl font-bold leading-none text-gray-200 select-none">
        {number}
      </span>
      <div className="flex-1">
        <h2 className="font-serif text-xl font-semibold text-gray-800">{title}</h2>
        <hr className="mt-1 border-gray-300" />
      </div>
    </div>
  );
}

function EmptyField({ label }: { label: string }) {
  return (
    <p className="text-sm italic text-gray-400">{label} não preenchido.</p>
  );
}

export default function PDTIDocumentView({ pdti }: Props) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg p-12 print:shadow-none print:max-w-full print:p-8">

      {/* ── Cabeçalho ── */}
      <header className="mb-10 border-b border-gray-200 pb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {pdti.company?.name ?? `Empresa #${pdti.companyId}`}
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold text-gray-900">{pdti.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {pdti.year}
          {pdti.period ? ` · ${pdti.period}` : ""}
          {pdti.responsible ? ` · Responsável: ${pdti.responsible}` : ""}
        </p>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[pdti.status]}`}
        >
          {pdti.status.replace(/_/g, " ")}
        </span>
      </header>

      {/* ── Seção 1 — Identidade Estratégica ── */}
      <section className="mb-12">
        <SectionHeader number="01" title="Identidade Estratégica" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { label: "Missão", value: pdti.mission },
            { label: "Visão", value: pdti.vision },
            { label: "Valores", value: pdti.values },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-gray-200 p-5">
              <h3 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </h3>
              {value ? (
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{value}</p>
              ) : (
                <EmptyField label={label} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Seção 2 — Diagnóstico SWOT ── */}
      <section className="mb-12">
        <SectionHeader number="02" title="Diagnóstico SWOT" />
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Forças (Strengths)
            </h3>
            {pdti.swotStrengths ? (
              <p className="text-sm leading-relaxed text-emerald-900 whitespace-pre-wrap">{pdti.swotStrengths}</p>
            ) : (
              <EmptyField label="Forças" />
            )}
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h3 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-red-700">
              Fraquezas (Weaknesses)
            </h3>
            {pdti.swotWeaknesses ? (
              <p className="text-sm leading-relaxed text-red-900 whitespace-pre-wrap">{pdti.swotWeaknesses}</p>
            ) : (
              <EmptyField label="Fraquezas" />
            )}
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-blue-700">
              Oportunidades (Opportunities)
            </h3>
            {pdti.swotOpportunities ? (
              <p className="text-sm leading-relaxed text-blue-900 whitespace-pre-wrap">{pdti.swotOpportunities}</p>
            ) : (
              <EmptyField label="Oportunidades" />
            )}
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
            <h3 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-orange-700">
              Ameaças (Threats)
            </h3>
            {pdti.swotThreats ? (
              <p className="text-sm leading-relaxed text-orange-900 whitespace-pre-wrap">{pdti.swotThreats}</p>
            ) : (
              <EmptyField label="Ameaças" />
            )}
          </div>
        </div>
      </section>

      {/* ── Seção 3 — Cenário Atual e Desejado ── */}
      <section className="mb-12">
        <SectionHeader number="03" title="Cenário Atual e Desejado" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-gray-500">
              AS-IS · Cenário Atual
            </h3>
            {pdti.currentScenario ? (
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{pdti.currentScenario}</p>
            ) : (
              <EmptyField label="Cenário Atual" />
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-gray-500">
              TO-BE · Cenário Desejado
            </h3>
            {pdti.desiredScenario ? (
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{pdti.desiredScenario}</p>
            ) : (
              <EmptyField label="Cenário Desejado" />
            )}
          </div>
        </div>
      </section>

      {/* ── Seção 4 — Objetivos Estratégicos ── */}
      <section className="mb-12">
        <SectionHeader number="04" title="Objetivos Estratégicos" />
        {(pdti.objectives ?? []).length === 0 ? (
          <p className="text-sm italic text-gray-400">Nenhum objetivo cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="py-2 pr-4 text-left font-semibold text-gray-600">Objetivo</th>
                  <th className="py-2 pr-4 text-left font-semibold text-gray-600">Prioridade</th>
                  <th className="py-2 text-left font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {(pdti.objectives ?? []).map((obj) => (
                  <>
                    <tr key={obj.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-800">{obj.title}</td>
                      <td className="py-2 pr-4 text-gray-600">{obj.priority}</td>
                      <td className="py-2 text-gray-600">{obj.status}</td>
                    </tr>
                    {(obj.actions ?? []).length > 0 && (
                      <tr key={`${obj.id}-actions`} className="border-b border-gray-100 bg-gray-50">
                        <td colSpan={3} className="py-2 pl-6">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400">
                                <th className="pb-1 pr-3 text-left">Ação</th>
                                <th className="pb-1 pr-3 text-left">Status</th>
                                <th className="pb-1 pr-3 text-left">Início</th>
                                <th className="pb-1 text-left">Prazo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(obj.actions ?? []).map((action) => (
                                <tr key={action.id} className="border-t border-gray-100">
                                  <td className="py-1 pr-3 text-gray-700">{action.title}</td>
                                  <td className="py-1 pr-3 text-gray-500">{action.status}</td>
                                  <td className="py-1 pr-3 text-gray-500">
                                    {action.startDate
                                      ? new Date(action.startDate).toLocaleDateString("pt-BR")
                                      : "—"}
                                  </td>
                                  <td className="py-1 text-gray-500">
                                    {action.dueDate
                                      ? new Date(action.dueDate).toLocaleDateString("pt-BR")
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Seção 5 — Indicadores KPI ── */}
      <section className="mb-12">
        <SectionHeader number="05" title="Indicadores KPI" />
        {(pdti.indicators ?? []).length === 0 ? (
          <p className="text-sm italic text-gray-400">Nenhum indicador cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="py-2 pr-4 text-left font-semibold text-gray-600">Indicador</th>
                  <th className="py-2 pr-4 text-left font-semibold text-gray-600">Unidade</th>
                  <th className="py-2 pr-4 text-left font-semibold text-gray-600">Baseline</th>
                  <th className="py-2 pr-4 text-left font-semibold text-gray-600">Meta</th>
                  <th className="py-2 pr-4 text-left font-semibold text-gray-600">Valor Atual</th>
                  <th className="py-2 text-left font-semibold text-gray-600">Frequência</th>
                </tr>
              </thead>
              <tbody>
                {(pdti.indicators ?? []).map((kpi) => (
                  <tr key={kpi.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-800">{kpi.name}</td>
                    <td className="py-2 pr-4 text-gray-600">{kpi.unit}</td>
                    <td className="py-2 pr-4 text-gray-600">{kpi.baseline}</td>
                    <td className="py-2 pr-4 text-gray-600">{kpi.target}</td>
                    <td className="py-2 pr-4 text-gray-600">{kpi.currentValue}</td>
                    <td className="py-2 text-gray-600">{kpi.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Seção 6 — Requisitos Legais ── */}
      {(pdti.legalRequirements || pdti.strategicGoals) && (
        <section className="mb-12">
          <SectionHeader number="06" title="Requisitos Legais e Alinhamento Estratégico" />
          {pdti.legalRequirements && (
            <div className="mb-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Requisitos Legais e Normativos
              </h3>
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                {pdti.legalRequirements}
              </p>
            </div>
          )}
          {pdti.strategicGoals && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Alinhamento Estratégico
              </h3>
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                {pdti.strategicGoals}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Rodapé ── */}
      <footer className="mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        Gerado em {today} | ASCEND — Plataforma de Governança de TI
      </footer>
    </div>
  );
}
