// useRealTimeSync.ts - React hook for the new sync system
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { realTimeSync } from './RealTimeSync';

interface SyncHookReturn<T> {
  data: T | null;
  isLoading: boolean;
  isConnected: boolean;
  connectedDevices: number;
  updateData: (newData: T) => void;
  error: string | null;
}

/**
 * React hook for real-time data synchronization
 * Replaces Firebase sync for specified data types
 */
export function useRealTimeSync<T>(
  dataType: string,
  initialData: T | null = null
): SyncHookReturn<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [connectedDevices, setConnectedDevices] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  const isInitialized = useRef(false);
  const lastUpdateRef = useRef<number>(0);
  
  // Subscribe to data changes
  useEffect(() => {
    let mounted = true;
    
    const handleDataChange = (newData: T) => {
      if (!mounted) return;
      
      // Prevent update loops by checking timestamp
      const now = Date.now();
      if (now - lastUpdateRef.current < 100) {
        return;
      }
      
      console.log(`📱 [useRealTimeSync] ${dataType} updated:`, newData);
      setData(newData);
      setIsLoading(false);
      setError(null);
    };
    
    try {
      realTimeSync.subscribe(dataType, handleDataChange);
      setIsConnected(true);
      
      // Update connected devices count
      const updateDeviceCount = () => {
        if (mounted) {
          setConnectedDevices(realTimeSync.getConnectedDevicesCount());
        }
      };
      
      updateDeviceCount();
      const deviceCountInterval = setInterval(updateDeviceCount, 2000);
      
      isInitialized.current = true;
      
      return () => {
        mounted = false;
        clearInterval(deviceCountInterval);
        realTimeSync.unsubscribe(dataType);
      };
    } catch (err) {
      console.error(`Failed to subscribe to ${dataType}:`, err);
      setError(err instanceof Error ? err.message : 'Sync error');
      setIsConnected(false);
      setIsLoading(false);
    }
  }, [dataType]);
  
  // Update data function
  const updateData = useCallback((newData: T) => {
    try {
      lastUpdateRef.current = Date.now();
      setData(newData);
      realTimeSync.updateData(dataType, newData, 'update');
      setError(null);
      
      console.log(`📤 [useRealTimeSync] ${dataType} sent:`, newData);
    } catch (err) {
      console.error(`Failed to update ${dataType}:`, err);
      setError(err instanceof Error ? err.message : 'Update error');
    }
  }, [dataType]);
  
  return {
    data,
    isLoading,
    isConnected,
    connectedDevices,
    updateData,
    error
  };
}

/**
 * Hook specifically for completed tasks with conflict-free merging
 */
export function useCompletedTasksSync(initialTasks: number[] = []) {
  const { data, updateData, ...rest } = useRealTimeSync<number[]>('completedTasks', initialTasks);
  
  // FIXED: Ensure data is always an array, handle corrupted object format from sync
  const normalizedData = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    
    // Handle corrupted object format: {"0": 1, "timestamp": ..., "deviceId": ...}
    if (typeof data === 'object' && data !== null) {
      console.warn('🔧 [SYNC-FIX] Converting corrupted completedTasks object to array:', data);
      
      // Extract numeric keys and their values, ignore metadata
      const tasks: number[] = [];
      Object.keys(data).forEach(key => {
        const numKey = parseInt(key, 10);
        if (!isNaN(numKey) && typeof (data as any)[key] === 'number') {
          tasks.push((data as any)[key]);
        }
      });
      return tasks;
    }
    
    console.warn('🔧 [SYNC-FIX] Unknown completedTasks format, using empty array:', data);
    return [];
  }, [data]);
  
  const addCompletedTask = useCallback((taskId: number) => {
    const currentTasks = normalizedData || [];
    if (!currentTasks.includes(taskId)) {
      const newTasks = [...currentTasks, taskId];
      updateData(newTasks);
    }
  }, [normalizedData, updateData]);
  
  const removeCompletedTask = useCallback((taskId: number) => {
    const currentTasks = normalizedData || [];
    const newTasks = currentTasks.filter(id => id !== taskId);
    updateData(newTasks);
  }, [normalizedData, updateData]);
  
  const toggleTask = useCallback((taskId: number) => {
    const currentTasks = normalizedData || [];
    if (currentTasks.includes(taskId)) {
      removeCompletedTask(taskId);
    } else {
      addCompletedTask(taskId);
    }
  }, [normalizedData, addCompletedTask, removeCompletedTask]);
  
  return {
    completedTasks: normalizedData || [],
    addCompletedTask,
    removeCompletedTask,
    toggleTask,
    updateData,
    ...rest
  };
}

/**
 * Hook for prep selections with smart merging
 */
