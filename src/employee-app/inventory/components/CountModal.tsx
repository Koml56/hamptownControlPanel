// src/employee-app/inventory/components/CountModal.tsx
import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { InventoryFrequency } from '../../types';
import ScrollPicker from './ScrollPicker';
import EmployeeSelector, { loadSelectedEmployee, saveSelectedEmployee } from './EmployeeSelector';

interface CountModalProps {
  frequency: InventoryFrequency;
  selectedItemId?: number | string | null;
  onClose: () => void;
}

const CountModal: React.FC<CountModalProps> = ({ frequency, selectedItemId, onClose }) => {
  const { dailyItems, weeklyItems, monthlyItems, employees, updateItemStock } = useInventory();
  const [selectedItem, setSelectedItem] = useState('');
  const [currentCount, setCurrentCount] = useState(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [notes, setNotes] = useState('');
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);

  // Get items based on frequency
  const getItems = () => {
    switch (frequency) {
      case 'daily': return dailyItems;
      case 'weekly': return weeklyItems;
      case 'monthly': return monthlyItems;
      default: return [];
    }
  };

  const items = getItems();

  // Load saved employee on component mount
  useEffect(() => {
    const savedEmployee = loadSelectedEmployee();
    if (savedEmployee && employees.length > 0) {
      // Verify the saved employee still exists in the current employee list
      const employee = employees.find(emp => emp.id === savedEmployee.id);
      if (employee) {
        setSelectedEmployeeId(savedEmployee.id);
        setSelectedEmployeeName(savedEmployee.name);
      } else {
        // If saved employee doesn't exist, default to first employee
        const firstEmployee = employees[0];
        if (firstEmployee) {
          setSelectedEmployeeId(firstEmployee.id);
          setSelectedEmployeeName(firstEmployee.name);
          saveSelectedEmployee(firstEmployee.id, firstEmployee.name);
        }
      }
    } else if (employees.length > 0) {
      // No saved employee, default to first employee
      const firstEmployee = employees[0];
      setSelectedEmployeeId(firstEmployee.id);
      setSelectedEmployeeName(firstEmployee.name);
      saveSelectedEmployee(firstEmployee.id, firstEmployee.name);
    }
  }, [employees]);

  useEffect(() => {
    if (selectedItemId) {
      const item = items.find(i => i.id === selectedItemId);
      if (item) {
        setSelectedItem(selectedItemId.toString());
        setCurrentCount(item.currentStock);
      }
    }
  }, [selectedItemId, items]);

  const handleSubmit = () => {
    if (!selectedItem || currentCount < 0) {
      alert('Please select an item and enter a valid count!');
      return;
    }

    if (!selectedEmployeeName) {
      alert('Please select an employee!');
      return;
    }

    updateItemStock(
      selectedItem, 
      currentCount, 
      frequency, 
      selectedEmployeeName, 
      notes
    );
    
    onClose();
  };

  const handleEmployeeSelect = (employeeId: number, employeeName: string) => {
    setSelectedEmployeeId(employeeId);
    setSelectedEmployeeName(employeeName);
  };

  const selectedItemData = items.find(i => i.id.toString() === selectedItem);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Update Current Count</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Item</label>
            <select 
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                const item = items.find(i => i.id.toString() === e.target.value);
                if (item) setCurrentCount(item.currentStock);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose an item...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (Currently: {item.currentStock} {item.unit})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Count</label>
            <ScrollPicker
              value={currentCount}
              onChange={setCurrentCount}
              min={0}
              max={Math.max(100, (selectedItemData?.currentStock || 0) + 20)}
            />
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <button
              type="button"
              onClick={() => setShowEmployeeSelector(!showEmployeeSelector)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between text-left"
            >
              <span>
                {selectedEmployeeName || 'Select Employee'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            <EmployeeSelector
              employees={employees}
              selectedEmployeeId={selectedEmployeeId}
              onEmployeeSelect={handleEmployeeSelect}
              isOpen={showEmployeeSelector}
              onClose={() => setShowEmployeeSelector(false)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea 
              rows={2} 
              placeholder="Any notes about the count..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          <button 
            onClick={handleSubmit}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Update Count
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountModal;
