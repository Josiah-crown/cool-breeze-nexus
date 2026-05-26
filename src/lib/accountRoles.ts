/** Installer/company/super_admin can configure machines, alerts, ESP keys, and add devices. */
export function canManageMachines(role: string | undefined): boolean {
  return role === "super_admin" || role === "company" || role === "installer";
}

/** Head office + super admin: Sites ERF, buildings, pins, site settings, dashboard card order. */
export function canManageSiteLayout(role: string | undefined): boolean {
  return role === "super_admin" || role === "company";
}

/** Clients and installers: view Sites layout; open machine readings; installers still commission devices. */
export function isSiteLayoutViewer(role: string | undefined): boolean {
  return role === "client" || role === "installer";
}

export function isClientViewer(role: string | undefined): boolean {
  return role === "client";
}

/** Super admin and company can open the managed accounts directory (`/dashboard/clients`). */
export function canViewManagedAccountDirectory(role: string | undefined): boolean {
  return role === "super_admin" || role === "company";
}
