// src/employee-app/inventory/components/WasteModal.tsx
import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { InventoryFrequency, WasteReason } from '../../types';
import EmployeeSelector, { initializeEmployeeSelection, saveSelectedEmployee } from './EmployeeSelector';

interface WasteModalProps {
  frequency: InventoryFrequency;
  selectedItemId?: number | string | null;
  onClose: () => void;
}

const WasteModal: React.FC<WasteModalProps> = ({ frequency, selectedItemId, onClose }) => {
  const { dailyItems, weeklyItems, monthlyItems, employees, currentUser, reportWaste } = useInventory();
  const [selectedItem, setSelectedItem] = useState('');
  const [wasteAmount, setWasteAmount] = useState('');
  const [reason, setReason] = useState<WasteReason>('expired');
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

  // Initialize employee selection based on global currentUser
  useEffect(() => {
    const selection = initializeEmployeeSelection(currentUser, employees);
    if (selection) {
      setSelectedEmployeeId(selection.id);
      setSelectedEmployeeName(selection.name);
      saveSelectedEmployee(selection.id, selection.name);
    }
  }, [currentUser, employees]);

  useEffect(() => {
    if (selectedItemId) {
      setSelectedItem(selectedItemId.toString());
    }
  }, [selectedItemId]);

  const handleSubmit = () => {
    const amount = parseFloat(wasteAmount);

    if (!selectedItem || !wasteAmount || amount <= 0) {
      alert('Please select an item and enter a valid waste amount!');
      return;
    }

    if (!selectedEmployeeName) {
      alert('Please select an employee!');
      return;
    }

    const item = items.find(i => i.id.toString() === selectedItem);
    
    if (!item) {
      alert('Item not found!');
      return;
    }

    if (amount > item.currentStock) {
      alert('Waste amount cannot exceed current stock!');
      return;
    }

    reportWaste(
      selectedItem, 
      amount, 
      reason, 
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
          <h3 className="text-lg font-semibold text-gray-800">Report Waste</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Item</label>
            <select 
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose an item...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (Available: {item.currentStock} {item.unit})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Waste Amount {selectedItemData?.box ? '(boxes)' : ''}
            </label>
            <input 
              type="number" 
              min="0" 
              step={selectedItemData?.box ? "0.1" : "1"}
              placeholder={selectedItemData?.box ? "e.g., 0.5" : "Enter waste amount"}
              value={wasteAmount}
              onChange={(e) => setWasteAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedItemData?.box && (
              <div className="mt-1 text-xs text-gray-500">
                This item uses fractional quantities (e.g., 0.5, 1.5, 2.5 boxes)
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Waste Reason</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value as WasteReason)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="expired">Expired/Spoiled</option>
              <option value="overcooked">Overcooked</option>
              <option value="dropped">Dropped/Contaminated</option>
              <option value="overordered">Over-ordered</option>
              <option value="customer-return">Customer Return</option>
              <option value="other">Other</option>
            </select>
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
              placeholder="Details about the waste..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          <button 
            onClick={handleSubmit}
            className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Report Waste
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

export default WasteModal;
