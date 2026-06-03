import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import DashboardRouter from "@/pages/DashboardRouter";
import CompaniesPage from "@/pages/Companies";
import CompanyForm from "@/pages/CompanyForm";
import CompanyDetail from "@/pages/CompanyDetail";
import AssessmentsPage from "@/pages/Assessments";
import QuestionsPage from "@/pages/Questions";
import AssessmentStepper from "@/pages/AssessmentStepper";
import ReportsPage from "@/pages/Reports";
import ReportPage from "@/pages/Report";
import NotFound from "@/pages/NotFound";
import ActionPlansPage from "@/pages/ActionPlans";
import PDTIPage from "@/pages/PDTI";
import PDTIDetailPage from "@/pages/PDTIDetail";
import AuditLogsPage from "@/pages/AuditLogs";
import RisksPage from "@/pages/Risks";
import AnalyticsPage from "@/pages/Analytics";
import AssessmentCreatePage from "@/pages/assessment/create";
import AssessmentQuestionPage from "@/pages/assessment/[id]";
import AssessmentReportPage from "@/pages/assessment/report";
import AssessmentReportByIdPage from "@/pages/assessment/[id]/report";
import AssessmentDetailsPage from "@/pages/assessment/[id]/details";
import GovernancePage from "@/pages/Governance";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-right" richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/dashboard/questions" element={<QuestionsPage />} />
                <Route path="/dashboard/companies" element={<CompaniesPage />} />
                <Route path="/dashboard/companies/new" element={<CompanyForm />} />
                <Route path="/dashboard/companies/:id" element={<CompanyDetail />} />
                <Route path="/dashboard/companies/:id/edit" element={<CompanyForm />} />
                <Route path="/dashboard/assessments" element={<AssessmentsPage />} />
                <Route path="/dashboard/assessments/:id" element={<AssessmentStepper />} />
                <Route path="/dashboard/reports" element={<ReportsPage />} />
                <Route path="/dashboard/reports/:id" element={<ReportPage />} />
                <Route path="/governance" element={<GovernancePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/action-plans" element={<ActionPlansPage />} />
                <Route path="/pdti" element={<PDTIPage />} />
                <Route path="/pdti/:id" element={<PDTIDetailPage />} />
                <Route path="/risks" element={<RisksPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/assessment/create" element={<AssessmentCreatePage />} />
                <Route path="/assessment/:id" element={<AssessmentQuestionPage />} />
                <Route path="/assessment/report" element={<AssessmentReportPage />} />
                <Route path="/assessment/:id/report" element={<AssessmentReportByIdPage />} />
                <Route path="/assessment/:id/details" element={<AssessmentDetailsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
