// src/employee-app/inventory/components/WeeklyView.tsx
import React, { useState } from 'react';
import { Edit3, Trash2, Search } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import ItemCard from './ItemCard';
import CountModal from './CountModal';
import WasteModal from './WasteModal';

const WeeklyView: React.FC = () => {
  const { weeklyItems } = useInventory();
  const [showCountModal, setShowCountModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = weeklyItems.filter(item => 
    !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateCount = (itemId: number | string) => {
    setSelectedItemId(itemId);
    setShowCountModal(true);
  };

  const handleReportWaste = (itemId: number | string) => {
    setSelectedItemId(itemId);
    setShowWasteModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📅</span>
          Weekly Reorder Items
        </h2>
        <p className="text-gray-600 mb-4">Items counted and updated weekly</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => setShowCountModal(true)}
            className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <Edit3 className="w-5 h-5 mr-2" />
            Weekly Count
          </button>
          <button 
            onClick={() => setShowWasteModal(true)}
            className="bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Report Waste
          </button>
        </div>
      </div>

      {/* Weekly Items */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Weekly Items Status</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search weekly items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
              />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onUpdateCount={handleUpdateCount}
                onReportWaste={handleReportWaste}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCountModal && (
        <CountModal 
          frequency="weekly"
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowCountModal(false);
            setSelectedItemId(null);
          }} 
        />
      )}
      {showWasteModal && (
        <WasteModal 
          frequency="weekly"
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowWasteModal(false);
            setSelectedItemId(null);
          }} 
        />
      )}
    </div>
  );
};

export default WeeklyView;

// src/employee-app/inventory/components/MonthlyView.tsx
import React, { useState } from 'react';
import { Edit3, Trash2, Search } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import ItemCard from './ItemCard';
import CountModal from './CountModal';
import WasteModal from './WasteModal';

const MonthlyView: React.FC = () => {
  const { monthlyItems } = useInventory();
  const [showCountModal, setShowCountModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = monthlyItems.filter(item => 
    !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateCount = (itemId: number | string) => {
    setSelectedItemId(itemId);
    setShowCountModal(true);
  };

  const handleReportWaste = (itemId: number | string) => {
    setSelectedItemId(itemId);
    setShowWasteModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📦</span>
          Monthly Bulk Items
        </h2>
        <p className="text-gray-600 mb-4">Items counted and updated monthly</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => setShowCountModal(true)}
            className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <Edit3 className="w-5 h-5 mr-2" />
            Monthly Count
          </button>
          <button 
            onClick={() => setShowWasteModal(true)}
            className="bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Report Waste
          </button>
        </div>
      </div>

      {/* Monthly Items */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Monthly Items Inventory</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search monthly items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
              />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onUpdateCount={handleUpdateCount}
                onReportWaste={handleReportWaste}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCountModal && (
        <CountModal 
          frequency="monthly"
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowCountModal(false);
            setSelectedItemId(null);
          }} 
        />
      )}
      {showWasteModal && (
        <WasteModal 
          frequency="monthly"
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowWasteModal(false);
            setSelectedItemId(null);
          }} 
        />
      )}
    </div>
  );
};

export default MonthlyView;

// src/employee-app/inventory/components/ReportsView.tsx
import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus } from '../utils';

const ReportsView: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, activityLog } = useInventory();

  // Calculate statistics
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalItems = allItems.filter(item => getStockStatus(item) === 'critical');
  const lowStockItems = allItems.filter(item => getStockStatus(item) === 'low');
  const totalValue = allItems.reduce((sum, item) => sum + (item.cost * item.currentStock), 0);
  
  // Activity statistics
  const todayActivity = activityLog.filter(entry => {
    const entryDate = new Date(entry.timestamp).toDateString();
    const today = new Date().toDateString();
    return entryDate === today;
  });

  const wasteToday = todayActivity
    .filter(entry => entry.type === 'waste')
    .reduce((sum, entry) => sum + entry.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{allItems.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Items</p>
              <p className="text-2xl font-bold text-red-600">{criticalItems.length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">€{totalValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Waste Today</p>
              <p className="text-2xl font-bold text-orange-600">{wasteToday}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Critical Items Alert */}
      {criticalItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Critical Stock Items</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticalItems.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg">
                <div className="font-medium text-gray-800">{item.name}</div>
                <div className="text-sm text-red-600">
                  Current: {item.currentStock} {item.unit} | Min: {item.minLevel} {item.unit}
                </div>
                <div className="text-xs text-gray-500 mt-1">{item.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {activityLog.slice(0, 10).map(activity => {
              let typeIcon, typeColor, typeText;
              
              switch(activity.type) {
                case 'count_update':
                  typeIcon = '📝'; typeColor = 'blue'; typeText = 'Count Updated';
                  break;
                case 'waste':
                  typeIcon = '🗑️'; typeColor = 'red'; typeText = 'Waste Reported';
                  break;
                case 'import':
                  typeIcon = '📊'; typeColor = 'green'; typeText = 'Excel Import';
                  break;
                case 'manual_add':
                  typeIcon = '➕'; typeColor = 'purple'; typeText = 'Manual Add';
                  break;
                default:
                  typeIcon = '📦'; typeColor = 'gray'; typeText = 'Activity';
              }
              
              return (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`bg-${typeColor}-100 p-2 rounded-lg mr-3`}>
                      <span>{typeIcon}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{typeText}: {activity.item}</div>
                      <div className="text-sm text-gray-600">
                        {activity.employee} • {activity.timestamp}
                        {activity.notes && ` • ${activity.notes}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-700">{activity.quantity} {activity.unit}</div>
                    <div className="text-xs text-gray-500">{activity.type}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
