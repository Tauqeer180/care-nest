import { AccountType } from "@/services/authService";

/**
 * The account types a user can sign in as, in display order.
 * Shared by the login and forgot-password screens so the toggle stays
 * consistent — clients authenticate through /mobile/client/*, staff through
 * /mobile/*, but both pick their type from this same list.
 */
export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "superadmin", label: "Admin" },
  { value: "client", label: "Client" },
];

/** Clients use a username (or email) as their identifier; staff always use email. */
export function identifierLabel(type: AccountType): string {
  return type === "client" ? "Username or Email" : "Email Address";
}
