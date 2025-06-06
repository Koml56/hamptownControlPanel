// AdminPanel.tsx
import React, { useState } from 'react';
import { Users, CheckSquare, Plus, Trash2, Edit3, Save, Settings, UserPlus, Star, ShoppingBag, Package } from 'lucide-react';
import { getMoodColor } from './utils';
import { 
  addEmployee, 
  removeEmployee, 
  updateEmployee,
  addTask,
  updateTask,
  removeTask,
  addCustomRole,
  removeCustomRole
} from './adminFunctions';
import type { Employee, Task, Priority, StoreItem } from './types';

interface AdminPanelProps {
  employees: Employee[];
  tasks: Task[];
  customRoles: string[];
  storeItems: StoreItem[];
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  setCustomRoles: (updater: (prev: string[]) => string[]) => void;
  setStoreItems: (updater: (prev: StoreItem[]) => StoreItem[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  employees,
  tasks,
  customRoles,
  storeItems,
  setEmployees,
  setTasks,
  setCustomRoles,
  setStoreItems
}) => {
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [showStoreManagement, setShowStoreManagement] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('Cleaner');
  const [newRoleName, setNewRoleName] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editingStoreItem, setEditingStoreItem] = useState<number | null>(null);
  
  // Store item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'food' | 'break' | 'reward' | 'social'>('food');
  const [newItemIcon, setNewItemIcon] = useState('🎁');

  const handleAddEmployee = () => {
    addEmployee(
      newEmployeeName,
      newEmployeeRole,
      employees,
      setEmployees,
      setNewEmployeeName,
      setNewEmployeeRole
    );
  };

  const handleAddTask = () => {
    addTask(tasks, setTasks, setEditingTask);
  };

  const handleAddRole = () => {
    addCustomRole(newRoleName, customRoles, setCustomRoles, setNewRoleName);
  };

  // Store management functions
  const handleAddStoreItem = () => {
    if (newItemName.trim() && newItemDescription.trim() && newItemCost.trim()) {
      const newItem: StoreItem = {
        id: Math.max(...storeItems.map(item => item.id), 0) + 1,
        name: newItemName.trim(),
        description: newItemDescription.trim(),
        cost: parseInt(newItemCost) || 10,
        category: newItemCategory,
        icon: newItemIcon,
        available: true
      };
      setStoreItems(prev => [...prev, newItem]);
      setNewItemName('');
      setNewItemDescription('');
      setNewItemCost('');
      setNewItemCategory('food');
      setNewItemIcon('🎁');
    }
  };

