import { format } from "date-fns";
import { getAuthToken } from "@/lib/api";
import { downloadFileFromApi } from "@/utils/downloadFile";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function getToken(): string {
  return getAuthToken() ?? "";
}

export async function downloadPdtiPdf(id: number): Promise<void> {
  const filename = `PDTI_${id}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  await downloadFileFromApi(`${API_BASE_URL}/documents/pdti/${id}/pdf`, filename, getToken());
}

export async function downloadPdtiDocx(id: number): Promise<void> {
  const filename = `PDTI_${id}_${format(new Date(), "yyyy-MM-dd")}.docx`;
  await downloadFileFromApi(`${API_BASE_URL}/documents/pdti/${id}/docx`, filename, getToken());
}

export async function downloadRisksPdf(companyId: number): Promise<void> {
  const filename = `Riscos_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  await downloadFileFromApi(
    `${API_BASE_URL}/documents/risks/pdf?companyId=${companyId}`,
    filename,
    getToken(),
  );
}

export async function downloadRisksExcel(companyId: number): Promise<void> {
  const filename = `plano-tratamento-riscos-${companyId}.xlsx`;
  await downloadFileFromApi(
    `${API_BASE_URL}/documents/risks/excel?companyId=${companyId}`,
    filename,
    getToken(),
  );
}

export async function downloadActionPlansPdf(companyId: number): Promise<void> {
  const filename = `Planos_Acao_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  await downloadFileFromApi(
    `${API_BASE_URL}/documents/action-plans/pdf?companyId=${companyId}`,
    filename,
    getToken(),
  );
}
