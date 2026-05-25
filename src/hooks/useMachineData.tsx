import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineStatus, MachineHistoricalData } from '@/types/machine';
import { fetchHistoricalDataForMachines } from '@/lib/historicalData';

export interface UserHierarchy {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'company' | 'installer' | 'client';
  parentId?: string;
  companyId?: string;
}

const useMachineData = (userId: string, userRole: string) => {
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [users, setUsers] = useState<UserHierarchy[]>([]);
  const [historicalData, setHistoricalData] = useState<{ [key: string]: MachineHistoricalData }>({});
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const fetchData = useCallback(async (options?: { background?: boolean }) => {
    if (!userId) {
      setMachines([]);
      setUsers([]);
      setHistoricalData({});
      setLoading(false);
      hasLoadedOnceRef.current = false;
      return;
    }

    const background = options?.background === true && hasLoadedOnceRef.current;

    try {
      if (!background) {
        setLoading(true);
      }

      const mapMachine = (m: any, notifPrefsMap: Map<string, boolean>, latestTimestamps: Map<string, Date>): MachineStatus => {
        const motorTemp = m.motor_temp ?? 0;
        const outsideTemp = m.outside_temp ?? 0;
        const insideTemp = m.inside_temp ?? 0;
        const current = m.current ?? 0;
        const voltage = m.voltage ?? 0;
        const power = m.power ?? 0;

        // Calculate connection status from latest reading timestamp (15 minute rule)
        const isConnected = calculateConnectionStatus(m.id, latestTimestamps);

        return {
          id: m.id,
          name: m.name,
          type: m.type,
          manufacturer: m.manufacturer ?? null,
          isOn: m.is_on ?? false,
          isCooling: m.is_cooling ?? false,
          fanActive: m.fan_active ?? false,
          hasWater: m.has_water ?? false,
          // hasPump removed - using hasWater for heatpump pump status (GPIO5)
          hasHeat: m.has_heat ?? false,
          isConnected, // Calculated from latest reading timestamp
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

      // Create a Map for quick lookup of notification preferences
      const notifPrefsMap = new Map<string, boolean>();
      (userNotificationPrefs || []).forEach((pref: any) => {
        notifPrefsMap.set(pref.machine_id, pref.enabled);
      });

      // Fetch all machines
      const { data: allMachines } = await supabase
        .from('machines')
        .select('*');

      // Fetch latest reading timestamps for connection status calculation
      const machineIds = (allMachines || []).map(m => m.id);
      const latestTimestamps = new Map<string, Date>();
      
      if (machineIds.length > 0) {
        // Check readings_raw table for latest timestamps
        const { data: latestReadingsRaw } = await supabase
          .from('readings_raw')
          .select('machine_id, created_at')
          .in('machine_id', machineIds)
          .order('created_at', { ascending: false });
        
        // Check cirrus table for latest timestamps
        const { data: latestCirrus } = await supabase
          .from('cirrus')
          .select('machine_id, timestamp')
          .in('machine_id', machineIds)
          .order('timestamp', { ascending: false });
        
        // Check coolbreeze table for latest timestamps
        const { data: latestCoolBreeze, error: coolbreezeError } = await supabase
          .from('coolbreeze')
          .select('machine_id, timestamp')
          .in('machine_id', machineIds)
          .order('timestamp', { ascending: false });
        
        // Handle table-not-found errors: suppress 404 errors, but log other errors
        if (coolbreezeError) {
          if (coolbreezeError.code === 'PGRST205' || coolbreezeError.message?.includes('Could not find the table') || coolbreezeError.message?.includes('does not exist')) {
            // Table doesn't exist - this is a 404 that needs to be fixed by creating the table
            // For now, treat as empty data (0 readings)
            console.debug('[useMachineData] coolbreeze table does not exist yet - showing 0 readings');
          } else {
            // Other errors (permissions, etc.) - log but continue
            console.warn('[useMachineData] Error fetching coolbreeze timestamps:', coolbreezeError);
          }
        }
        
        // Build map of latest timestamps (take most recent from any table)
        // Group by machine_id and take the most recent timestamp for each
        const readingsByMachine = new Map<string, Date>();
        
        (latestReadingsRaw || []).forEach((reading: any) => {
          const existing = readingsByMachine.get(reading.machine_id);
          const readingTime = new Date(reading.created_at);
          if (!existing || readingTime > existing) {
            readingsByMachine.set(reading.machine_id, readingTime);
          }
        });
        
        (latestCirrus || []).forEach((reading: any) => {
          const existing = readingsByMachine.get(reading.machine_id);
          const readingTime = new Date(reading.timestamp);
          if (!existing || readingTime > existing) {
            readingsByMachine.set(reading.machine_id, readingTime);
          }
        });
        
        (latestCoolBreeze || []).forEach((reading: any) => {
          const existing = readingsByMachine.get(reading.machine_id);
          const readingTime = new Date(reading.timestamp);
          if (!existing || readingTime > existing) {
            readingsByMachine.set(reading.machine_id, readingTime);
          }
        });
        
        // Check alliance table for latest timestamps (if it exists)
        const { data: latestAlliance, error: allianceError } = await supabase
          .from('alliance')
          .select('machine_id, timestamp')
          .in('machine_id', machineIds)
          .order('timestamp', { ascending: false });
        
        // Handle table-not-found errors: suppress 404 errors, but log other errors
        if (allianceError) {
          if (allianceError.code === 'PGRST205' || allianceError.message?.includes('Could not find the table') || allianceError.message?.includes('does not exist')) {
            // Table doesn't exist - this is a 404 that needs to be fixed by creating the table
            // For now, treat as empty data (0 readings)
            console.debug('[useMachineData] alliance table does not exist yet - showing 0 readings');
          } else {
            // Other errors (permissions, etc.) - log but continue
            console.warn('[useMachineData] Error fetching alliance timestamps:', allianceError);
          }
        }
        
        (latestAlliance || []).forEach((reading: any) => {
          const existing = readingsByMachine.get(reading.machine_id);
          const readingTime = new Date(reading.timestamp);
          if (!existing || readingTime > existing) {
            readingsByMachine.set(reading.machine_id, readingTime);
          }
        });
        
        // Copy to latestTimestamps map
        readingsByMachine.forEach((timestamp, machineId) => {
          latestTimestamps.set(machineId, timestamp);
        });
      }

      // Helper function to calculate connection status from latest timestamp
      const calculateConnectionStatus = (machineId: string, latestTimestamps: Map<string, Date>): boolean => {
        const latestTimestamp = latestTimestamps.get(machineId);
        if (!latestTimestamp) {
          return false; // No readings = disconnected
        }
        
        const now = new Date();
        const minutesSinceLastReading = (now.getTime() - latestTimestamp.getTime()) / (1000 * 60);
        
        // Connected if last reading was within 5 minutes
        return minutesSinceLastReading <= 5;
      };

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
      
      // Transform machines
      let visibleMachines: MachineStatus[] = [];
      
      if (userRole === 'super_admin') {
        // Super admin sees all machines
        visibleMachines = (allMachines || []).map((m: any) => mapMachine(m, notifPrefsMap, latestTimestamps));
      } else if (userRole === 'company') {
        // Company sees their machines and all installer/client machines under them
        const company = transformedUsers.find(u => u.id === userId);
        const installers = transformedUsers.filter(u => u.role === 'installer' && u.parentId === userId);
        const installerIds = installers.map(i => i.id);
        const clients = transformedUsers.filter(u => u.role === 'client' && installerIds.includes(u.parentId || ''));
        const clientIds = clients.map(c => c.id);
        
        const filteredMachines = (allMachines || []).filter(m => 
          m.owner_id === userId || installerIds.includes(m.owner_id) || clientIds.includes(m.owner_id)
        );

        visibleMachines = filteredMachines.map((m: any) => mapMachine(m, notifPrefsMap, latestTimestamps));
      } else if (userRole === 'installer') {
        // Installer sees their machines and client machines
        const clients = transformedUsers.filter(u => u.role === 'client' && u.parentId === userId);
        const clientIds = clients.map(c => c.id);

        visibleMachines = (allMachines || [])
          .filter(m => m.owner_id === userId || clientIds.includes(m.owner_id))
          .map((m: any) => mapMachine(m, notifPrefsMap, latestTimestamps));
      } else {
        // Client sees only their machines
        visibleMachines = (allMachines || [])
          .filter(m => m.owner_id === userId)
          .map((m: any) => mapMachine(m, notifPrefsMap, latestTimestamps));
      }

      // Fetch real historical data for each machine (24h period by default)
      const visibleMachineIds = visibleMachines.map(m => m.id);
      const realHistoricalData = await fetchHistoricalDataForMachines(visibleMachineIds, '24h');

      setMachines(visibleMachines);
      setUsers(transformedUsers);
      setHistoricalData(realHistoricalData);
      hasLoadedOnceRef.current = true;
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    hasLoadedOnceRef.current = false;
    void fetchData();
  }, [fetchData, userId]);

  const refetch = useCallback(() => {
    void fetchData({ background: true });
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
