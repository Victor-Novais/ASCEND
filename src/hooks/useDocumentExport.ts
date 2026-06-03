import { useState } from "react";
import { toast } from "sonner";

export function useDocumentExport() {
  const [loading, setLoading] = useState(false);

  async function exportDoc(fn: () => Promise<void>, name: string) {
    setLoading(true);
    toast.loading(`Gerando ${name}...`, { id: "doc-export" });
    try {
      await fn();
      toast.success("Download iniciado", { id: "doc-export" });
    } catch {
      toast.error("Erro ao gerar documento", { id: "doc-export" });
    } finally {
      setLoading(false);
    }
  }

  return { loading, exportDoc };
}
