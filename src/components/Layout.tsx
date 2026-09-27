import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Receipt,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSessionClaims, getToken, logout } from "../lib/auth";

const SIDEBAR_COLLAPSED_KEY = "flowpay-sidebar-collapsed";

type NavItem = {
  to: string;
  end?: boolean;
  label: string;
  icon: LucideIcon;
};

function companyNavItems(role: string): NavItem[] {
  const isAdmin = role === "admin";
  const items: NavItem[] = [
    { to: "/", end: true, label: "Inicio", icon: LayoutDashboard },
    { to: "/cobros", label: "Cobros", icon: Receipt },
  ];
  items.push({ to: "/clients", end: true, label: "Clientes", icon: Users });
  if (isAdmin) {
    items.push({ to: "/equipo", label: "Equipo", icon: UserCog });
  }
  return items;
}

function mobileTabs(isPlatformAdmin: boolean): NavItem[] {
  if (isPlatformAdmin) {
    return [
      { to: "/platform", end: true, label: "Inicio", icon: LayoutDashboard },
      { to: "/platform/companies", label: "Empresas", icon: Building2 },
      { to: "/platform/admins", label: "Admins", icon: UserCog },
    ];
  }
  return [
    { to: "/", end: true, label: "Inicio", icon: LayoutDashboard },
    { to: "/cobros", label: "Cobros", icon: Receipt },
    { to: "/clients", end: true, label: "Clientes", icon: Users },
  ];
}

function moreLinks(role: string, isPlatformAdmin: boolean): NavItem[] {
  if (isPlatformAdmin) return [];
  if (role !== "admin") return [];
  return [{ to: "/equipo", label: "Equipo", icon: UserCog }];
}

