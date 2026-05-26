import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserHierarchy } from "@/hooks/useMachineData";

type AssignClientInstallerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  users: UserHierarchy[];
  currentInstallerId?: string;
  currentCompanyId?: string;
  siteId?: string;
  actorRole: string;
  actorId: string;
  onSaved: () => void;
};

export const AssignClientInstallerDialog: React.FC<AssignClientInstallerDialogProps> = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  users,
  currentInstallerId,
  currentCompanyId,
  siteId,
  actorRole,
  actorId,
  onSaved,
}) => {
  const [companyId, setCompanyId] = useState("");
  const [installerId, setInstallerId] = useState("");
  const [saving, setSaving] = useState(false);

  const companies = useMemo(() => {
    const list = users.filter((u) => u.role === "company");
    const scoped = actorRole === "company" ? list.filter((c) => c.id === actorId) : list;
    return scoped.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, actorRole, actorId]);

  const installersForCompany = useMemo(() => {
    if (!companyId) return [];
    return users
      .filter((u) => u.role === "installer" && (u.parentId === companyId || u.companyId === companyId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, companyId]);

  useEffect(() => {
    if (!open) return;
    setCompanyId(currentCompanyId || companies[0]?.id || "");
    setInstallerId(currentInstallerId || "");
  }, [open, currentCompanyId, currentInstallerId, companies]);

  useEffect(() => {
    if (!installerId) return;
    if (!installersForCompany.some((i) => i.id === installerId)) {
      setInstallerId(installersForCompany[0]?.id || "");
    }
  }, [companyId, installersForCompany, installerId]);

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Choose a company");
      return;
    }
    if (!installerId) {
      toast.error("Choose an installer");
      return;
    }
    setSaving(true);
    try {
      const { error: clientErr } = await supabase.from("client_admin_assignments").upsert(
        {
          client_id: clientId,
          admin_id: installerId,
          assigned_by: actorId,
        },
        { onConflict: "client_id" },
      );
      if (clientErr) throw clientErr;

      const installerHasCompany = users.some(
        (u) => u.id === installerId && u.role === "installer" && u.companyId === companyId,
      );
      if (!installerHasCompany) {
        const { error: linkErr } = await supabase.from("installer_company_assignments").insert({
          installer_id: installerId,
          company_id: companyId,
          assigned_by: actorId,
        });
        if (linkErr && !linkErr.message?.includes("duplicate")) throw linkErr;
      }

      if (siteId && (actorRole === "super_admin" || actorRole === "company")) {
        const { error: siteErr } = await supabase
          .from("sites")
          .update({ company_id: companyId })
          .eq("id", siteId)
          .eq("owner_id", clientId);
        if (siteErr) throw siteErr;
      }

      toast.success("Client linked to company and installer");
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-black/10 bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#0D2211]">Assign company &amp; installer</DialogTitle>
          <DialogDescription className="text-[#4A6B4D]">
            Link <strong>{clientName}</strong> to a service company and installer. Required when a client was created
            without hierarchy (e.g. by super admin).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select
              value={companyId}
              onValueChange={setCompanyId}
              disabled={actorRole === "company" && companies.length <= 1}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Installer</Label>
            <Select value={installerId} onValueChange={setInstallerId} disabled={!companyId || installersForCompany.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={installersForCompany.length ? "Select installer" : "No installers for company"} />
              </SelectTrigger>
              <SelectContent>
                {installersForCompany.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
