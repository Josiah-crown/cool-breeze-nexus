import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canViewManagedAccountDirectory } from "@/lib/accountRoles";
import { useManagedAccountDirectory, type ManagedAccountRow } from "@/hooks/useManagedAccountDirectory";
import type { UserHierarchy } from "@/hooks/useMachineData";
import { AssignClientInstallerDialog } from "@/components/AssignClientInstallerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const [filterInstallerId, setFilterInstallerId] = useState<string>("all");
  const [assignClient, setAssignClient] = useState<ManagedAccountRow | null>(null);

  const isSuper = viewerRole === "super_admin";

  const companyOptions = useMemo(() => {
    return accounts
      .filter((a) => a.role === "company")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts]);

  const installerOptions = useMemo(() => {
    let list = accounts.filter((a) => a.role === "installer");
    if (isSuper && filterCompanyId !== "all") {
      list = list.filter((a) => a.company_id === filterCompanyId);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, isSuper, filterCompanyId]);

  const hierarchyUsers = useMemo(() => accountsToUserHierarchy(accounts), [accounts]);

  const filtered = useMemo(() => {
    let list = accounts;
    if (isSuper && filterCompanyId !== "all") {
      list = list.filter(
        (a) =>
          (a.role === "company" && a.id === filterCompanyId) ||
          a.company_id === filterCompanyId,
      );
    }
    if (isSuper && filterInstallerId !== "all") {
      list = list.filter(
        (a) =>
          (a.role === "installer" && a.id === filterInstallerId) ||
          (a.role === "client" && a.installer_id === filterInstallerId),
      );
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.business_name?.toLowerCase().includes(q) ?? false) ||
        (a.company_name?.toLowerCase().includes(q) ?? false) ||
        (a.installer_name?.toLowerCase().includes(q) ?? false),
    );
  }, [accounts, query, isSuper, filterCompanyId, filterInstallerId]);

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

  const showCompanyCol = isSuper;
  const showInstallerCol = true;

  return (
    <main className="w-full p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Managed accounts</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {isSuper
              ? "All accounts on the platform — filter by company or installer."
              : "Clients you created or assigned, installers under your company, and clients on your company sites."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {isSuper && (
          <>
            <div className="w-full min-w-[12rem] sm:w-52 space-y-1">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Select
                value={filterCompanyId}
                onValueChange={(v) => {
                  setFilterCompanyId(v);
                  setFilterInstallerId("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companyOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full min-w-[12rem] sm:w-52 space-y-1">
              <Label className="text-xs text-muted-foreground">Installer</Label>
              <Select value={filterInstallerId} onValueChange={setFilterInstallerId}>
                <SelectTrigger>
                  <SelectValue placeholder="All installers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All installers</SelectItem>
                  {installerOptions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                      {i.company_name ? ` · ${i.company_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="w-full min-w-[12rem] flex-1 sm:max-w-md space-y-1">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, business…"
            aria-label="Search accounts"
          />
        </div>
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
