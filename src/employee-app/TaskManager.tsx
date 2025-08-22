// TaskManager.tsx - Updated to use RealTimeSync for reliable cross-tab synchronization
import React, { useEffect } from 'react';
import { CheckSquare, Users, Star } from 'lucide-react';
import { getPriorityColor, getFormattedDate } from './utils';
import { getAssignedEmployee } from './taskFunctions';
import type { Task, Employee, TaskAssignments, DailyDataMap, CurrentUser } from './types';
import CrossTabDebugPanel from './CrossTabDebugPanel';
import CheckboxButton from './components/CheckboxButton';
import { useCompletedTasksSync, useTaskAssignmentsSync } from './useRealTimeSync';

interface TaskManagerProps {
  currentUser: CurrentUser;
  tasks: Task[];
  employees: Employee[];
  taskAssignments: TaskAssignments;
  dailyData: DailyDataMap;
  setTaskAssignments: (updater: (prev: TaskAssignments) => TaskAssignments) => void;
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void;
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  saveToFirebase?: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({
  currentUser,
  tasks,
  employees,
  taskAssignments,
  dailyData,
  setTaskAssignments,
  setDailyData,
  setEmployees,
  saveToFirebase
}) => {
  // Use new real-time sync hooks
  const { 
    completedTasks, 
    toggleTask, 
    connectedDevices,
    isConnected 
  } = useCompletedTasksSync([]);
  
  const { 
    taskAssignments: syncedTaskAssignments, 
    assignTask,
    unassignTask 
  } = useTaskAssignmentsSync(taskAssignments);

  // Sync task assignments changes back to parent
  useEffect(() => {
    setTaskAssignments(() => syncedTaskAssignments);
  }, [syncedTaskAssignments, setTaskAssignments]);

  // Debug logging
  useEffect(() => {
    console.log('📋 TaskManager - completedTasks updated:', {
      count: completedTasks.length,
      tasks: completedTasks,
      timestamp: new Date().toLocaleTimeString(),
      connectedDevices
    });
  }, [completedTasks, connectedDevices]);

  const handleTaskToggle = (taskId: number, assignToEmployeeId?: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCurrentlyCompleted = completedTasks.includes(taskId);
    const employeeId = assignToEmployeeId || currentUser.id;

    console.log(`🔄 TaskManager - handling task ${taskId} toggle:`, {
      isCurrentlyCompleted,
      employeeId,
      taskName: task.task
    });

    if (isCurrentlyCompleted) {
      // Task is completed, mark as uncompleted
      toggleTask(taskId);
      
      // Update daily data to remove completion
      const todayStr = getFormattedDate(new Date());
      setDailyData(prev => {
        const newData = { ...prev };
        if (newData[todayStr]) {
          newData[todayStr] = {
            ...newData[todayStr],
            completedTasks: newData[todayStr].completedTasks.filter(
              (completion: any) => completion.taskId !== taskId
            )
          };
        }
        return newData;
      });
    } else {
      // Task is not completed, mark as completed
      toggleTask(taskId);
      
      // Assign task if not already assigned
      if (!syncedTaskAssignments[taskId]) {
        assignTask(taskId, employeeId);
      }
      
      // Update employee points and daily data
      const todayStr = getFormattedDate(new Date());
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, points: emp.points + task.points }
          : emp
      ));
      
