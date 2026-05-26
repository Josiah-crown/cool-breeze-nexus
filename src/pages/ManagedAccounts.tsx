import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canViewManagedAccountDirectory } from "@/lib/accountRoles";
import { useManagedAccountDirectory, type ManagedAccountRow } from "@/hooks/useManagedAccountDirectory";
import type { UserHierarchy } from "@/hooks/useMachineData";
import { AssignClientInstallerDialog } from "@/components/AssignClientInstallerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, UserCog } from "lucide-react";

function accountsToUserHierarchy(accounts: ManagedAccountRow[]): UserHierarchy[] {
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    parentId:
      a.role === "installer"
        ? a.company_id ?? undefined
        : a.role === "client"
          ? a.installer_id ?? undefined
          : undefined,
    companyId: a.company_id ?? (a.role === "company" ? a.id : undefined),
  }));
}

type AccountTableProps = {
  rows: ManagedAccountRow[];
  showCompany: boolean;
  showInstaller: boolean;
  onManageClient?: (row: ManagedAccountRow) => void;
};

const AccountTable: React.FC<AccountTableProps> = ({
  rows,
  showCompany,
  showInstaller,
  onManageClient,
}) => {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No accounts in this group.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Business</TableHead>
            {showCompany && <TableHead>Company</TableHead>}
            {showInstaller && <TableHead>Installer</TableHead>}
            <TableHead className="text-right">Machines</TableHead>
            <TableHead className="text-right">Sites</TableHead>
            {onManageClient && <TableHead className="w-[7rem]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.email}</TableCell>
              <TableCell>{row.business_name || "—"}</TableCell>
              {showCompany && <TableCell>{row.company_name || "—"}</TableCell>}
              {showInstaller && <TableCell>{row.installer_name || "—"}</TableCell>}
              <TableCell className="text-right tabular-nums">{row.machine_count}</TableCell>
              <TableCell className="text-right tabular-nums">{row.site_count}</TableCell>
              {onManageClient && row.role === "client" && (
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => onManageClient(row)}
                  >
                    <UserCog className="mr-1.5 h-3.5 w-3.5" />
                    Assign
                  </Button>
                </TableCell>
              )}
              {onManageClient && row.role !== "client" && <TableCell />}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ManagedAccounts: React.FC = () => {
  const { user } = useAuth();
  const allowed = canViewManagedAccountDirectory(user?.role);
  const { accounts, viewerRole, loading, error, reload } = useManagedAccountDirectory(allowed);
  const [query, setQuery] = useState("");
  const [assignClient, setAssignClient] = useState<ManagedAccountRow | null>(null);

  const hierarchyUsers = useMemo(() => accountsToUserHierarchy(accounts), [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.business_name?.toLowerCase().includes(q) ?? false) ||
        (a.company_name?.toLowerCase().includes(q) ?? false) ||
        (a.installer_name?.toLowerCase().includes(q) ?? false),
    );
  }, [accounts, query]);

  const byRole = useMemo(() => {
    const clients = filtered.filter((a) => a.role === "client");
    const installers = filtered.filter((a) => a.role === "installer");
    const companies = filtered.filter((a) => a.role === "company");
    const superAdmins = filtered.filter((a) => a.role === "super_admin");
    return { clients, installers, companies, superAdmins };
  }, [filtered]);

  if (!user) return null;
  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  const isSuper = viewerRole === "super_admin";
  const showCompanyCol = isSuper;
  const showInstallerCol = true;

  return (
    <main className="w-full p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Managed accounts</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {isSuper
              ? "All company, installer, and client accounts on the platform."
              : "Clients and installers assigned to your company."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-4 max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, company, installer…"
          aria-label="Search accounts"
        />
      </div>

      {error && (
        <Card className="mb-4 border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Clients</CardTitle>
              <CardDescription>
                {byRole.clients.length} client{byRole.clients.length === 1 ? "" : "s"}
                {isSuper ? " — assign installer and company from here." : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountTable
                rows={byRole.clients}
                showCompany={showCompanyCol}
                showInstaller={showInstallerCol}
                onManageClient={setAssignClient}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Installers</CardTitle>
              <CardDescription>
                {byRole.installers.length} installer{byRole.installers.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountTable
                rows={byRole.installers}
                showCompany={showCompanyCol}
                showInstaller={false}
              />
            </CardContent>
          </Card>

          {isSuper && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Companies</CardTitle>
                <CardDescription>
                  {byRole.companies.length} compan{byRole.companies.length === 1 ? "y" : "ies"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AccountTable rows={byRole.companies} showCompany={false} showInstaller={false} />
              </CardContent>
            </Card>
          )}

          {isSuper && byRole.superAdmins.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Super admins</CardTitle>
                <CardDescription>{byRole.superAdmins.length} account(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <AccountTable rows={byRole.superAdmins} showCompany={false} showInstaller={false} />
              </CardContent>
            </Card>
          )}

          {!isSuper && byRole.companies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your company</CardTitle>
              </CardHeader>
              <CardContent>
                <AccountTable rows={byRole.companies} showCompany={false} showInstaller={false} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {assignClient && user && (
        <AssignClientInstallerDialog
          open={Boolean(assignClient)}
          onOpenChange={(open) => !open && setAssignClient(null)}
          clientId={assignClient.id}
          clientName={assignClient.name}
          users={hierarchyUsers}
          currentInstallerId={assignClient.installer_id ?? undefined}
          currentCompanyId={assignClient.company_id ?? undefined}
          actorRole={user.role}
          actorId={user.id}
          onSaved={() => void reload()}
        />
      )}
    </main>
  );
};

export default ManagedAccounts;
