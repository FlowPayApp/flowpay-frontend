import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Upload,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getMyProfile, updateMyProfile } from "../api";
import { getSessionClaims, getToken, logout } from "../lib/auth";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";
import AppModal from "./AppModal";
import LoadingOverlay from "./LoadingOverlay";
import PasswordInput from "./PasswordInput";

const SIDEBAR_COLLAPSED_KEY = "flowpay-sidebar-collapsed";
const CLIENTS_NAV_EXPANDED_KEY = "flowpay-nav-clients-expanded";

function readClientsSubOpenInitial(): boolean {
  try {
    const p = window.location.pathname;
    if (p.startsWith("/clients/")) return true;
    return localStorage.getItem(CLIENTS_NAV_EXPANDED_KEY) === "1";
  } catch {
    return false;
  }
}

type NavItem = {
  to: string;
  end?: boolean;
  label: string;
  icon: LucideIcon;
  subItems?: { to: string; label: string; icon: LucideIcon }[];
};

const companyNav: NavItem[] = [
  { to: "/", end: true, label: "Inicio", icon: LayoutDashboard },
  { to: "/cobros", label: "Cobros", icon: Receipt },
  {
    to: "/clients",
    end: true,
    label: "Clientes",
    icon: Users,
    subItems: [{ to: "/clients/cargas", label: "Carga de clientes", icon: Upload }],
  },
];

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

