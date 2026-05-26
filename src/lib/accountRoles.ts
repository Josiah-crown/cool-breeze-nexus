/** Installer/company/super_admin can configure machines, alerts, ESP, and site layout. */
export function canManageMachines(role: string | undefined): boolean {
  return role === "super_admin" || role === "company" || role === "installer";
}

export function isClientViewer(role: string | undefined): boolean {
  return role === "client";
}

/** Super admin and company can open the managed accounts directory (`/dashboard/clients`). */
export function canViewManagedAccountDirectory(role: string | undefined): boolean {
  return role === "super_admin" || role === "company";
}