      setDailyData(prev => ({
        ...prev,
        [todayStr]: {
          ...(prev[todayStr] || { completedTasks: [], employeeMoods: [], purchases: [], totalTasks: 0, completionRate: 0 }),
          completedTasks: [
            ...(prev[todayStr]?.completedTasks || []),
            {
              taskId,
              employeeId,
              completedAt: new Date().toISOString(),
              taskName: task.task,
              date: todayStr,
              pointsEarned: task.points
            }
          ]
        }
      }));
    }

    // Save to Firebase if needed
    if (saveToFirebase) {
      saveToFirebase();
    }
  };

  const handleAssignTask = (taskId: number, employeeId: number) => {
    const isCompleted = completedTasks.includes(taskId);
    
    console.log(`🔄 TaskManager - assigning task ${taskId} to employee ${employeeId}:`, {
      isCompleted,
      currentAssignment: syncedTaskAssignments[taskId]
    });
    
    if (isCompleted) {
      // Task is completed - need to transfer points to new employee
      const currentAssignedEmployee = syncedTaskAssignments[taskId];
      if (currentAssignedEmployee && currentAssignedEmployee !== employeeId) {
        // Handle reassignment for completed task
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          // Remove points from current employee and add to new employee
          setEmployees(prev => prev.map(emp => 
            emp.id === currentAssignedEmployee 
              ? { ...emp, points: emp.points - task.points }
              : emp.id === employeeId
              ? { ...emp, points: emp.points + task.points }
              : emp
          ));
          
          // Update daily data
          const todayStr = getFormattedDate(new Date());
          setDailyData(prev => {
            const newData = { ...prev };
            if (newData[todayStr]) {
              newData[todayStr] = {
                ...newData[todayStr],
                completedTasks: newData[todayStr].completedTasks.map((completion: any) => 
                  completion.taskId === taskId 
                    ? { ...completion, employeeId }
                    : completion
                )
              };
            }
            return newData;
          });
        }
      }
    }
    
    // Update task assignment
    assignTask(taskId, employeeId);
    
    if (saveToFirebase) {
      saveToFirebase();
    }
  };

  const currentEmployee = employees.find(emp => emp.id === currentUser.id);
  
  // Calculate today's points earned by current user from completed tasks
  const todayStr = getFormattedDate(new Date());
  const todayData = dailyData[todayStr];
  const todayPointsEarned = todayData?.completedTasks
    ?.filter((completion: any) => completion.employeeId === currentUser.id)
    ?.reduce((sum: number, completion: any) => sum + (completion.pointsEarned || 0), 0) || 0;

  return (
    <>
      {/* Task Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200">
          <div className="text-3xl font-bold text-green-600 mb-1">{completedTasks.length}</div>
          <div className="text-sm font-medium text-green-700">Completed</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border border-orange-200">
          <div className="text-3xl font-bold text-orange-600 mb-1">{tasks.length - completedTasks.length}</div>
          <div className="text-sm font-medium text-orange-700">Pending</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
          <div className="text-3xl font-bold text-purple-600 mb-1">{currentEmployee?.points || 0}</div>
          <div className="text-sm font-medium text-purple-700">Your Points</div>
        </div>
      </div>

      {/* Sync Status */}
      {connectedDevices > 1 && (
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-3 mb-4 text-white">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>Real-time sync active • {connectedDevices} devices connected</span>
          </div>
        </div>
      )}

      {/* Points Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Today's Points</h3>
            <div className="text-2xl font-bold">{todayPointsEarned} pts earned</div>
          </div>
          <Star className="w-8 h-8 opacity-80" />
        </div>
      </div>

      {/* Cleaning Tasks */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <CheckSquare className="w-5 h-5 mr-2" />
          Cleaning Tasks
        </h3>
        <div className="space-y-4">
          {tasks.map(task => {
            const assignedEmp = getAssignedEmployee(task.id, syncedTaskAssignments, employees);
            const isCompleted = completedTasks.includes(task.id);
            
            return (
              <div key={task.id} className={`border rounded-lg p-4 transition-all duration-300 ease-in-out ${getPriorityColor(task.priority)} ${
                isCompleted 
                  ? 'bg-green-50 border-green-200 shadow-sm transform scale-[0.98]' 
                  : 'bg-white hover:shadow-md hover:-translate-y-0.5'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`font-medium transition-all duration-200 ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {task.task}
                      </div>
                      <div className="flex items-center bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm font-medium">
                        <Star className="w-3 h-3 mr-1" />
                        {task.points} pts
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">📍 {task.location}</div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {task.priority} priority
                      </div>
                      <div className="text-xs text-gray-500">
                        ⏱️ {task.estimatedTime}
                      </div>
                    </div>
                  </div>
                  <CheckboxButton
                    checked={isCompleted}
                    onClick={() => handleTaskToggle(task.id)}
                    title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    className="ml-3"
                    variant="blue"
                    size="medium"
                  />
                </div>
                
                <div className="mt-3">
                  {assignedEmp && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Users className="w-4 h-4 mr-1" />
                      Assigned to: <span className="font-medium ml-1">{assignedEmp.name}</span>
                      {isCompleted && (
                        <span className="ml-2 text-green-600 font-medium">
                          (+{task.points} pts earned!)
                        </span>
                      )}
                    </div>
                  )}
                  {!assignedEmp && (
                    <div className="text-sm text-gray-600 mb-2">
                      {isCompleted ? 'Reassign to:' : 'Assign to:'}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {employees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => handleAssignTask(task.id, emp.id)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${
                          assignedEmp?.id === emp.id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        title={
                          isCompleted && assignedEmp?.id !== emp.id 
                            ? `Transfer ${task.points} points from ${assignedEmp?.name || 'unassigned'} to ${emp.name}`
                            : `Assign task to ${emp.name}`
                        }
                      >
                        {emp.name}
                        <span className="ml-1 text-purple-600 font-medium">
                          ({emp.points}pts)
                        </span>
                        {isCompleted && assignedEmp?.id !== emp.id && (
                          <span className="ml-1">🔄</span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Visual indicator for completed task reassignment */}
                  {isCompleted && (
                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      💡 Tip: Click another employee's name to transfer the {task.points} points to them
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Cross-Tab Sync Debug Panel */}
      <CrossTabDebugPanel />
    </>
  );
};

export default TaskManager;
