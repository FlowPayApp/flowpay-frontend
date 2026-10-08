import {
  BadgePercent,
  Building2,
  ChevronLeft,
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
import BrandLogo from "./BrandLogo";
import InboxBell from "./InboxBell";
import { InboxProvider } from "./InboxProvider";

const SIDEBAR_COLLAPSED_KEY = "flowpay-sidebar-collapsed";

/** Curva de desaceleración: arranca rápido y se asienta suave. */
const SIDEBAR_MOTION = "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
const SIDEBAR_FADE = "transition-opacity duration-200 motion-reduce:transition-none";

/** Al abrir, el texto aparece cuando ya hay espacio; al cerrar, se va antes de que el ancho lo corte. */
function fadeIn(visible: boolean) {
  return visible ? "opacity-100 delay-100" : "opacity-0";
}

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
  if (isPlatformAdmin) return [{ to: "/platform/plans", label: "Planes", icon: BadgePercent }];
  if (role !== "admin") return [];
  return [{ to: "/equipo", label: "Equipo", icon: UserCog }];
}

const platformNav: NavItem[] = [
  { to: "/platform", end: true, label: "Inicio", icon: LayoutDashboard },
  { to: "/platform/companies", label: "Empresas", icon: Building2 },
  { to: "/platform/admins", label: "Admins", icon: UserCog },
  { to: "/platform/plans", label: "Planes", icon: BadgePercent },
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
  const showInbox = hasToken && !isPlatformAdmin;
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

  const collapsed = sidebarCollapsed;
  const rowClass = (isActive: boolean) =>
    [
      "relative flex min-h-11 w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors",
      isActive ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface hover:text-ink",
    ].join(" ");
  const label = (text: string) => <span className={`${SIDEBAR_FADE} ${fadeIn(!collapsed)}`}>{text}</span>;

  const signOut = () => {
    logout();
    nav("/login", { replace: true });
  };

  const accountSection = () => {
    if (!hasToken) {
      return (
        <div className="mt-auto rounded-xl border border-dashed border-surface-border p-3 text-center text-xs text-ink-muted">
          <NavLink to="/login" className="font-semibold text-brand hover:underline">
            Iniciar sesión
          </NavLink>
        </div>
      );
    }
    return (
      <div className="mt-auto space-y-1 border-t border-surface-border pt-4">
        <NavLink to="/perfil" end title={collapsed ? "Perfil" : undefined} className={({ isActive }) => rowClass(isActive)}>
          <CircleUserRound className="h-5 w-5 shrink-0" strokeWidth={2} />
          {label("Perfil")}
        </NavLink>
        {showInbox && <InboxBell variant="sidebar" collapsed={collapsed} />}
        {isCompanyAdmin && (
          <NavLink
            to="/mensajes"
            title={collapsed ? "Configuración" : undefined}
            className={({ isActive }) => rowClass(isActive)}
          >
            <Settings className="h-5 w-5 shrink-0" strokeWidth={2} />
            {label("Configuración")}
          </NavLink>
        )}
        <button type="button" title={collapsed ? "Cerrar sesión" : undefined} className={rowClass(false)} onClick={signOut}>
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
          {label("Cerrar sesión")}
        </button>
      </div>
    );
  };

  const content = (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-surface">
      <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-end justify-between border-b border-surface-border bg-surface-card px-4 pb-1 lg:hidden">
        <BrandLogo className="mb-1 h-7" />
        {showInbox && <InboxBell />}
      </header>

      <aside
        className={[
          "hidden shrink-0 flex-col border-r border-surface-border bg-surface-card px-3 py-6 lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-dvh",
          `transition-[width] ${SIDEBAR_MOTION}`,
          collapsed ? "w-[4.5rem]" : "w-60",
        ].join(" ")}
      >
        <div className="relative h-10 overflow-hidden" title={collapsed ? "GeldFlus" : undefined}>
          <div
            className={`absolute inset-y-0 left-0 flex w-[13.5rem] items-center justify-center ${SIDEBAR_FADE} ${fadeIn(!collapsed)}`}
            aria-hidden={collapsed}
          >
            <BrandLogo className="h-8" />
          </div>
          <div
            className={`absolute inset-y-0 left-0 grid w-12 place-items-center ${SIDEBAR_FADE} ${fadeIn(collapsed)}`}
            aria-hidden={!collapsed}
          >
            <div className="grid h-9 w-9 place-items-center dark:rounded-lg dark:bg-white">
              <BrandLogo variant="mark" tone="color" className="h-7" />
            </div>
          </div>
        </div>
        <button
          type="button"
          title={collapsed ? "Mostrar menú" : "Ocultar menú"}
          aria-label={collapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
          aria-expanded={!collapsed}
          className="absolute -right-3.5 top-[1.875rem] z-10 grid h-7 w-7 place-items-center rounded-full border border-surface-border bg-surface-card text-ink-muted shadow-sm transition-colors hover:border-brand hover:text-brand"
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform ${SIDEBAR_MOTION} ${collapsed ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to + (item.end ? "-e" : "")}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => rowClass(isActive)}
            >
              <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              {label(item.label)}
            </NavLink>
          ))}
          {accountSection()}
        </nav>
      </aside>

      <main className="relative h-dvh min-h-0 w-full min-w-0 flex-1 overflow-y-auto bg-surface px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
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

  return showInbox ? <InboxProvider>{content}</InboxProvider> : content;
}
