import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMachineData } from "@/hooks/useMachineData";
import MachineCard from "@/components/MachineCard";
import MachineDetailView from "@/components/MachineDetailView";
import { AddUserDialog } from "@/components/AddUserDialog";
import { AddMachineDialog } from "@/components/AddMachineDialog";
import { ChangeOwnerDialog } from "@/components/ChangeOwnerDialog";
import { RenameMachineDialog } from "@/components/RenameMachineDialog";
import { ChangeManufacturerDialog } from "@/components/ChangeManufacturerDialog";
import DashboardSiteMachineSections from "@/components/DashboardSiteMachineSections";
import { MachineStatus } from "@/types/machine";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Plus, Settings, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import TopTaskbar from "@/components/TopTaskbar";
import DemoDashboardPreview from "@/components/DemoDashboardPreview";
import { canManageMachines } from "@/lib/accountRoles";

const DashboardLoading: React.FC<{ embedded?: boolean }> = ({ embedded }) =>
  embedded ? (
    <div className="flex min-h-[14rem] items-center justify-center p-6 text-sm text-muted-foreground">
      Loading dashboard…
    </div>
  ) : (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Loading dashboard…</div>
    </div>
  );

const Dashboard: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { machines, historicalData, users, refetch, loading: dataLoading } = useMachineData(
    user?.id ?? "",
    user?.role ?? "client",
  );
  const [selectedMachine, setSelectedMachine] = useState<MachineStatus | null>(null);

  useEffect(() => {
    if (selectedMachine && machines.length > 0) {
      const updatedMachine = machines.find((m) => m.id === selectedMachine.id);
      if (updatedMachine) {
        setSelectedMachine(updatedMachine);
      }
    }
  }, [machines, selectedMachine?.id]);

  const refetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const scheduleRefetch = () => {
      if (refetchDebounceRef.current) clearTimeout(refetchDebounceRef.current);
      refetchDebounceRef.current = setTimeout(() => {
        refetchDebounceRef.current = null;
        refetch();
      }, 800);
    };

    const channel = supabase
      .channel("dashboard-machines-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "machines",
        },
        () => {
          scheduleRefetch();
        },
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      refetch();
    }, 30000);

    return () => {
      if (refetchDebounceRef.current) clearTimeout(refetchDebounceRef.current);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, refetch]);

  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showAddMachineDialog, setShowAddMachineDialog] = useState(false);
  const [changeOwnerMachineId, setChangeOwnerMachineId] = useState<string | null>(null);
  const [renameMachineId, setRenameMachineId] = useState<string | null>(null);
  const [changeManufacturerMachineId, setChangeManufacturerMachineId] = useState<string | null>(null);
  const handleRefresh = () => {
    refetch();
  };

  const handleDeleteMachine = async (machineId: string) => {
    try {
      const { error } = await supabase.from("machines").delete().eq("id", machineId);

      if (error) throw error;

      toast.success("Machine deleted successfully");
      handleRefresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete machine";
      toast.error(msg);
    }
  };

  const handleChangeOwner = (machineId: string) => {
    setChangeOwnerMachineId(machineId);
  };

  const handleRename = (machineId: string) => {
    setRenameMachineId(machineId);
  };

  const handleChangeManufacturer = (machineId: string) => {
    const machine = machines.find((m) => m.id === machineId);
    if (!machine) {
      toast.error("Machine not found");
      return;
    }
    setChangeManufacturerMachineId(machineId);
  };

  const selectedMachineForOwnerChange = machines.find((m) => m.id === changeOwnerMachineId);
  const selectedMachineForRename = machines.find((m) => m.id === renameMachineId);
  const selectedMachineForManufacturerChange = machines.find((m) => m.id === changeManufacturerMachineId);
  const machineManagement = canManageMachines(user?.role);

  if (authLoading) {
    return <DashboardLoading embedded={embedded} />;
  }

  if (!user) {
    if (embedded) {
      return <DemoDashboardPreview embedded />;
    }
    return (
      <div className="min-h-screen bg-background">
        <TopTaskbar subtitle="Demo dashboard · sample data" />
        <DemoDashboardPreview />
      </div>
    );
  }

  if (dataLoading && machines.length === 0) {
    return <DashboardLoading embedded={embedded} />;
  }

  const analyticsHud = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
        <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: "2px" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="relative text-center z-10">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Machines</p>
          <p className="text-xl font-bold text-foreground mt-1">{machines.length}</p>
        </div>
      </div>
      <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
        <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: "2px" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
        <div className="relative text-center z-10">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On</p>
          <p className="text-xl font-bold mt-1">
            <span className="text-green-500">{machines.filter((m) => m.isOn).length}</span>
            <span className="text-muted-foreground"> | </span>
            <span className="text-red-500">{machines.filter((m) => !m.isOn).length}</span>
          </p>
        </div>
      </div>
      <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
        <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: "2px" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
        <div className="relative text-center z-10">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connected</p>
          <p className="text-xl font-bold mt-1">
            <span className="text-green-500">{machines.filter((m) => m.isConnected).length}</span>
            <span className="text-muted-foreground"> | </span>
            <span className="text-red-500">{machines.filter((m) => !m.isConnected).length}</span>
          </p>
        </div>
      </div>
      <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
        <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: "2px" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
        <div className="relative text-center z-10">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
          <p className="text-xl font-bold mt-1">
            <span className="text-green-500">{machines.filter((m) => m.overallStatus === "good").length}</span>
            <span className="text-muted-foreground"> | </span>
            <span className="text-red-500">{machines.filter((m) => m.overallStatus === "error").length}</span>
          </p>
        </div>
      </div>
    </div>
  );

  const content = (
    <main className={embedded ? "w-full p-4 sm:p-6" : "w-full px-4 sm:px-6 lg:px-[80px] py-4 sm:py-6 lg:py-8"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Dashboard</div>
          <div className="text-xs text-muted-foreground truncate">
            {user.name} • {user.role.replace("_", " ")}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          {machineManagement ? (
            <>
              <Button variant="outline" onClick={() => setShowAddMachineDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add machine
              </Button>
              <Button variant="outline" onClick={() => setShowAddUserDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add client / user
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard/sites")}>
                <Users className="mr-2 h-4 w-4" />
                Sites
              </Button>
              <Button variant="outline" onClick={() => navigate("/account")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => navigate("/dashboard/sites")}>
              <Users className="mr-2 h-4 w-4" />
              View sites
            </Button>
          )}
        </div>
      </div>

      {analyticsHud}

      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-1">Machines by site</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {machineManagement
            ? "Sites are collapsible (open by default). Pin machines on a floorplan under Sites to group them here. Drag cards by the grip handle to set display order within each site."
            : "View live machine status and history. Contact your installer to change alerts, notifications, or device setup."}
        </p>
      </div>

      <DashboardSiteMachineSections
        machines={machines}
        users={users}
        onMachineClick={setSelectedMachine}
        showMachineManagement={machineManagement}
        onDeleteMachine={machineManagement ? handleDeleteMachine : undefined}
        onChangeOwner={machineManagement ? handleChangeOwner : undefined}
        onRename={machineManagement ? handleRename : undefined}
        onChangeManufacturer={machineManagement ? handleChangeManufacturer : undefined}
        onNotificationChange={machineManagement ? refetch : undefined}
      />
    </main>
  );

  const overlays = (
    <>
      {selectedMachine && (
        <MachineDetailView
          machine={selectedMachine}
          historicalData={historicalData[selectedMachine.id]}
          onClose={() => setSelectedMachine(null)}
          onMachineApiKeyUpdated={refetch}
        />
      )}

      {(user.role === "installer" || user.role === "company" || user.role === "super_admin") && (
        <>
          <AddUserDialog
            open={showAddUserDialog}
            onOpenChange={setShowAddUserDialog}
            userRole={user.role as "installer" | "company" | "super_admin"}
            currentUserId={user.id}
            onUserAdded={handleRefresh}
          />
          <AddMachineDialog
            open={showAddMachineDialog}
            onOpenChange={setShowAddMachineDialog}
            ownerId={user.id}
            userRole={user.role as "super_admin" | "installer" | "company" | "client"}
            onMachineAdded={handleRefresh}
          />
        </>
      )}

      {changeOwnerMachineId && selectedMachineForOwnerChange && (
        <ChangeOwnerDialog
          open={!!changeOwnerMachineId}
          onOpenChange={(open) => !open && setChangeOwnerMachineId(null)}
          machineId={changeOwnerMachineId}
          machineName={selectedMachineForOwnerChange.name}
          currentOwnerId={selectedMachineForOwnerChange.ownerId}
          users={users}
          onOwnerChanged={handleRefresh}
          currentUserRole={user.role}
          currentUserId={user.id}
        />
      )}

      {changeManufacturerMachineId && selectedMachineForManufacturerChange && (
        <ChangeManufacturerDialog
          open={!!changeManufacturerMachineId}
          onOpenChange={(open) => {
            if (!open) {
              setChangeManufacturerMachineId(null);
            }
          }}
          machineId={changeManufacturerMachineId}
          machineName={selectedMachineForManufacturerChange.name}
          machineType={selectedMachineForManufacturerChange.type}
          currentManufacturer={selectedMachineForManufacturerChange.manufacturer || null}
          onSuccess={() => {
            refetch();
            setChangeManufacturerMachineId(null);
          }}
        />
      )}

      {renameMachineId && selectedMachineForRename && (
        <RenameMachineDialog
          machineId={renameMachineId}
          currentName={selectedMachineForRename.name}
          open={!!renameMachineId}
          onOpenChange={(open) => !open && setRenameMachineId(null)}
          onSuccess={handleRefresh}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <>
        {content}
        {overlays}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopTaskbar subtitle={`Welcome, ${user.name} (${user.role.replace("_", " ")})`} />

      {content}
      {overlays}
    </div>
  );
};

export default Dashboard;
