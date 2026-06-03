import { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditStats } from "@/hooks/useAuditLogs";
import { useRisks } from "@/hooks/useRisks";
import { RiskLevel, RiskStatus } from "@/types/risk";
import {
  AlertTriangle,
  BarChart2,
  BarChart3,
  Building2,
  ClipboardCheck,
  ChevronLeft,
  FileBarChart,
  FileText,
  Landmark,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Shield,
  Target,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Governanca TI", icon: Landmark, path: "/governance" },
  { label: "Questoes", icon: LibraryBig, path: "/dashboard/questions" },
  { label: "Empresas", icon: Building2, path: "/dashboard/companies" },
  { label: "Avaliacoes", icon: ClipboardCheck, path: "/dashboard/assessments" },
  { label: "Planos de Acao", icon: Target, path: "/action-plans" },
  { label: "PDTI", icon: FileText, path: "/pdti" },
  { label: "Relatorios", icon: FileBarChart, path: "/dashboard/reports" },
  { label: "Analytics", icon: BarChart2, path: "/analytics" },
  { label: "Riscos", icon: AlertTriangle, path: "/risks" },
  { label: "Auditoria", icon: Shield, path: "/audit-logs" },
];

const clienteNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Governanca TI", icon: Landmark, path: "/governance" },
  { label: "Empresas", icon: Building2, path: "/dashboard/companies" },
  { label: "Avaliacoes", icon: ClipboardCheck, path: "/dashboard/assessments" },
  { label: "Planos de Acao", icon: Target, path: "/action-plans" },
  { label: "Relatorios", icon: FileBarChart, path: "/dashboard/reports" },
  { label: "Analytics", icon: BarChart2, path: "/analytics" },
  { label: "Riscos", icon: AlertTriangle, path: "/risks" },
  { label: "PDTI", icon: FileText, path: "/pdti" },
];

const collaboratorNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Governanca TI", icon: Landmark, path: "/governance" },
  { label: "Avaliacoes", icon: ClipboardCheck, path: "/dashboard/assessments" },
  { label: "Planos de Acao", icon: Target, path: "/action-plans" },
  { label: "Relatorios", icon: FileBarChart, path: "/dashboard/reports" },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const auditStatsQuery = useAuditStats(user?.role === "ADMIN");
  const canAccessRisks = user?.role === "ADMIN" || user?.role === "CLIENTE" || user?.role === "AVALIADOR";
  const criticalRisksQuery = useRisks(
    { riskLevel: RiskLevel.CRITICO },
    canAccessRisks,
  );
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const navItems =
    user?.role === "ADMIN"
      ? adminNavItems
      : user?.role === "COLLABORATOR"
        ? collaboratorNavItems
        : clienteNavItems;
  const auditFailureCount = auditStatsQuery.data?.failedActions ?? 0;
  const untreatedCriticalCount =
    (criticalRisksQuery.data ?? []).filter((risk) => risk.status !== RiskStatus.MITIGADO).length;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-5 h-5 text-sidebar-primary" />
        </div>
        {sidebarOpen && (
          <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
            ASCEND
          </span>
        )}
      </div>

      <nav className="flex-1 px-3 mt-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive(item.path)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {(sidebarOpen || mobileOpen) && <span className="flex-1">{item.label}</span>}
            {item.path === "/risks" && untreatedCriticalCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {untreatedCriticalCount > 99 ? "99+" : untreatedCriticalCount}
              </span>
            ) : null}
            {item.path === "/audit-logs" && auditFailureCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {auditFailureCount > 99 ? "99+" : auditFailureCount}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full ascend-gradient flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          {(sidebarOpen || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {user?.role}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(sidebarOpen || mobileOpen) && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <NavContent />
      </aside>

      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0",
          sidebarOpen ? "w-60" : "w-[68px]"
        )}
      >
        <NavContent />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute bottom-20 -right-3 w-6 h-6 rounded-full bg-card border border-border shadow-soft flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
          style={{ left: sidebarOpen ? "calc(15rem - 12px)" : "calc(68px - 12px)" }}
        >
          <ChevronLeft
            className={cn("w-3.5 h-3.5 transition-transform", !sidebarOpen && "rotate-180")}
          />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full ascend-gradient flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="hidden sm:block text-foreground font-medium">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