export default function Layout() {
  const MOBILE_DRAWER_DURATION_MS = 220;
  const nav = useNavigate();
  const location = useLocation();
  const hasToken = !!getToken();
  const role = getSessionClaims()?.role ?? "";
  const isPlatformAdmin = role === "platform_admin";
  const [routeLoading, setRouteLoading] = useState(false);
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsed);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileForm, setProfileForm] = useState<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  /** Submenú Clientes (solo vista expandida / móvil). */
  const [clientsSubOpen, setClientsSubOpen] = useState(readClientsSubOpenInitial);
  const routeTimer = useRef<number | null>(null);
  const mobileDrawerTimer = useRef<number | null>(null);
  const items = isPlatformAdmin ? platformNav : companyNav;

  const toggleClientsSub = useCallback(() => {
    setClientsSubOpen((o) => {
      const n = !o;
      try {
        localStorage.setItem(CLIENTS_NAV_EXPANDED_KEY, n ? "1" : "0");
      } catch {
        /* ignore */
      }
      return n;
    });
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/clients/")) {
      setClientsSubOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    setRouteLoading(true);
    if (routeTimer.current) window.clearTimeout(routeTimer.current);
    routeTimer.current = window.setTimeout(() => setRouteLoading(false), 260);
    return () => {
      if (routeTimer.current) window.clearTimeout(routeTimer.current);
    };
  }, [location.pathname]);

  useEffect(() => {
    writeCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  const openMobileMenu = useCallback(() => {
    if (mobileDrawerTimer.current) window.clearTimeout(mobileDrawerTimer.current);
    setMobileMenuMounted(true);
    window.requestAnimationFrame(() => setMobileMenuOpen(true));
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) return;
    if (!mobileMenuMounted) return;
    if (mobileDrawerTimer.current) window.clearTimeout(mobileDrawerTimer.current);
    mobileDrawerTimer.current = window.setTimeout(
      () => setMobileMenuMounted(false),
      MOBILE_DRAWER_DURATION_MS,
    );
    return () => {
      if (mobileDrawerTimer.current) window.clearTimeout(mobileDrawerTimer.current);
    };
  }, [mobileMenuOpen, mobileMenuMounted, MOBILE_DRAWER_DURATION_MS]);

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen, closeMobileMenu]);

  const linkClass = ({ isActive }: { isActive: boolean }, collapsed: boolean) =>
    [
      "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
      isActive
        ? "bg-gradient-to-r from-brand-soft to-indigo-50 text-brand shadow-sm ring-1 ring-indigo-100"
        : "text-ink-muted hover:bg-white hover:text-ink hover:shadow-sm",
    ].join(" ");

  /** Subítems del acordeón Clientes: más chicos y más a la derecha. */
  const subNavClass = ({ isActive }: { isActive: boolean }) =>
    [
      linkClass({ isActive }, false),
      "ml-4 mr-0 max-w-[calc(100%-0.75rem)] rounded-lg py-1.5 pl-4 text-[11px] font-medium leading-tight sm:text-xs",
    ].join(" ");

  const openProfile = async () => {
    setProfileError(null);
    setProfileOpen(true);
    setProfileLoading(true);
    try {
      const p = await getMyProfile();
      setProfileForm({ name: p.name, email: p.email, password: "", confirmPassword: "" });
    } catch (e: unknown) {
      setProfileError(e instanceof Error ? e.message : "No se pudo cargar perfil");
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    const password = profileForm.password.trim();
    const confirmPassword = profileForm.confirmPassword.trim();
    if (password || confirmPassword) {
      const policyError = getPasswordPolicyError(password);
      if (policyError) {
        setProfileError(policyError);
        return;
      }
      if (password !== confirmPassword) {
        setProfileError("La confirmación de contraseña no coincide.");
        return;
      }
    }
    setProfileLoading(true);
    try {
      await updateMyProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        password: password || undefined,
      });
      setProfileOpen(false);
    } catch (e: unknown) {
      setProfileError(e instanceof Error ? e.message : "No se pudo actualizar perfil");
    } finally {
      setProfileLoading(false);
    }
  };

  const accountSection = (collapsed: boolean, compact?: boolean) => {
    if (collapsed && !hasToken) {
      return (
        <div className="mt-auto rounded-xl border border-dashed border-surface-border bg-surface p-2 text-center text-[11px] text-ink-muted">
          <NavLink to="/login" className="font-medium text-brand hover:underline" title="Iniciar sesión">
            Entrar
          </NavLink>
        </div>
      );
    }
    return (
      <div
        className={[
          "mt-auto space-y-2 rounded-xl border border-dashed border-surface-border bg-surface p-3 text-xs text-ink-muted",
          collapsed ? "p-2" : "",
        ].join(" ")}
      >
        {hasToken ? (
          <>
            {collapsed ? (
              <button
                type="button"
                title="Perfil"
                aria-label="Perfil"
                className="mb-2 flex w-full items-center justify-center rounded-lg border border-surface-border bg-white p-2.5 text-ink-muted hover:bg-surface hover:text-ink"
                onClick={() => {
                  if (compact) closeMobileMenu();
                  void openProfile();
                }}
              >
                <CircleUserRound className="h-5 w-5" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-surface hover:text-ink"
                onClick={() => {
                  if (compact) closeMobileMenu();
                  void openProfile();
                }}
              >
                <CircleUserRound className="h-4 w-4" strokeWidth={2} />
                Perfil
              </button>
            )}
            {collapsed ? (
              <button
                type="button"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="flex w-full items-center justify-center rounded-lg bg-slate-900 p-2.5 text-white hover:bg-slate-800"
                onClick={() => {
                  logout();
                  nav("/login", { replace: true });
                }}
              >
                <LogOut className="h-5 w-5" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() => {
                  logout();
                  nav("/login", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                Cerrar sesión
              </button>
            )}
          </>
        ) : compact ? (
          <div className="text-center text-[11px] leading-snug">
            <NavLink to="/login" className="font-medium text-brand hover:underline" onClick={closeMobileMenu}>
              Iniciar sesión
            </NavLink>
          </div>
        ) : (
          <>
            <div className="font-medium text-ink">Sin token JWT</div>
            Si el API exige autenticación, entra en{" "}
            <NavLink to="/login" className="text-brand hover:underline">
              Iniciar sesión
            </NavLink>
            .
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-surface">
      {routeLoading && <LoadingOverlay message="Cargando pantalla..." />}

      {/* Barra superior móvil / tablet */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-surface-border bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border text-ink hover:bg-surface"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-drawer"
            aria-label="Abrir menú de navegación"
            onClick={openMobileMenu}
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <span className="text-base font-bold tracking-tight text-slate-900">FlowPay</span>
        </div>
      </header>

      {/* Drawer móvil: montado solo al abrir/cerrar, con desliz sutil del panel */}
      {mobileMenuMounted && (
      <div
        className="fixed inset-0 z-50 flex overflow-hidden lg:hidden"
        role="dialog"
        aria-modal
        aria-hidden={!mobileMenuOpen}
        aria-labelledby="mobile-drawer-title"
      >
        <aside
          id="mobile-drawer"
          className={[
            "flex h-full w-[min(18rem,88vw)] shrink-0 flex-col border-r border-surface-border bg-white shadow-lg",
            "transition-transform duration-200 ease-out motion-reduce:transition-none",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-4">
            <h2 id="mobile-drawer-title" className="text-lg font-bold tracking-tight text-slate-900">
              FlowPay
            </h2>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface"
              aria-label="Cerrar menú"
              onClick={closeMobileMenu}
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
            <p className="text-xs leading-relaxed text-ink-muted">
              {isPlatformAdmin
                ? "Control global para operar empresas cliente."
                : "Te ayudamos a cobrar más rápido, automáticamente."}
            </p>
            <nav className="flex flex-col gap-1" onClick={closeMobileMenu}>
              {items.map((item) => (
                <div key={item.to + (item.end ? "-e" : "")} className="flex flex-col gap-1">
                  {item.subItems?.length ? (
                    <>
                      {(() => {
                        const rowActive =
                          location.pathname === item.to ||
                          (item.subItems?.some((s) => location.pathname === s.to) ?? false);
                        return (
                          <div
                            className={[linkClass({ isActive: rowActive }, false), "w-full min-w-0"].join(" ")}
                          >
                            <NavLink
                              to={item.to}
                              end={item.end}
                              className="flex min-w-0 flex-1 items-center gap-3 text-inherit outline-none ring-0"
                            >
                              <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                              <span className="truncate">{item.label}</span>
                            </NavLink>
                            <button
                              type="button"
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-white/80"
                              aria-expanded={clientsSubOpen}
                              aria-label="Desplegar sección Clientes"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleClientsSub();
                              }}
                            >
                              <ChevronRight
                                className={[
                                  "h-3.5 w-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none",
                                  clientsSubOpen ? "rotate-90" : "",
                                ].join(" ")}
                                strokeWidth={2}
                              />
                            </button>
                          </div>
                        );
                      })()}
                      <div
                        className={[
                          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0",
                          clientsSubOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                        ].join(" ")}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="flex flex-col gap-1 pt-0.5">
                            {item.subItems.map((sub) => (
                              <NavLink key={sub.to} to={sub.to} className={(p) => subNavClass(p)}>
                                <sub.icon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={(p) => linkClass(p, false)}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                      <span>{item.label}</span>
                    </NavLink>
                  )}
                </div>
              ))}
            </nav>
            {accountSection(false, true)}
          </div>
        </aside>
        <button
          type="button"
          className={[
            "min-h-0 min-w-0 flex-1 cursor-default bg-slate-900/35 transition-opacity duration-200 ease-out motion-reduce:transition-none",
            mobileMenuOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
          aria-label="Cerrar menú"
          tabIndex={mobileMenuOpen ? 0 : -1}
          onClick={closeMobileMenu}
        />
      </div>
      )}

      {/* Sidebar escritorio: ancho dinámico, colapsable */}
      <aside
        className={[
          "hidden shrink-0 flex-col border-r border-surface-border bg-gradient-to-b from-white to-slate-50/70 transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:flex lg:h-dvh lg:overflow-hidden",
          sidebarCollapsed ? "w-[4.5rem] px-2 py-6" : "w-64 px-4 py-8",
        ].join(" ")}
      >
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-base font-bold text-brand"
              title="FlowPay"
            >
              F
            </div>
            <button
              type="button"
              title="Expandir menú"
              aria-expanded={false}
              aria-label="Expandir menú"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-ink-muted transition hover:bg-surface hover:text-ink"
              onClick={() => setSidebarCollapsed(false)}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="flex w-full items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="w-full text-center text-lg font-bold tracking-tight text-slate-900">FlowPay</div>
            </div>
            <button
              type="button"
              title="Ocultar menú"
              aria-expanded
              aria-label="Ocultar menú lateral"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border text-ink-muted transition hover:bg-surface hover:text-ink"
              onClick={() => setSidebarCollapsed(true)}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        )}

        {!sidebarCollapsed && (
          <div className="mt-7 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted/80">
            Navegacion
          </div>
        )}
        <nav className={`mt-2 flex flex-col gap-1 ${sidebarCollapsed ? "items-stretch" : ""}`}>
          {items.map((item) => (
            <div key={item.to + (item.end ? "-e" : "")} className="flex flex-col gap-1">
              {item.subItems?.length && sidebarCollapsed ? (
                <>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={item.label}
                    className={(p) => {
                      const childActive = item.subItems?.some((s) => location.pathname === s.to) ?? false;
                      return linkClass({ isActive: p.isActive || childActive }, true);
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                  </NavLink>
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      title={sub.label}
                      className={(p) => linkClass(p, true)}
                    >
                      <sub.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                    </NavLink>
                  ))}
                </>
              ) : item.subItems?.length ? (
                <>
                  {(() => {
                    const rowActive =
                      location.pathname === item.to ||
                      (item.subItems?.some((s) => location.pathname === s.to) ?? false);
                    return (
                      <div
                        className={[linkClass({ isActive: rowActive }, false), "w-full min-w-0"].join(" ")}
                      >
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className="flex min-w-0 flex-1 items-center gap-3 text-inherit outline-none ring-0"
                        >
                          <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-white/80"
                          aria-expanded={clientsSubOpen}
                          aria-label="Desplegar sección Clientes"
                          title={clientsSubOpen ? "Ocultar submenú" : "Mostrar submenú"}
                          onClick={toggleClientsSub}
                        >
                          <ChevronRight
                            className={[
                              "h-3.5 w-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none",
                              clientsSubOpen ? "rotate-90" : "",
                            ].join(" ")}
                            strokeWidth={2}
                          />
                        </button>
                      </div>
                    );
                  })()}
                  <div
                    className={[
                      "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0",
                      clientsSubOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    ].join(" ")}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="flex flex-col gap-1 pt-0.5">
                        {item.subItems!.map((sub) => (
                          <NavLink key={sub.to} to={sub.to} className={(p) => subNavClass(p)}>
                            <sub.icon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} />
                            <span className="truncate">{sub.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={(p) => linkClass(p, sidebarCollapsed)}
                >
                  <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {accountSection(sidebarCollapsed)}
      </aside>

      <main className="h-dvh min-h-0 w-full min-w-0 flex-1 overflow-y-auto bg-surface px-4 pb-6 pt-20 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
        <Outlet />
      </main>

      {profileOpen && (
        <AppModal onBackdropClick={profileLoading ? undefined : () => setProfileOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Perfil</h2>
            {profileError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">
                {profileError}
              </div>
            )}
            <form className="mt-4 space-y-3" onSubmit={(e) => void saveProfile(e)}>
              <label className="block text-sm font-medium text-ink">
                Nombre
                <input
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Correo
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </label>
              <PasswordInput
                label="Nueva contraseña (opcional)"
                value={profileForm.password}
                onChange={(value) => setProfileForm((f) => ({ ...f, password: value }))}
                autoComplete="new-password"
                minLength={8}
              />
              <PasswordInput
                label="Confirmar nueva contraseña"
                value={profileForm.confirmPassword}
                onChange={(value) => setProfileForm((f) => ({ ...f, confirmPassword: value }))}
                autoComplete="new-password"
                minLength={8}
              />
              <p className="-mt-1 text-xs text-ink-muted">{PASSWORD_POLICY_HINT}</p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface disabled:opacity-50"
                  disabled={profileLoading}
                  onClick={() => setProfileOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
                  disabled={profileLoading}
                >
                  {profileLoading ? "Guardando..." : "Guardar perfil"}
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}
    </div>
  );
}
