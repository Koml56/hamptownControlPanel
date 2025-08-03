// src/employee-app/inventory/components/WasteModal.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { InventoryFrequency, WasteReason } from '../../types';

interface WasteModalProps {
  frequency: InventoryFrequency;
  selectedItemId?: number | string | null;
  onClose: () => void;
}

const WasteModal: React.FC<WasteModalProps> = ({ frequency, selectedItemId, onClose }) => {
  const { dailyItems, weeklyItems, monthlyItems, reportWaste } = useInventory();
  const [selectedItem, setSelectedItem] = useState('');
  const [wasteAmount, setWasteAmount] = useState('');
  const [reason, setReason] = useState<WasteReason>('expired');
  const [employee, setEmployee] = useState('1');
  const [notes, setNotes] = useState('');

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

    const item = items.find(i => i.id.toString() === selectedItem);
    
    if (!item) {
      alert('Item not found!');
      return;
    }

    if (amount > item.currentStock) {
      alert('Waste amount cannot exceed current stock!');
      return;
    }

    const employeeNames = {
      '1': 'John Smith',
      '2': 'Sarah Johnson', 
      '3': 'Mike Wilson',
      '4': 'Emily Davis'
    };

    reportWaste(
      selectedItem, 
      amount, 
      reason, 
      frequency, 
      employeeNames[employee as keyof typeof employeeNames], 
      notes
    );
    
    onClose();
  };

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Waste Amount</label>
            <input 
              type="number" 
              min="0" 
              step="0.1" 
              placeholder="Enter waste amount"
              value={wasteAmount}
              onChange={(e) => setWasteAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select 
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">John Smith - Kitchen</option>
              <option value="2">Sarah Johnson - Prep</option>
              <option value="3">Mike Wilson - Grill</option>
              <option value="4">Emily Davis - Pantry</option>
            </select>
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