const platformNav: NavItem[] = [
  { to: "/platform", end: true, label: "Inicio", icon: LayoutDashboard },
  { to: "/platform/companies", label: "Empresas", icon: Building2 },
  { to: "/platform/admins", label: "Admins", icon: UserCog },
];

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function tabActive(pathname: string, item: NavItem) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function Layout() {
  const nav = useNavigate();
  const location = useLocation();
  const hasToken = !!getToken();
  const role = getSessionClaims()?.role ?? "";
  const isPlatformAdmin = role === "platform_admin";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsed);
  const [moreOpen, setMoreOpen] = useState(false);
  const items = isPlatformAdmin ? platformNav : companyNavItems(role);
  const tabs = mobileTabs(isPlatformAdmin);
  const overflow = moreLinks(role, isPlatformAdmin);
  const isCompanyAdmin = role === "admin" && !isPlatformAdmin;
  const settingsActive = isCompanyAdmin && tabActive(location.pathname, { to: "/mensajes", label: "Configuración", icon: Settings });
  const profileActive = tabActive(location.pathname, { to: "/perfil", end: true, label: "Perfil", icon: CircleUserRound });
  const moreActive = overflow.some((item) => tabActive(location.pathname, item)) || settingsActive || profileActive;

  useEffect(() => {
    writeCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const linkClass = ({ isActive }: { isActive: boolean }, collapsed: boolean) =>
    [
      "group relative flex items-center gap-3 rounded-lg text-sm font-semibold transition-colors",
      collapsed ? "min-h-11 justify-center px-2" : "min-h-11 px-3",
      isActive ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface hover:text-ink",
    ].join(" ");

  const signOut = () => {
    logout();
    nav("/login", { replace: true });
  };

  const accountSection = (collapsed: boolean) => {
    if (!hasToken) {
      return (
        <div className="mt-auto rounded-xl border border-dashed border-surface-border p-3 text-center text-xs text-ink-muted">
          <NavLink to="/login" className="font-semibold text-brand hover:underline">
            Iniciar sesión
          </NavLink>
        </div>
      );
    }
    if (collapsed) {
      return (
        <div className="mt-auto space-y-2">
          <NavLink
            to="/perfil"
            end
            title="Perfil"
            aria-label="Perfil"
            className={({ isActive }) =>
              [
                "flex min-h-11 w-full items-center justify-center rounded-lg",
                isActive ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface hover:text-ink",
              ].join(" ")
            }
          >
            <CircleUserRound className="h-5 w-5" strokeWidth={2} />
          </NavLink>
          {isCompanyAdmin && (
            <NavLink
              to="/mensajes"
              title="Configuración"
              aria-label="Configuración"
              className={({ isActive }) =>
                [
                  "flex min-h-11 w-full items-center justify-center rounded-lg",
                  isActive ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface hover:text-ink",
                ].join(" ")
              }
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
            </NavLink>
          )}
          <button
            type="button"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex min-h-11 w-full items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      );
    }
    return (
      <div className="mt-auto space-y-1 border-t border-surface-border pt-4">
        <NavLink
          to="/perfil"
          end
          className={({ isActive }) =>
            [
              "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold",
              isActive ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface hover:text-ink",
            ].join(" ")
          }
        >
          <CircleUserRound className="h-5 w-5" strokeWidth={2} />
          Perfil
        </NavLink>
        {isCompanyAdmin && (
          <NavLink
            to="/mensajes"
            className={({ isActive }) =>
              [
                "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold",
                isActive ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface hover:text-ink",
              ].join(" ")
            }
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
            Configuración
          </NavLink>
        )}
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-ink-muted hover:bg-surface hover:text-ink"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-surface">
      <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-end justify-between border-b border-surface-border bg-surface-card px-4 pb-2 lg:hidden">
        <p className="font-display text-xl font-medium tracking-tight text-ink">FlowPay</p>
      </header>

      <aside
        className={[
          "hidden shrink-0 flex-col border-r border-surface-border bg-surface-card lg:sticky lg:top-0 lg:flex lg:h-dvh",
          sidebarCollapsed ? "w-[4.5rem] px-2 py-5" : "w-60 px-3 py-6",
        ].join(" ")}
      >
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand font-display text-lg text-white"
              title="FlowPay"
            >
              F
            </div>
            <button
              type="button"
              title="Expandir menú"
              aria-label="Expandir menú"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
              onClick={() => setSidebarCollapsed(false)}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2">
            <p className="font-display text-2xl font-medium tracking-tight text-ink">FlowPay</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Ocultar menú"
                aria-label="Ocultar menú lateral"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
                onClick={() => setSidebarCollapsed(true)}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        <nav className={`mt-8 flex flex-1 flex-col gap-1 ${sidebarCollapsed ? "" : ""}`}>
          {items.map((item) => (
            <NavLink
              key={item.to + (item.end ? "-e" : "")}
              to={item.to}
              end={item.end}
              title={sidebarCollapsed ? item.label : undefined}
              className={(p) => linkClass(p, sidebarCollapsed)}
            >
              <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
          {accountSection(sidebarCollapsed)}
        </nav>
      </aside>

      <main className="h-dvh min-h-0 w-full min-w-0 flex-1 overflow-y-auto bg-surface px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <Outlet />
      </main>

      {moreOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMoreOpen(false)}
        />
      )}

      <div
        className={[
          "fixed inset-x-0 z-50 border-t border-surface-border bg-surface-card px-2 lg:hidden",
          "bottom-0 pb-[env(safe-area-inset-bottom)]",
        ].join(" ")}
      >
        {moreOpen && (
          <div className="absolute inset-x-2 bottom-[calc(100%+0.5rem)] rounded-2xl border border-surface-border bg-surface-card p-2 shadow-soft">
            {overflow.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                    isActive ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface",
                  ].join(" ")
                }
              >
                <item.icon className="h-5 w-5" strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/perfil"
              end
              className={({ isActive }) =>
                [
                  "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                  isActive ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface",
                ].join(" ")
              }
            >
              <CircleUserRound className="h-5 w-5" strokeWidth={2} />
              Perfil
            </NavLink>
            {isCompanyAdmin && (
              <NavLink
                to="/mensajes"
                className={({ isActive }) =>
                  [
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                    isActive ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface",
                  ].join(" ")
                }
              >
                <Settings className="h-5 w-5" strokeWidth={2} />
                Configuración
              </NavLink>
            )}
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-surface"
              onClick={signOut}
            >
              <LogOut className="h-5 w-5" strokeWidth={2} />
              Cerrar sesión
            </button>
          </div>
        )}
        <nav className="grid h-16 grid-cols-4" aria-label="Navegación principal">
          {tabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                  isActive ? "text-brand" : "text-ink-muted",
                ].join(" ")
              }
            >
              <item.icon className="h-5 w-5" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            className={[
              "flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
              moreOpen || moreActive ? "text-brand" : "text-ink-muted",
            ].join(" ")}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
            Más
          </button>
        </nav>
      </div>
    </div>
  );
}
