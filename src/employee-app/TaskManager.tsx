// TaskManager.tsx - Updated to handle point transfers on reassignment
import React from 'react';
import { CheckSquare, Check, Users, Star } from 'lucide-react';
import { getPriorityColor, getFormattedDate } from './utils';
import { toggleTaskComplete, assignTask, getAssignedEmployee, reassignCompletedTask } from './taskFunctions';
import type { Task, Employee, TaskAssignments, DailyDataMap, CurrentUser } from './types';

interface TaskManagerProps {
  currentUser: CurrentUser;
  tasks: Task[];
  employees: Employee[];
  completedTasks: Set<number>;
  taskAssignments: TaskAssignments;
  dailyData: DailyDataMap;
  setCompletedTasks: (tasks: Set<number>) => void;
  setTaskAssignments: (updater: (prev: TaskAssignments) => TaskAssignments) => void;
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void;
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({
  currentUser,
  tasks,
  employees,
  completedTasks,
  taskAssignments,
  dailyData,
  setCompletedTasks,
  setTaskAssignments,
  setDailyData,
  setEmployees
}) => {
  const handleTaskToggle = (taskId: number, assignToEmployeeId?: number) => {
    toggleTaskComplete(
      taskId,
      assignToEmployeeId,
      currentUser.id,
      completedTasks,
      taskAssignments,
      tasks,
      employees,
      setCompletedTasks,
      setTaskAssignments,
      setDailyData,
      setEmployees
    );
  };

  const handleAssignTask = (taskId: number, employeeId: number) => {
    const isCompleted = completedTasks.has(taskId);
    
    if (isCompleted) {
      // Task is completed - use reassignment function to transfer points
      reassignCompletedTask(
        taskId,
        employeeId,
        completedTasks,
        taskAssignments,
        tasks,
        employees,
        setTaskAssignments,
        setDailyData,
        setEmployees
      );
    } else {
      // Task is not completed - normal assignment
      assignTask(taskId, employeeId, setTaskAssignments);
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
          <div className="text-3xl font-bold text-green-600 mb-1">{completedTasks.size}</div>
          <div className="text-sm font-medium text-green-700">Completed</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border border-orange-200">
          <div className="text-3xl font-bold text-orange-600 mb-1">{tasks.length - completedTasks.size}</div>
          <div className="text-sm font-medium text-orange-700">Pending</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
          <div className="text-3xl font-bold text-purple-600 mb-1">{currentEmployee?.points || 0}</div>
          <div className="text-sm font-medium text-purple-700">Your Points</div>
        </div>
      </div>

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
            const assignedEmp = getAssignedEmployee(task.id, taskAssignments, employees);
            const isCompleted = completedTasks.has(task.id);
            
            return (
              <div key={task.id} className={`border rounded-lg p-4 ${getPriorityColor(task.priority)} ${isCompleted ? 'bg-green-50' : 'bg-white'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
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
                  <button
                    onClick={() => handleTaskToggle(task.id)}
                    className={`ml-3 p-2 rounded-full ${
                      isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
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
    </>
  );
};

export default TaskManager;
