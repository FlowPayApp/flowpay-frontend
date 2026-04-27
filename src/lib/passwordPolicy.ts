export const PASSWORD_POLICY_HINT =
  "Mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y símbolo.";

export function getPasswordPolicyError(password: string): string | null {
  if (password.length < 8) return PASSWORD_POLICY_HINT;
  if (!/[A-Z]/.test(password)) return PASSWORD_POLICY_HINT;
  if (!/[a-z]/.test(password)) return PASSWORD_POLICY_HINT;
  if (!/[0-9]/.test(password)) return PASSWORD_POLICY_HINT;
  if (!/[^A-Za-z0-9]/.test(password)) return PASSWORD_POLICY_HINT;
  return null;
}
