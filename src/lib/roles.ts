import { getSessionClaims } from "./auth";

export function sessionRole(): string {
  return (getSessionClaims()?.role ?? "").trim().toLowerCase();
}

export function isCompanyAdmin(): boolean {
  return sessionRole() === "admin";
}

export function isCompanyMember(): boolean {
  return sessionRole() === "member";
}

export function roleLabel(role: string): string {
  switch ((role ?? "").trim().toLowerCase()) {
    case "member":
      return "Vendedor";
    case "admin":
      return "Administrador";
    case "platform_admin":
      return "Superadmin";
    default:
      return role || "—";
  }
}
