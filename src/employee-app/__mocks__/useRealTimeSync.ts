// __mocks__/useRealTimeSync.ts - Mock for testing
export const useCompletedTasksSync = jest.fn(() => ({
  completedTasks: [],
  toggleTask: jest.fn(),
  connectedDevices: 1,
  isConnected: true,
  addCompletedTask: jest.fn(),
  removeCompletedTask: jest.fn(),
  updateData: jest.fn(),
  isLoading: false,
  error: null
}));

export const useTaskAssignmentsSync = jest.fn(() => ({
  taskAssignments: {},
  assignTask: jest.fn(),
  unassignTask: jest.fn(),
  updateData: jest.fn(),
  connectedDevices: 1,
  isConnected: true,
  isLoading: false,
  error: null
}));

export const usePrepSelectionsSync = jest.fn(() => ({
  prepSelections: {},
  updatePrepSelection: jest.fn(),
  removePrepSelection: jest.fn(),
  updateData: jest.fn(),
  connectedDevices: 1,
  isConnected: true,
  isLoading: false,
  error: null
}));

export const useScheduledPrepsSync = jest.fn(() => ({
  scheduledPreps: [],
  addScheduledPrep: jest.fn(),
  updateScheduledPrep: jest.fn(),
  removeScheduledPrep: jest.fn(),
  updateData: jest.fn(),
  connectedDevices: 1,
  isConnected: true,
  isLoading: false,
  error: null
}));

export const useSyncStatus = jest.fn(() => ({
  connectedDevices: 1,
  isConnected: true,
  deviceList: []
}));

export const useRealTimeSync = jest.fn(() => ({
  data: null,
  isLoading: false,
  isConnected: true,
  connectedDevices: 1,
  updateData: jest.fn(),
  error: null
}));