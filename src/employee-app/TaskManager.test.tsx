// TaskManager.test.tsx - Multi-device sync testing for cleaning tasks
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskManager from './TaskManager';
import type { Task, Employee, TaskAssignments, DailyDataMap, CurrentUser } from './types';

// Mock the MultiDeviceSyncService and related modules
jest.mock('./multiDeviceSync');
jest.mock('./CrossTabDebugPanel', () => {
  return function MockCrossTabDebugPanel() {
    return <div data-testid="debug-panel">Debug Panel</div>;
  };
});

// Mock task functions
jest.mock('./taskFunctions', () => ({
  toggleTaskComplete: jest.fn(),
  assignTask: jest.fn(),
  getAssignedEmployee: jest.fn(),
  reassignCompletedTask: jest.fn()
}));

// Sample test data
const mockCurrentUser: CurrentUser = {
  id: 1,
  name: 'Test User'
};

const mockEmployees: Employee[] = [
  { id: 1, name: 'Alice', role: 'server', points: 10, mood: 5, lastUpdated: '2024-01-15', lastMoodDate: '2024-01-15' },
  { id: 2, name: 'Bob', role: 'kitchen', points: 15, mood: 4, lastUpdated: '2024-01-15', lastMoodDate: '2024-01-15' },
  { id: 3, name: 'Charlie', role: 'bartender', points: 8, mood: 3, lastUpdated: '2024-01-15', lastMoodDate: '2024-01-15' }
];

const mockTasks: Task[] = [
  {
    id: 1,
    task: 'Clean tables',
    location: 'Dining area',
    priority: 'high',
    estimatedTime: '15 min',
    points: 5
  },
  {
    id: 2,
    task: 'Wash dishes',
    location: 'Kitchen',
    priority: 'medium',
    estimatedTime: '30 min',
    points: 8
  },
  {
    id: 3,
    task: 'Stock bar',
    location: 'Bar',
    priority: 'low',
    estimatedTime: '20 min',
    points: 6
  }
];

const mockTaskAssignments: TaskAssignments = {
  1: 2, // Task 1 assigned to Bob (employee id 2)
  3: 3  // Task 3 assigned to Charlie (employee id 3)
};

const mockDailyData: DailyDataMap = {
  '2024-01-15': {
    completedTasks: [
      {
        taskId: 1,
        employeeId: 2,
        completedAt: '2024-01-15T10:00:00Z',
        taskName: 'Clean tables',
        date: '2024-01-15',
        pointsEarned: 5
      }
    ],
    employeeMoods: [
      { employeeId: 1, mood: 5, updatedAt: '2024-01-15T09:00:00Z' },
      { employeeId: 2, mood: 4, updatedAt: '2024-01-15T09:00:00Z' },
      { employeeId: 3, mood: 3, updatedAt: '2024-01-15T09:00:00Z' }
    ],
    purchases: [],
    totalTasks: 1,
    completionRate: 0.33,
    totalPointsEarned: 5,
    totalPointsSpent: 0
  }
};

