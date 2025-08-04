// src/employee-app/inventory/components/DailyView.tsx
import React, { useState } from 'react';
import { Edit3, Trash2, Search } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import ItemCard from './ItemCard';
import CountModal from './CountModal';
import WasteModal from './WasteModal';
import { formatDate } from '../utils';

const DailyView: React.FC = () => {
  const { dailyItems, activityLog } = useInventory();
  const [showCountModal, setShowCountModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Debug logging for daily items
  React.useEffect(() => {
    console.log('🏠 DailyView: Received dailyItems:', dailyItems.length, 'items');
    console.log('📋 Daily items details:', dailyItems.map(item => ({
      id: item.id,
      databaseId: item.databaseId,
      name: item.name,
      category: item.category
    })));
  }, [dailyItems]);

  // Filter items
  const filteredItems = dailyItems.filter(item => {
    const matchesType = typeFilter === 'all' || item.category === typeFilter;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleUpdateCount = (itemId: number | string) => {
    setSelectedItemId(itemId);
    setShowCountModal(true);
  };

  const handleReportWaste = (itemId: number | string) => {
    setSelectedItemId(itemId);
    setShowWasteModal(true);
  };

  // Get today's activity
  const todayActivity = activityLog.filter(entry => {
    const entryDate = new Date(entry.timestamp).toDateString();
    const today = new Date().toDateString();
    return entryDate === today;
  }).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">🔥</span>
          Daily High-Usage Items - <span className="text-red-600">{formatDate(new Date())}</span>
        </h2>
        <p className="text-gray-600 mb-4">At the end of each day, count and update current quantities for high-usage items</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => setShowCountModal(true)}
            className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <Edit3 className="w-5 h-5 mr-2" />
            Update Current Count
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

      {/* Daily Items Grid */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Daily Usage Items</h3>
            
            {/* Filters - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="tukku">🏪 Tukku (Wholesale)</option>
                <option value="beverages">🥤 Beverages</option>
                <option value="packaging">📦 Packaging</option>
                <option value="produce">🥬 Produce</option>
                <option value="meat">🥩 Meat & Fish</option>
                <option value="dairy">🥛 Dairy</option>
              </select>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search daily items..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-48 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Results Summary */}
          {(searchQuery || typeFilter !== 'all') && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredItems.length} of {dailyItems.length} daily items
              {searchQuery && ` matching "${searchQuery}"`}
              {typeFilter !== 'all' && ` in ${typeFilter} category`}
            </div>
          )}
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

      {/* Today's Activity */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Today's Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {todayActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📋</div>
                <p>No activity recorded for today</p>
              </div>
            ) : (
              todayActivity.map(activity => {
                let typeIcon, typeColor, typeText;
                
                switch(activity.type) {
                  case 'count_update':
                    typeIcon = '📝'; typeColor = 'blue'; typeText = 'Count Updated';
                    break;
                  case 'waste':
                    typeIcon = '🗑️'; typeColor = 'red'; typeText = 'Waste';
                    break;
                  default:
                    typeIcon = '📦'; typeColor = 'gray'; typeText = 'Activity';
                }
                
                return (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`bg-${typeColor}-100 p-2 rounded-lg mr-3`}>
                        <span className={`text-${typeColor}-600`}>{typeIcon}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{typeText}: {activity.item}</div>
                        <div className="text-sm text-gray-600">
                          {activity.employee} • {activity.timestamp}
                          {activity.notes && ` • ${activity.notes}`}
                          {activity.reason && ` (${activity.reason})`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-700">{activity.quantity} {activity.unit}</div>
                      <div className="text-xs text-gray-500">{activity.type}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCountModal && (
        <CountModal 
          frequency="daily"
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowCountModal(false);
            setSelectedItemId(null);
          }} 
        />
      )}
      {showWasteModal && (
        <WasteModal 
          frequency="daily"
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

export default DailyView;
