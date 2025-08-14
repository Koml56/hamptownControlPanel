// src/employee-app/inventory/components/ItemCard.tsx
import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { InventoryItem } from '../../types';
import { getCategoryIcon } from '../utils';
import { getStockStatus } from '../stockUtils';

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
  const stockStatus = getStockStatus(item.currentStock, item.minLevel);
  const status = stockStatus; // This is now a string directly
  const stockColor = stockStatus === 'out' ? 'red' :
                     stockStatus === 'critical' ? 'orange' :
                     stockStatus === 'low' ? 'yellow' : 'green';
  
  const getStatusClasses = () => {
    switch (status) {
      case 'out':
        return 'bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-600';
      case 'critical':
        return 'bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500';
      case 'low':
        return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500';
      default:
        return 'bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500';
    }
  };

  const getStockTextColor = () => {
    switch (status) {
      case 'out': return 'text-red-700';
      case 'critical': return 'text-orange-600';
      case 'low': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'out':
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium animate-pulse">🛑 Out of Stock</span>;
      case 'critical':
        return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium animate-pulse">🚨 Critical</span>;
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
          <div className="text-lg font-medium text-gray-700">
            {item.minLevel} {item.unit}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs text-gray-600">
        <div>
          <span className="font-medium">Cost:</span> €{item.cost.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Last Used:</span> {item.lastUsed}
        </div>
      </div>

      {/* EAN Code if available */}
      {item.ean && (
        <div className="mb-4 text-xs text-gray-500">
          <span className="font-medium">EAN:</span> {item.ean}
        </div>
      )}

      {/* Action Buttons */}
      {showQuickActions && (
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateCount(item.id)}
            className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Update Count
          </button>
          <button
            onClick={() => onReportWaste(item.id)}
            className="flex-1 flex items-center justify-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Report Waste
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemCard;