  const handleUpdateStoreItem = (id: number, field: keyof StoreItem, value: any) => {
    setStoreItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveStoreItem = (id: number) => {
    if (window.confirm('Are you sure you want to remove this store item?')) {
      setStoreItems(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Management */}
      <div className={`bg-white rounded-xl shadow-sm mb-6 ${showRoleManagement ? 'p-6' : 'p-2'}`}>
        <button
          onClick={() => setShowRoleManagement(!showRoleManagement)}
          className={`w-full flex items-center justify-between hover:text-gray-600 ${
            showRoleManagement 
              ? 'text-lg font-semibold text-gray-800 mb-4' 
              : 'text-sm font-medium text-gray-700 py-1'
          }`}
        >
          <div className="flex items-center">
            <Settings className={`mr-2 ${showRoleManagement ? 'w-5 h-5' : 'w-4 h-4'}`} />
            Role Management
          </div>
          <span className={`transition-transform ${showRoleManagement ? 'text-xl rotate-180' : 'text-sm'}`}>
            ▼
          </span>
        </button>
        
        {showRoleManagement && (
          <>
            {/* Add Role */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-3">Add New Role</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Role name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddRole}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Role List */}
            <div className="space-y-2">
              {customRoles.map(role => (
                <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{role}</span>
                  <button
                    onClick={() => removeCustomRole(role, employees, setCustomRoles)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="Remove role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Store Management */}
      <div className={`bg-white rounded-xl shadow-sm mb-6 ${showStoreManagement ? 'p-6' : 'p-2'}`}>
        <button
          onClick={() => setShowStoreManagement(!showStoreManagement)}
          className={`w-full flex items-center justify-between hover:text-gray-600 ${
            showStoreManagement 
              ? 'text-lg font-semibold text-gray-800 mb-4' 
              : 'text-sm font-medium text-gray-700 py-1'
          }`}
        >
          <div className="flex items-center">
            <ShoppingBag className={`mr-2 ${showStoreManagement ? 'w-5 h-5' : 'w-4 h-4'}`} />
            Store Management
          </div>
          <span className={`transition-transform ${showStoreManagement ? 'text-xl rotate-180' : 'text-sm'}`}>
            ▼
          </span>
        </button>
        
        {showStoreManagement && (
          <>
            {/* Add Store Item */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-3">Add New Store Item</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Free Coffee"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost (Points)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="food">Food & Drinks</option>
                    <option value="break">Time Off</option>
                    <option value="reward">Rewards</option>
                    <option value="social">Social</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <input
                    type="text"
                    placeholder="🎁"
                    value={newItemIcon}
                    onChange={(e) => setNewItemIcon(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g., Get a free coffee from the kitchen"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={handleAddStoreItem}
                    className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 flex items-center justify-center"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Add Store Item
                  </button>
                </div>
              </div>
            </div>

            {/* Store Items List */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Current Store Items</h4>
              {storeItems.map(item => (
                <div key={item.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                        {editingStoreItem === item.id ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateStoreItem(item.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        ) : (
                          <div className="font-medium text-gray-800 flex items-center">
                            <span className="text-lg mr-2">{item.icon}</span>
                            {item.name}
                          </div>
                        )}
                      </div>
                      
                      {/* Cost */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cost</label>
                        {editingStoreItem === item.id ? (
                          <input
                            type="number"
                            min="1"
                            value={item.cost}
                            onChange={(e) => handleUpdateStoreItem(item.id, 'cost', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        ) : (
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-purple-500 mr-1" />
                            <span className="font-medium text-purple-600">{item.cost} pts</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Category */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                        {editingStoreItem === item.id ? (
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateStoreItem(item.id, 'category', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="food">Food & Drinks</option>
                            <option value="break">Time Off</option>
                            <option value="reward">Rewards</option>
                            <option value="social">Social</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.category === 'food' ? 'bg-orange-100 text-orange-700' :
                            item.category === 'break' ? 'bg-blue-100 text-blue-700' :
                            item.category === 'reward' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {item.category}
                          </span>
                        )}
                      </div>
                      
                      {/* Available Status */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <button
                          onClick={() => handleUpdateStoreItem(item.id, 'available', !item.available)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.available 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {item.available ? 'Available' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      {editingStoreItem === item.id ? (
                        <button
                          onClick={() => setEditingStoreItem(null)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingStoreItem(item.id)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveStoreItem(item.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    {editingStoreItem === item.id ? (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateStoreItem(item.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                  </div>
                  
                  {/* Icon Editor */}
                  {editingStoreItem === item.id && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                      <input
                        type="text"
                        value={item.icon}
                        onChange={(e) => handleUpdateStoreItem(item.id, 'icon', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                        placeholder="🎁"
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {storeItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No store items yet. Add your first item above!
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Employee Management */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Employee Management
        </h3>
        
        {/* Add Employee */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-3">Add New Employee</h4>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Employee name"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newEmployeeRole}
              onChange={(e) => setNewEmployeeRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {customRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button
              onClick={handleAddEmployee}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2 text-left">Name</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Role</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Points</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Mood</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Last Updated</th>
                <th className="border border-gray-200 px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">
                    {editingEmployee === emp.id ? (
                      <input
                        type="text"
                        value={emp.name}
                        onChange={(e) => updateEmployee(emp.id, 'name', e.target.value, setEmployees)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      emp.name
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {editingEmployee === emp.id ? (
                      <select
                        value={emp.role}
                        onChange={(e) => updateEmployee(emp.id, 'role', e.target.value, setEmployees)}
                        className="w-full px-2 py-1 border rounded"
                      >
                        {customRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      emp.role
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-purple-500 mr-1" />
                      <span className="font-medium text-purple-600">{emp.points}</span>
                    </div>
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${getMoodColor(emp.mood)}`} />
                      {emp.mood}/5
                    </div>
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                    {emp.lastUpdated}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <div className="flex gap-2 justify-center">
                      {editingEmployee === emp.id ? (
                        <button
                          onClick={() => setEditingEmployee(null)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingEmployee(emp.id)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeEmployee(emp.id, setEmployees)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Management */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <CheckSquare className="w-5 h-5 mr-2" />
            Task Management
          </h3>
          <button
            onClick={handleAddTask}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </button>
        </div>

        {/* Task Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2 text-left">Task</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Location</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Priority</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Points</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Est. Time</th>
                <th className="border border-gray-200 px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">
                    {editingTask === task.id ? (
                      <input
                        type="text"
                        value={task.task}
                        onChange={(e) => updateTask(task.id, 'task', e.target.value, setTasks)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      task.task
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {editingTask === task.id ? (
                      <input
                        type="text"
                        value={task.location}
                        onChange={(e) => updateTask(task.id, 'location', e.target.value, setTasks)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      task.location
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {editingTask === task.id ? (
                      <select
                        value={task.priority}
                        onChange={(e) => updateTask(task.id, 'priority', e.target.value, setTasks)}
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {editingTask === task.id ? (
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={task.points}
                        onChange={(e) => updateTask(task.id, 'points', e.target.value, setTasks)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-purple-500 mr-1" />
                        <span className="font-medium text-purple-600">{task.points}</span>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    {editingTask === task.id ? (
                      <input
                        type="text"
                        value={task.estimatedTime}
                        onChange={(e) => updateTask(task.id, 'estimatedTime', e.target.value, setTasks)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      task.estimatedTime
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">
                    <div className="flex gap-2 justify-center">
                      {editingTask === task.id ? (
                        <button
                          onClick={() => setEditingTask(null)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingTask(task.id)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeTask(task.id, setTasks)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;