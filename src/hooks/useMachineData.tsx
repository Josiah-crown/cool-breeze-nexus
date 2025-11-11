import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineStatus } from '@/types/machine';

export interface UserHierarchy {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'company' | 'installer' | 'client';
  parentId?: string;
  companyId?: string;
}

export interface MachineHistoricalData {
  timestamp: string;
  deltaT: number;
  outsideTemp: number;
  insideTemp: number;
}

const useMachineData = (userId: string, userRole: string) => {
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [users, setUsers] = useState<UserHierarchy[]>([]);
  const [historicalData, setHistoricalData] = useState<{ [key: string]: MachineHistoricalData[] }>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const mapMachine = (m: any, notifPrefsMap: Map<string, boolean>): MachineStatus => {
        const motorTemp = m.motor_temp ?? 0;
        const outsideTemp = m.outside_temp ?? 0;
        const insideTemp = m.inside_temp ?? 0;
        const current = m.current ?? 0;
        const voltage = m.voltage ?? 0;
        const power = m.power ?? 0;

        return {
          id: m.id,
          name: m.name,
          type: m.type,
          isOn: m.is_on ?? false,
          isCooling: m.is_cooling ?? false,
          fanActive: m.fan_active ?? false,
          hasWater: m.has_water ?? false,
          hasPump: m.has_pump ?? false,
          hasHeat: m.has_heat ?? false,
          isConnected: m.is_connected ?? false,
          motorTemp,
          outsideTemp,
          insideTemp,
          temperatureSetpoint: m.setpoint ?? null,
          deltaT: Math.abs(outsideTemp - insideTemp),
          current,
          voltage,
          power,
          overallStatus: m.overall_status ?? 'offline',
          motorStatus: m.motor_status ?? 'normal',
          ownerId: m.owner_id,
          location: m.location,
          notificationsEnabled: notifPrefsMap.get(m.id) ?? true,
          apiKey: m.api_key ?? null,
        };
      };

      // Fetch profiles, roles, assignments, and current user's notification preferences
      const [
        { data: profiles }, 
        { data: allRoles },
        { data: installerAssignments },
        { data: clientAssignments },
        { data: userNotificationPrefs }
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('name'),
        supabase.from('user_roles').select('*'),
        supabase.from('installer_company_assignments').select('*'),
        supabase.from('client_admin_assignments').select('*'),
        supabase.from('machine_notification_preferences').select('*').eq('user_id', userId)
      ]);

      console.log('👥 DEBUG: Profiles fetched:', profiles?.length);
      console.log('👥 DEBUG: Roles fetched:', allRoles?.length);
      console.log('👥 DEBUG: Installer assignments:', installerAssignments?.length);
      console.log('👥 DEBUG: Client assignments:', clientAssignments?.length);
      console.log('🔔 DEBUG: User notification prefs:', userNotificationPrefs?.length);

      // Create a Map for quick lookup of notification preferences
      const notifPrefsMap = new Map<string, boolean>();
      (userNotificationPrefs || []).forEach((pref: any) => {
        notifPrefsMap.set(pref.machine_id, pref.enabled);
      });

      // Fetch all machines
      const { data: allMachines } = await supabase
        .from('machines')
        .select('*');

      console.log('🔍 DEBUG: Total machines fetched:', allMachines?.length);
      console.log('🔍 DEBUG: User role:', userRole);

      // Transform profiles into UserHierarchy, joining with roles and assignments
      const transformedUsers: UserHierarchy[] = (profiles || []).map((p: any) => {
        const roleRecord = (allRoles || []).find((r: any) => r.user_id === p.id);
        const role = roleRecord?.role || 'client';
        
        // Determine parentId and companyId based on role
        let parentId: string | undefined = undefined;
        let companyId: string | undefined = undefined;
        
        if (role === 'installer') {
          // Find which company this installer belongs to
          const assignment = (installerAssignments || []).find((a: any) => a.installer_id === p.id);
          parentId = assignment?.company_id;
          companyId = assignment?.company_id;
        } else if (role === 'client') {
          // Find which installer manages this client
          const assignment = (clientAssignments || []).find((a: any) => a.client_id === p.id);
          parentId = assignment?.admin_id; // The installer
          // Find the installer's company
          if (parentId) {
            const installerAssignment = (installerAssignments || []).find((a: any) => a.installer_id === parentId);
            companyId = installerAssignment?.company_id;
          }
        }
        
        return {
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          role,
          parentId,
          companyId,
        };
      });
      
      console.log('✅ Transformed users sample:', transformedUsers.slice(0, 5));
      console.log('✅ Companies:', transformedUsers.filter(u => u.role === 'company').length);
      console.log('✅ Installers:', transformedUsers.filter(u => u.role === 'installer').length);
      console.log('✅ Installers with parentIds:', transformedUsers.filter(u => u.role === 'installer').map(i => ({ name: i.name, parentId: i.parentId, companyId: i.companyId })));
      console.log('✅ Clients:', transformedUsers.filter(u => u.role === 'client').length);

      // Transform machines
      let visibleMachines: MachineStatus[] = [];
      
      if (userRole === 'super_admin') {
        // Super admin sees all machines
        console.log('✅ Super admin mode: showing ALL machines');
        visibleMachines = (allMachines || []).map((m: any) => mapMachine(m, notifPrefsMap));
        console.log('✅ Super admin visible machines:', visibleMachines.length);
      } else if (userRole === 'company') {
        // Company sees their machines and all installer/client machines under them
        console.log('🏢 Company mode - userId:', userId);
        const company = transformedUsers.find(u => u.id === userId);
        console.log('🏢 Company found:', company);
        const installers = transformedUsers.filter(u => u.role === 'installer' && u.parentId === userId);
        console.log('🏢 Installers under company:', installers.length, installers.map(i => ({ name: i.name, parentId: i.parentId })));
        const installerIds = installers.map(i => i.id);
        const clients = transformedUsers.filter(u => u.role === 'client' && installerIds.includes(u.parentId || ''));
        console.log('🏢 Clients under installers:', clients.length);
        const clientIds = clients.map(c => c.id);
        console.log('🏢 Looking for machines owned by:', { companyId: userId, installerIds, clientIds });
        
        const filteredMachines = (allMachines || []).filter(m => 
          m.owner_id === userId || installerIds.includes(m.owner_id) || clientIds.includes(m.owner_id)
        );
        console.log('🏢 Company filtered machines:', filteredMachines.length, 'of', allMachines?.length);

        visibleMachines = filteredMachines.map((m: any) => mapMachine(m, notifPrefsMap));
      } else if (userRole === 'installer') {
        // Installer sees their machines and client machines
        const clients = transformedUsers.filter(u => u.role === 'client' && u.parentId === userId);
        const clientIds = clients.map(c => c.id);

        visibleMachines = (allMachines || [])
          .filter(m => m.owner_id === userId || clientIds.includes(m.owner_id))
          .map((m: any) => mapMachine(m, notifPrefsMap));
      } else {
        // Client sees only their machines
        visibleMachines = (allMachines || [])
          .filter(m => m.owner_id === userId)
          .map((m: any) => mapMachine(m, notifPrefsMap));
      }

      // Generate mock historical data for each machine
      const mockHistoricalData: { [key: string]: MachineHistoricalData[] } = {};
      visibleMachines.forEach(machine => {
        const data: MachineHistoricalData[] = [];
        const now = new Date();
        
        for (let i = 24; i >= 0; i--) {
          const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
          const hour = timestamp.getHours();
          const baseOutside = 15 + Math.sin(hour / 24 * Math.PI * 2) * 10;
          const randomVariation = (Math.random() - 0.5) * 3;
          
          data.push({
            timestamp: timestamp.toISOString(),
            outsideTemp: Math.round((baseOutside + randomVariation) * 10) / 10,
            insideTemp: Math.round((baseOutside + randomVariation - (machine.isCooling ? 5 : 0)) * 10) / 10,
            deltaT: Math.round((machine.isCooling ? 5 : Math.abs(randomVariation)) * 10) / 10,
          });
        }
        
        mockHistoricalData[machine.id] = data;
      });

      console.log('✅ Final transformedUsers:', transformedUsers.length);
      console.log('✅ Final visibleMachines:', visibleMachines.length);
      
      setMachines(visibleMachines);
      setUsers(transformedUsers);
      setHistoricalData(mockHistoricalData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    machines,
    users,
    historicalData,
    loading,
    refetch,
  };
};

export { useMachineData };