export function usePrepSelectionsSync(initialSelections: any = {}) {
  const { data, updateData, ...rest } = useRealTimeSync<any>('prepSelections', initialSelections);
  
  const updatePrepSelection = useCallback((prepId: string, selection: any) => {
    const currentSelections = data || {};
    const newSelections = {
      ...currentSelections,
      [prepId]: {
        ...selection,
        timestamp: Date.now()
      }
    };
    updateData(newSelections);
  }, [data, updateData]);
  
  const removePrepSelection = useCallback((prepId: string) => {
    const currentSelections = data || {};
    const newSelections = { ...currentSelections };
    delete newSelections[prepId];
    updateData(newSelections);
  }, [data, updateData]);
  
  return {
    prepSelections: data || {},
    updatePrepSelection,
    removePrepSelection,
    updateData,
    ...rest
  };
}

/**
 * Hook for scheduled preps with ID-based merging
 */
export function useScheduledPrepsSync(initialPreps: any[] = []) {
  const { data, updateData, ...rest } = useRealTimeSync<any[]>('scheduledPreps', initialPreps);
  
  // FIXED: Ensure data is always an array, handle corrupted object format from sync
  const normalizedData = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    
    // Handle corrupted object format: {"0": Object, "timestamp": ..., "deviceId": ...}
    if (typeof data === 'object' && data !== null) {
      console.warn('🔧 [SYNC-FIX] Converting corrupted scheduledPreps object to array:', data);
      
      // Extract numeric keys and their values, ignore metadata
      const preps: any[] = [];
      Object.keys(data).forEach(key => {
        const numKey = parseInt(key, 10);
        if (!isNaN(numKey) && typeof (data as any)[key] === 'object') {
          preps.push((data as any)[key]);
        }
      });
      return preps;
    }
    
    console.warn('🔧 [SYNC-FIX] Unknown scheduledPreps format, using empty array:', data);
    return [];
  }, [data]);
  
  const addScheduledPrep = useCallback((prep: any) => {
    const currentPreps = normalizedData || [];
    const newPrep = {
      ...prep,
      timestamp: Date.now(),
      id: prep.id || Date.now()
    };
    
    // Replace existing prep with same ID or add new one
    const newPreps = currentPreps.filter(p => p.id !== newPrep.id);
    newPreps.push(newPrep);
    
    updateData(newPreps);
  }, [normalizedData, updateData]);
  
  const updateScheduledPrep = useCallback((prepId: number, updates: any) => {
    const currentPreps = normalizedData || [];
    const newPreps = currentPreps.map(prep => 
      prep.id === prepId 
        ? { ...prep, ...updates, timestamp: Date.now() }
        : prep
    );
    updateData(newPreps);
  }, [normalizedData, updateData]);
  
  const removeScheduledPrep = useCallback((prepId: number) => {
    const currentPreps = normalizedData || [];
    const newPreps = currentPreps.filter(prep => prep.id !== prepId);
    updateData(newPreps);
  }, [normalizedData, updateData]);
  
  return {
    scheduledPreps: normalizedData || [],
    addScheduledPrep,
    updateScheduledPrep,
    removeScheduledPrep,
    updateData,
    ...rest
  };
}

/**
 * Hook for task assignments with timestamp-based resolution
 */
export function useTaskAssignmentsSync(initialAssignments: any = {}) {
  const { data, updateData, ...rest } = useRealTimeSync<any>('taskAssignments', initialAssignments);
  
  const assignTask = useCallback((taskId: number, employeeId: number) => {
    const currentAssignments = data || {};
    const newAssignments = {
      ...currentAssignments,
      [taskId]: {
        employeeId,
        assignedAt: new Date().toISOString(),
        timestamp: Date.now()
      }
    };
    updateData(newAssignments);
  }, [data, updateData]);
  
  const unassignTask = useCallback((taskId: number) => {
    const currentAssignments = data || {};
    const newAssignments = { ...currentAssignments };
    delete newAssignments[taskId];
    updateData(newAssignments);
  }, [data, updateData]);
  
  return {
    taskAssignments: data || {},
    assignTask,
    unassignTask,
    updateData,
    ...rest
  };
}

/**
 * Sync status hook to show connection info
 */
export function useSyncStatus() {
  const [connectedDevices, setConnectedDevices] = useState(1);
  const [isConnected, setIsConnected] = useState(true);
  const [deviceList, setDeviceList] = useState<any[]>([]);
  
  useEffect(() => {
    const updateStatus = () => {
      setConnectedDevices(realTimeSync.getConnectedDevicesCount());
      setDeviceList(realTimeSync.getConnectedDevices());
      setIsConnected(true);
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    connectedDevices,
    isConnected,
    deviceList
  };
}