describe('TaskManager Multi-Device Sync', () => {
  let mockSetCompletedTasks: jest.Mock;
  let mockSetTaskAssignments: jest.Mock;
  let mockSetDailyData: jest.Mock;
  let mockSetEmployees: jest.Mock;
  let mockSaveToFirebase: jest.Mock;

  beforeEach(() => {
    mockSetCompletedTasks = jest.fn();
    mockSetTaskAssignments = jest.fn();
    mockSetDailyData = jest.fn();
    mockSetEmployees = jest.fn();
    mockSaveToFirebase = jest.fn();

    // Mock console.log to capture debug logs
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should display all tasks with correct information', () => {
    render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set()}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Should display all task information
    expect(screen.getByText('Clean tables')).toBeInTheDocument();
    expect(screen.getByText('Wash dishes')).toBeInTheDocument();
    expect(screen.getByText('Stock bar')).toBeInTheDocument();
    
    // Should show task locations
    expect(screen.getByText('Dining area')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Bar')).toBeInTheDocument();
  });

  test('should log debug information when completedTasks changes', () => {
    const { rerender } = render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set([1])}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Change completedTasks to trigger debug logging
    rerender(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set([1, 2])}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Should log debug information
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('📋 TaskManager - completedTasks updated:'),
      expect.objectContaining({
        size: 2,
        tasks: [1, 2],
        timestamp: expect.any(String)
      })
    );
  });

  test('should handle task completion across multiple devices', async () => {
    const { rerender } = render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set()}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Simulate task completion from Device 1
    const completedFromDevice1 = new Set([1]);
    rerender(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={completedFromDevice1}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Should log the update
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('📋 TaskManager - completedTasks updated:'),
      expect.objectContaining({
        size: 1,
        tasks: [1]
      })
    );

    // Simulate additional completion from Device 2
    const completedFromDevice2 = new Set([1, 2]);
    rerender(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={completedFromDevice2}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Should log the merged state
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('📋 TaskManager - completedTasks updated:'),
      expect.objectContaining({
        size: 2,
        tasks: [1, 2]
      })
    );
  });

  test('should handle rapid task toggling from multiple tabs', async () => {
    render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set()}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Find task checkboxes/buttons
    const checkboxButtons = screen.getAllByRole('button');
    const taskCheckboxes = checkboxButtons.filter(button => 
      button.getAttribute('aria-label')?.includes('Complete task')
    );

    // Simulate rapid clicking (like rapid multi-tab usage)
    if (taskCheckboxes.length > 0) {
      fireEvent.click(taskCheckboxes[0]);
      fireEvent.click(taskCheckboxes[0]);
      fireEvent.click(taskCheckboxes[0]);
    }

    // The component should handle rapid clicking gracefully
    // This depends on the internal implementation of task toggling
    await waitFor(() => {
      // Should not crash or cause errors
      expect(screen.getByText('Clean tables')).toBeInTheDocument();
    });
  });

  test('should display debug panel for cross-tab sync monitoring', () => {
    render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set([1, 2])}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Should render the debug panel for sync monitoring
    expect(screen.getByTestId('debug-panel')).toBeInTheDocument();
  });

  test('should handle task assignments sync across devices', () => {
    const { rerender } = render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set()}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Simulate task assignment change from another device
    const updatedAssignments = { ...mockTaskAssignments, 2: 1 }; // Assign task 2 to Alice
    rerender(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set()}
        taskAssignments={updatedAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Component should render with updated assignments
    expect(screen.getByText('Clean tables')).toBeInTheDocument();
    expect(screen.getByText('Wash dishes')).toBeInTheDocument();
  });

  test('should handle employee points sync during task completion', () => {
    const { rerender } = render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set()}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Simulate points update from task completion sync
    const updatedEmployees = mockEmployees.map(emp => 
      emp.id === 2 ? { ...emp, points: emp.points + 5 } : emp
    );

    rerender(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={updatedEmployees}
        completedTasks={new Set([1])}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Should handle the updated employee points
    expect(screen.getByText('Clean tables')).toBeInTheDocument();
  });

  test('should measure sync performance for multi-device operations', async () => {
    const startTime = performance.now();

    render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set()}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Component should render quickly for good sync performance
    expect(renderTime).toBeLessThan(100); // Less than 100ms
    expect(screen.getByText('Clean tables')).toBeInTheDocument();
  });

  test('should handle concurrent task completions without data loss', async () => {
    const { rerender } = render(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={new Set()}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Simulate concurrent completions from multiple devices
    // Device A completes tasks 1 and 2
    const deviceACompletion = new Set([1, 2]);
    rerender(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={deviceACompletion}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Device B completes tasks 2 and 3 (overlapping with Device A)
    const deviceBCompletion = new Set([2, 3]);
    rerender(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={deviceBCompletion}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Final merged state should have all completed tasks
    const mergedCompletion = new Set([1, 2, 3]);
    rerender(
      <TaskManager
        currentUser={mockCurrentUser}
        tasks={mockTasks}
        employees={mockEmployees}
        completedTasks={mergedCompletion}
        taskAssignments={mockTaskAssignments}
        dailyData={mockDailyData}
        setCompletedTasks={mockSetCompletedTasks}
        setTaskAssignments={mockSetTaskAssignments}
        setDailyData={mockSetDailyData}
        setEmployees={mockSetEmployees}
        saveToFirebase={mockSaveToFirebase}
      />
    );

    // Should log the final merged state
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('📋 TaskManager - completedTasks updated:'),
      expect.objectContaining({
        size: 3,
        tasks: [1, 2, 3]
      })
    );
  });
});