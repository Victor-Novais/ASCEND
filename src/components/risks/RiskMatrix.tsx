import { useRef } from "react";
import html2canvas from "html2canvas";
import { Camera } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RiskMatrixCell } from "@/types/risk";
import { getRiskLevelFromScore, riskLevelLabels } from "@/components/risks/risk-utils";

const impactLabels = ["Muito Baixo", "Baixo", "Medio", "Alto", "Muito Alto"];
const probabilityLabels = ["Muito Baixa", "Baixa", "Media", "Alta", "Muito Alta"];

type Props = {
  data: RiskMatrixCell[];
  onCellClick: (probability: number, impact: number) => void;
  selectedCell?: { probability: number; impact: number } | null;
  companyId?: number | null;
};

function getCellColor(score: number) {
  if (score <= 5) return "bg-green-200 hover:bg-green-300";
  if (score <= 11) return "bg-yellow-200 hover:bg-yellow-300";
  if (score <= 19) return "bg-orange-200 hover:bg-orange-300";
  return "bg-red-200 hover:bg-red-300";
}

export default function RiskMatrix({ data, onCellClick, selectedCell, companyId }: Props) {
  const matrixRef = useRef<HTMLDivElement>(null);
  const cells = new Map(data.map((cell) => [`${cell.probability}-${cell.impact}`, cell]));

  async function exportMatrix() {
    if (!matrixRef.current) return;
    const canvas = await html2canvas(matrixRef.current, { useCORS: true });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `risco-matrix-${companyId ?? "export"}.png`;
    a.click();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void exportMatrix()}
        className="absolute right-0 top-0 z-10 flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm hover:bg-muted"
      >
        <Camera className="h-3.5 w-3.5" />
        Exportar PNG
      </button>
      <div ref={matrixRef}>
      <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-[140px_repeat(5,minmax(96px,1fr))] gap-2">
        <div />
        {impactLabels.map((label, index) => (
          <div key={label} className="rounded-xl border bg-muted/20 px-3 py-2 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Impacto {index + 1}</p>
            <p className="mt-1 text-sm font-medium">{label}</p>
          </div>
        ))}

        {Array.from({ length: 5 }, (_, rowIndex) => 5 - rowIndex).map((probability) => (
          <div key={`row-${probability}`} className="contents">
            <div className="flex items-center rounded-xl border bg-muted/20 px-3 py-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Probabilidade {probability}</p>
                <p className="text-sm font-medium">{probabilityLabels[probability - 1]}</p>
              </div>
            </div>

            {Array.from({ length: 5 }, (_, colIndex) => colIndex + 1).map((impact) => {
              const score = probability * impact;
              const cell = cells.get(`${probability}-${impact}`) ?? {
                probability,
                impact,
                score,
                count: 0,
                riskLevel: getRiskLevelFromScore(score),
              };
              const isSelected =
                selectedCell?.probability === probability && selectedCell?.impact === impact;

              return (
                <Tooltip key={`${probability}-${impact}`}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onCellClick(probability, impact)}
                      className={cn(
                        "relative flex min-h-[96px] items-center justify-center rounded-2xl border transition-colors",
                        getCellColor(score),
                        isSelected && "ring-2 ring-foreground/30 border-foreground",
                      )}
                    >
                      {cell.count > 0 ? (
                        <span className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-slate-900 px-3 text-sm font-semibold text-white">
                          {cell.count}
                        </span>
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {`Prob: ${probability} × Impacto: ${impact} = Score: ${score} (${riskLevelLabels[cell.riskLevel]})`}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      </div>
      </div>
    </div>
  );
}
