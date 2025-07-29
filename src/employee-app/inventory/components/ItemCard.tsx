// src/employee-app/inventory/components/ItemCard.tsx
import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { InventoryItem } from '../types';
import { getCategoryIcon, getStockStatus } from '../utils';

interface ItemCardProps {
  item: InventoryItem;
  onUpdateCount: (itemId: number | string) => void;
  onReportWaste: (itemId: number | string) => void;
  showQuickActions?: boolean;
}

const ItemCard: React.FC<ItemCardProps> = ({ 
  item, 
  onUpdateCount, 
  onReportWaste, 
  showQuickActions = true 
}) => {
  const status = getStockStatus(item);
  
  const getStatusClasses = () => {
    switch (status) {
      case 'critical':
        return 'bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500';
      case 'low':
        return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500';
      default:
        return 'bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500';
    }
  };

  const getStockTextColor = () => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'low': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'critical':
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium animate-pulse">🚨 Critical</span>;
      case 'low':
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">⚠️ Low Stock</span>;
      default:
        return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">✅ Good Stock</span>;
    }
  };

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${getStatusClasses()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getCategoryIcon(item.category)}</span>
          <div>
            <h4 className="font-semibold text-gray-800">{item.name}</h4>
            <p className="text-sm text-gray-600 capitalize">{item.category}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>
      
      {/* Stock Information */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Current Count</div>
          <div className={`text-lg font-bold ${getStockTextColor()}`}>
            {item.currentStock} {item.unit}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Min Level</div>
          <div className="text-lg font-medium text-gray-700">{item.minLevel} {item.unit}</div>
        </div>
      </div>
      
      {/* Quick Actions */}
      {showQuickActions && (
        <div className="flex gap-2">
          <button 
            onClick={() => onUpdateCount(item.id)}
            className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Update Count
          </button>
          <button 
            onClick={() => onReportWaste(item.id)}
            className="bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Last updated: {item.lastUsed}</span>
          <span>€{item.cost.toFixed(2)}/{item.unit}</span>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
