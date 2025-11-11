import { Building2, User, LucideIcon } from 'lucide-react';

export type UserRole = 'company' | 'installer' | 'client';

export interface RoleConfig {
  icon: LucideIcon;
  color: string;
  label: string;
}

export const roleConfigs: Record<UserRole, RoleConfig> = {
  company: {
    icon: Building2,
    color: 'text-primary',
    label: 'Company',
  },
  installer: {
    icon: User,
    color: 'text-accent',
    label: 'Installer',
  },
  client: {
    icon: User,
    color: 'text-muted-foreground',
    label: 'Client',
  },
};

export const getRoleConfig = (role: UserRole): RoleConfig => {
  return roleConfigs[role] || roleConfigs.client;
};
