import { useState, useEffect } from 'react';
import { MachineStatus, MachineHistoricalData, MachineType } from '@/types/machine';

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

// Mock user hierarchy
const MOCK_USERS: UserHierarchy[] = [
  { id: '1', name: 'Super Admin', email: 'super@admin.com', role: 'super_admin' },
  { id: '2', name: 'Admin User', email: 'admin@test.com', role: 'admin' },
  { id: '3', name: 'Client User', email: 'client@test.com', role: 'client', parentId: '2' },
  { id: '4', name: 'Client Two', email: 'client2@test.com', role: 'client', parentId: '2' },
];

// All machines in the system
const ALL_MACHINES: Omit<MachineStatus, 'id'>[] = [
  {
    name: 'Factory Fan Unit A',
    type: 'fan',
    ownerId: '2', // Admin's machine
    isOn: true,
    hasWater: true,
    isCooling: true,
    fanActive: true,
    motorTemp: 65,
    outsideTemp: 32,
    insideTemp: 24,
    deltaT: 8,
    current: 5.2,
    voltage: 230,
    power: 1196,
    overallStatus: 'good',
    motorStatus: 'normal'
  },
  {
    name: 'Warehouse Heat Pump',
    type: 'heatpump',
    ownerId: '3', // Client 1's machine
    isOn: true,
    hasWater: true,
    isCooling: false,
    fanActive: false,
    motorTemp: 55,
    outsideTemp: 28,
    insideTemp: 22,
    deltaT: 6,
    current: 3.8,
    voltage: 230,
    power: 874,
    overallStatus: 'good',
    motorStatus: 'normal'
  },
  {
    name: 'Office AC System',
    type: 'airconditioner',
    ownerId: '3', // Client 1's machine
    isOn: true,
    hasWater: true,
    isCooling: true,
    fanActive: true,
    motorTemp: 72,
    outsideTemp: 35,
    insideTemp: 21,
    deltaT: 14,
    current: 6.5,
    voltage: 230,
    power: 1495,
    overallStatus: 'warning',
    motorStatus: 'warning'
  },
  {
    name: 'Storage Cooling Fan',
    type: 'fan',
    ownerId: '4', // Client 2's machine
    isOn: false,
    hasWater: false,
    isCooling: false,
    fanActive: false,
    motorTemp: 45,
    outsideTemp: 30,
    insideTemp: 30,
    deltaT: 0,
    current: 0,
    voltage: 230,
    power: 0,
    overallStatus: 'error',
    motorStatus: 'normal'
  },
  {
    name: 'Manufacturing Heat Pump',
    type: 'heatpump',
    ownerId: '4', // Client 2's machine
    isOn: true,
    hasWater: true,
    isCooling: true,
    fanActive: true,
    motorTemp: 68,
    outsideTemp: 33,
    insideTemp: 23,
    deltaT: 10,
    current: 4.2,
    voltage: 230,
    power: 966,
    overallStatus: 'good',
    motorStatus: 'normal'
  }
];

export const useMachineData = (userId: string, userRole: string) => {
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [historicalData, setHistoricalData] = useState<Record<string, MachineHistoricalData>>({});
  const [users, setUsers] = useState<UserHierarchy[]>([]);

  useEffect(() => {
    // Set available users based on role
    let availableUsers: UserHierarchy[] = [];
    let visibleMachines: MachineStatus[] = [];
    
    if (userRole === 'super_admin') {
      // Super admin sees all users and all machines
      availableUsers = MOCK_USERS;
      visibleMachines = ALL_MACHINES.map((m, idx) => ({ ...m, id: `machine-${idx}` }));
    } else if (userRole === 'admin') {
      // Admin sees themselves and their clients
      availableUsers = MOCK_USERS.filter(u => 
        u.id === userId || u.parentId === userId
      );
      // Admin sees their own machines and their clients' machines
      const userIds = availableUsers.map(u => u.id);
      visibleMachines = ALL_MACHINES
        .filter(m => userIds.includes(m.ownerId))
        .map((m, idx) => ({ ...m, id: `machine-${idx}` }));
    } else {
      // Client sees only themselves
      availableUsers = MOCK_USERS.filter(u => u.id === userId);
      // Client sees only their own machines
      visibleMachines = ALL_MACHINES
        .filter(m => m.ownerId === userId)
        .map((m, idx) => ({ ...m, id: `machine-${idx}` }));
    }

    setUsers(availableUsers);
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
  }, [userId, userRole]);

  return { machines, historicalData, users };
};
