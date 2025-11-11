import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Building2, Users, User, Shield, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotificationRecipient {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'super_admin' | 'company' | 'installer' | 'client';
  enabled: boolean;
  canEdit: boolean;
}

interface NotificationRecipientsPanelProps {
  machineId: string;
  machineName: string;
}

export const NotificationRecipientsPanel: React.FC<NotificationRecipientsPanelProps> = ({
  machineId,
  machineName,
}) => {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editableUserIds, setEditableUserIds] = useState<string[]>([]);
  const [canEditAll, setCanEditAll] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotificationRecipients();
    }
  }, [machineId, user]);

  const fetchNotificationRecipients = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { id: currentUserId, role: currentUserRole } = user;
      const allowedIdsSet = new Set<string>([currentUserId]);
      let allowAll = currentUserRole === 'super_admin';

      if (!allowAll) {
        if (currentUserRole === 'company') {
          const { data: installerAssignments, error: installerError } = await supabase
            .from('installer_company_assignments')
            .select('installer_id')
            .eq('company_id', currentUserId);

          if (installerError) throw installerError;

          const installerIds = (installerAssignments || []).map(
            (assignment: any) => assignment.installer_id
          );
          installerIds.forEach(id => allowedIdsSet.add(id));

          if (installerIds.length > 0) {
            const { data: clientAssignments, error: clientError } = await supabase
              .from('client_admin_assignments')
              .select('client_id')
              .in('admin_id', installerIds);

            if (clientError) throw clientError;

            (clientAssignments || []).forEach((assignment: any) =>
              allowedIdsSet.add(assignment.client_id)
            );
          }
        } else if (currentUserRole === 'installer') {
          const { data: clientAssignments, error: clientError } = await supabase
            .from('client_admin_assignments')
            .select('client_id')
            .eq('admin_id', currentUserId);

          if (clientError) throw clientError;

          (clientAssignments || []).forEach((assignment: any) =>
            allowedIdsSet.add(assignment.client_id)
          );
        }
      }

      // Fetch all notification preferences for this machine
      const { data: prefs, error: prefsError } = await supabase
        .from('machine_notification_preferences')
        .select('user_id, enabled')
        .eq('machine_id', machineId);

      if (prefsError) throw prefsError;

      if (!prefs || prefs.length === 0) {
        setRecipients([]);
        setEditableUserIds(Array.from(allowedIdsSet));
        setCanEditAll(allowAll);
        setLoading(false);
        return;
      }

      // Fetch user profiles and roles for all recipients
      const userIds = prefs.map(p => p.user_id);

      const [
        { data: profiles, error: profilesError },
        { data: roles, error: rolesError }
      ] = await Promise.all([
        supabase.from('profiles').select('id, name, email').in('id', userIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds)
      ]);

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      // Create a map of user roles
      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => {
        roleMap.set(r.user_id, r.role);
      });

      // Build recipients array
      const allRecipients: NotificationRecipient[] = (profiles || []).map((profile: any) => {
        const pref = prefs.find(p => p.user_id === profile.id);
        const role = roleMap.get(profile.id) || 'client';
        const canEdit = allowAll || allowedIdsSet.has(profile.id);

        return {
          userId: profile.id,
          userName: profile.name,
          userEmail: profile.email,
          userRole: role as any,
          enabled: pref?.enabled ?? true,
          canEdit,
        };
      });

      const recipientsList = allowAll
        ? allRecipients
        : allRecipients.filter(recipient => allowedIdsSet.has(recipient.userId));

      // Sort by role hierarchy: super_admin → company → installer → client
      const roleOrder = { super_admin: 0, company: 1, installer: 2, client: 3 };
      recipientsList.sort((a, b) => roleOrder[a.userRole] - roleOrder[b.userRole]);

      setRecipients(recipientsList);
      setEditableUserIds(Array.from(allowedIdsSet));
      setCanEditAll(allowAll);
    } catch (error: any) {
      console.error('Error fetching notification recipients:', error);
      toast.error('Failed to load notification recipients');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (recipientUserId: string, currentEnabled: boolean) => {
    if (!user) {
      toast.error('You must be logged in to manage notifications');
      return;
    }

    if (!canEditAll && !editableUserIds.includes(recipientUserId)) {
      toast.error('You do not have permission to change this notification preference');
      return;
    }

    const newValue = !currentEnabled;

    try {
      const { error } = await supabase
        .from('machine_notification_preferences')
        .update({ enabled: newValue })
        .eq('machine_id', machineId)
        .eq('user_id', recipientUserId);

      if (error) throw error;

      // Update local state
      setRecipients(prev =>
        prev.map(r =>
          r.userId === recipientUserId ? { ...r, enabled: newValue } : r
        )
      );

      const recipient = recipients.find(r => r.userId === recipientUserId);
      toast.success(
        `Notifications ${newValue ? 'enabled' : 'disabled'} for ${recipient?.userName}`
      );
    } catch (error: any) {
      console.error('Error updating notification preference:', error);
      toast.error('Failed to update notification setting');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'company':
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case 'installer':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'client':
        return <User className="h-4 w-4 text-orange-500" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'company':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'installer':
        return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'client':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Recipients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (recipients.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Recipients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No notification recipients configured for this machine.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Recipients
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who receives notifications from {machineName}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recipients.map((recipient) => (
            <div
              key={recipient.userId}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                recipient.enabled
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-red-500/5 border-red-500/20"
              )}
            >
              <div className="flex items-center gap-3 flex-1">
                {getRoleIcon(recipient.userRole)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{recipient.userName}</p>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        getRoleBadgeColor(recipient.userRole)
                      )}
                    >
                      {getRoleLabel(recipient.userRole)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {recipient.userEmail}
                  </p>
                </div>
              </div>

              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      {recipient.enabled ? (
                        <Bell className="h-4 w-4 text-green-600" />
                      ) : (
                        <BellOff className="h-4 w-4 text-red-600" />
                      )}
                      <Switch
                        checked={recipient.enabled}
                        onCheckedChange={() => handleToggle(recipient.userId, recipient.enabled)}
                        disabled={!recipient.canEdit}
                        className={cn(
                          !recipient.canEdit && "opacity-50 cursor-not-allowed"
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {recipient.canEdit
                      ? `Click to ${recipient.enabled ? 'disable' : 'enable'} notifications for ${recipient.userName}`
                      : 'You do not have permission to change this setting'
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

