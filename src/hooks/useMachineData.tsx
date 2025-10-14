import { useState, useEffect } from 'react';
import { MachineStatus, MachineHistoricalData } from '@/types/machine';
import { supabase } from '@/integrations/supabase/client';

export interface UserHierarchy {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'client';
  parentId?: string; // For clients, this is their admin's id
}

const generateHistoricalData = (currentValue: number, variance: number, points: number = 20) => {
  const data = [];
  const now = Date.now();
  for (let i = points; i > 0; i--) {
    data.push({
      timestamp: now - i * 10000, // 10 second intervals
      value: currentValue + (Math.random() - 0.5) * variance
    });
  }
  return data;
};


export const useMachineData = (userId: string, userRole: string) => {
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [historicalData, setHistoricalData] = useState<Record<string, MachineHistoricalData>>({});
  const [users, setUsers] = useState<UserHierarchy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users based on role
        let availableUsers: UserHierarchy[] = [];
        
        if (userRole === 'super_admin') {
          // Super admin sees all users
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, email');
          
          if (profilesError) throw profilesError;

          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role');
          
          if (rolesError) throw rolesError;

          const { data: assignments, error: assignmentsError } = await supabase
            .from('client_admin_assignments')
            .select('client_id, admin_id');
          
          if (assignmentsError) throw assignmentsError;

          availableUsers = (profiles || []).map((profile: any) => {
            const roleData = roles?.find((r: any) => r.user_id === profile.id);
            const assignment = assignments?.find((a: any) => a.client_id === profile.id);
            
            return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: roleData?.role || 'client',
              parentId: assignment?.admin_id,
            };
          });
        } else if (userRole === 'admin') {
          // Admin sees themselves and their clients
          const { data: selfProfile } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', userId)
            .single();

          const { data: selfRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

          if (selfProfile && selfRole) {
            availableUsers.push({
              id: selfProfile.id,
              name: selfProfile.name,
              email: selfProfile.email,
              role: selfRole.role,
            });
          }

          // Get admin's clients
          const { data: assignments } = await supabase
            .from('client_admin_assignments')
            .select('client_id')
            .eq('admin_id', userId);

          if (assignments && assignments.length > 0) {
            const clientIds = assignments.map((a: any) => a.client_id);
            
            const { data: clientProfiles } = await supabase
              .from('profiles')
              .select('id, name, email')
              .in('id', clientIds);

            const { data: clientRoles } = await supabase
              .from('user_roles')
              .select('user_id, role')
              .in('user_id', clientIds);

            (clientProfiles || []).forEach((profile: any) => {
              const roleData = clientRoles?.find((r: any) => r.user_id === profile.id);
              availableUsers.push({
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: roleData?.role || 'client',
                parentId: userId,
              });
            });
          }
        } else {
          // Client sees only themselves
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', userId)
            .single();

          const { data: role } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

          if (profile && role) {
            availableUsers.push({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: role.role,
            });
          }
        }

        setUsers(availableUsers);

        // Fetch machines based on role
        let visibleMachines: MachineStatus[] = [];
        
        if (userRole === 'super_admin') {
          // Super admin sees all machines
          const { data: allMachines, error: machinesError } = await supabase
            .from('machines')
            .select('*');
          
          if (machinesError) throw machinesError;
          visibleMachines = (allMachines || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            type: m.type,
            ownerId: m.owner_id,
            isOn: m.is_on,
            isConnected: m.is_connected,
            hasWater: m.has_water,
            isCooling: m.is_cooling,
            fanActive: m.fan_active,
            motorTemp: m.motor_temp,
            outsideTemp: m.outside_temp,
            insideTemp: m.inside_temp,
            deltaT: m.delta_t,
            current: m.current,
            voltage: m.voltage,
            power: m.power,
            overallStatus: m.overall_status,
            motorStatus: m.motor_status,
          }));
        } else if (userRole === 'admin') {
          // Admin sees their own machines and their clients' machines
          const userIds = availableUsers.map(u => u.id);
          const { data: adminMachines, error: machinesError } = await supabase
            .from('machines')
            .select('*')
            .in('owner_id', userIds);
          
          if (machinesError) throw machinesError;
          visibleMachines = (adminMachines || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            type: m.type,
            ownerId: m.owner_id,
            isOn: m.is_on,
            isConnected: m.is_connected,
            hasWater: m.has_water,
            isCooling: m.is_cooling,
            fanActive: m.fan_active,
            motorTemp: m.motor_temp,
            outsideTemp: m.outside_temp,
            insideTemp: m.inside_temp,
            deltaT: m.delta_t,
            current: m.current,
            voltage: m.voltage,
            power: m.power,
            overallStatus: m.overall_status,
            motorStatus: m.motor_status,
          }));
        } else {
          // Client sees only their own machines
          const { data: clientMachines, error: machinesError } = await supabase
            .from('machines')
            .select('*')
            .eq('owner_id', userId);
          
          if (machinesError) throw machinesError;
          visibleMachines = (clientMachines || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            type: m.type,
            ownerId: m.owner_id,
            isOn: m.is_on,
            isConnected: m.is_connected,
            hasWater: m.has_water,
            isCooling: m.is_cooling,
            fanActive: m.fan_active,
            motorTemp: m.motor_temp,
            outsideTemp: m.outside_temp,
            insideTemp: m.inside_temp,
            deltaT: m.delta_t,
            current: m.current,
            voltage: m.voltage,
            power: m.power,
            overallStatus: m.overall_status,
            motorStatus: m.motor_status,
          }));
        }

        setMachines(visibleMachines);

        // Generate historical data for each machine
        const historical: Record<string, MachineHistoricalData> = {};
        visibleMachines.forEach(machine => {
          historical[machine.id] = {
            power: generateHistoricalData(machine.power, 100),
            deltaT: generateHistoricalData(machine.deltaT, 2),
            motorTemp: generateHistoricalData(machine.motorTemp, 5)
          };
        });
        setHistoricalData(historical);
      } catch (error) {
        console.error('Error fetching machine data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId && userRole) {
      fetchData();
    }
  }, [userId, userRole]);

  return { machines, historicalData, users, loading };
};
