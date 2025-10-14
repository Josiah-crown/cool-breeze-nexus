import { useState, useEffect } from 'react';
import { MachineStatus, MachineHistoricalData, MachineType } from '@/types/machine';

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

  useEffect(() => {
    // Generate mock machines based on user role
    const mockMachines: MachineStatus[] = [];
    
    if (userRole === 'super_admin') {
      // Super admin sees all machines
      mockMachines.push(
        {
          id: '1',
          name: 'Factory Fan Unit A',
          type: 'fan',
          ownerId: '2',
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
          id: '2',
          name: 'Warehouse Heat Pump',
          type: 'heatpump',
          ownerId: '3',
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
          id: '3',
          name: 'Office AC System',
          type: 'airconditioner',
          ownerId: '3',
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
        }
      );
    } else if (userRole === 'admin') {
      // Admin sees machines they added
      mockMachines.push(
        {
          id: '1',
          name: 'Factory Fan Unit A',
          type: 'fan',
          ownerId: userId,
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
        }
      );
    } else {
      // Client sees their own machines
      mockMachines.push(
        {
          id: '4',
          name: 'My Cooling Fan',
          type: 'fan',
          ownerId: userId,
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
        }
      );
    }

    setMachines(mockMachines);

    // Generate historical data for each machine
    const historical: Record<string, MachineHistoricalData> = {};
    mockMachines.forEach(machine => {
      historical[machine.id] = {
        power: generateHistoricalData(machine.power, 100),
        deltaT: generateHistoricalData(machine.deltaT, 2),
        motorTemp: generateHistoricalData(machine.motorTemp, 5)
      };
    });
    setHistoricalData(historical);
  }, [userId, userRole]);

  return { machines, historicalData };
};
