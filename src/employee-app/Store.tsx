// Store.tsx
import React, { useState } from 'react';
import { ShoppingCart, Trophy, Clock, Gift, Users, Coffee, Star, History } from 'lucide-react';
import { purchaseItem, canAffordItem, getEmployeePoints, getEmployeePurchaseHistory, getLeaderboard } from './storeFunctions';
import type { Employee, StoreItem, DailyDataMap, CurrentUser, Purchase } from './types';

interface StoreProps {
  currentUser: CurrentUser;
  employees: Employee[];
  storeItems: StoreItem[];
  dailyData: DailyDataMap;
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void;
  saveToFirebase: () => void;
  quickSave: (field: string, data: any) => Promise<boolean>;
}

const Store: React.FC<StoreProps> = ({
  currentUser,
  employees,
  storeItems,
  dailyData,
  setEmployees,
  setDailyData,
  saveToFirebase,
  quickSave
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showHistory, setShowHistory] = useState(false);

  const currentEmployee = employees.find(emp => emp.id === currentUser.id);
  const userPoints = getEmployeePoints(currentUser.id, employees);
  const purchaseHistory = getEmployeePurchaseHistory(currentUser.id, dailyData);
  const leaderboard = getLeaderboard(employees);

  const categories = [
    { id: 'all', name: 'All Items', icon: '🛍️' },
    { id: 'food', name: 'Food & Drinks', icon: '🍽️' },
    { id: 'break', name: 'Time Off', icon: '⏰' },
    { id: 'reward', name: 'Rewards', icon: '🎁' },
    { id: 'social', name: 'Social', icon: '👥' }
  ];

  const filteredItems = activeCategory === 'all' 
    ? storeItems 
    : storeItems.filter(item => item.category === activeCategory);

  const handlePurchase = async (item: StoreItem) => {
    if (!currentEmployee) return;
    
    try {
      const success = purchaseItem(
        currentUser.id,
        item,
        employees,
        setEmployees,
        setDailyData,
        quickSave
      );
      
      if (success) {
        // Show success message with better feedback
        alert(`🎉 Successfully purchased: ${item.name}! Your purchase has been saved. Check with your manager to redeem.`);
        console.log(`✅ Purchase completed successfully: ${item.name} for ${item.cost} points`);
      }
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      alert(`❌ Sorry, your purchase failed due to a technical issue. Please try again.`);
    }
  };

  React.useEffect(() => {
    if (dailyData && Object.keys(dailyData).length > 0) {
      saveToFirebase();
    }
  }, [dailyData, saveToFirebase]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return <Coffee className="w-4 h-4" />;
      case 'break': return <Clock className="w-4 h-4" />;
      case 'reward': return <Gift className="w-4 h-4" />;
      case 'social': return <Users className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Points Dashboard */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Points</h2>
            <div className="text-4xl font-bold mt-2">{userPoints}</div>
            <div className="text-purple-100 text-sm">Available to spend</div>
          </div>
          <div className="text-6xl opacity-50">💎</div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-400">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <History className="w-4 h-4 mr-2" />
            Purchase History
          </button>
          <div className="text-right">
            <div className="text-sm text-purple-100">Your Rank</div>
            <div className="font-bold">
              #{leaderboard.findIndex(emp => emp.id === currentUser.id) + 1 || 'Unranked'}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Purchases</h3>
          {purchaseHistory.length > 0 ? (
            <div className="space-y-3">
              {purchaseHistory.slice(0, 10).map((purchase: Purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-lg mr-3">🛒</div>
                    <div>
                      <div className="font-medium text-gray-800">{purchase.itemName}</div>
                      <div className="text-sm text-gray-500">
                        {purchase.date} at {purchase.purchasedAt}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-600">-{purchase.cost} pts</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      purchase.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {purchase.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No purchases yet. Start earning points by completing tasks!
            </div>
          )}
        </div>
      )}

      {/* Category Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Store Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeCategory === category.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Store Items */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <ShoppingCart className="w-5 h-5 mr-2" />
          {activeCategory === 'all' ? 'All Items' : categories.find(c => c.id === activeCategory)?.name}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const canAfford = currentEmployee ? canAffordItem(currentEmployee, item) : false;
            
            return (
              <div
                key={item.id}
                className={`border rounded-lg p-4 transition-all ${
                  canAfford 
                    ? 'border-green-200 hover:border-green-300 hover:shadow-md' 
                    : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{item.icon}</div>
                  <div className="flex items-center">
                    {getCategoryIcon(item.category)}
                  </div>
                </div>
                
                <h4 className="font-semibold text-gray-800 mb-2">{item.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-purple-600">
                    {item.cost} pts
                  </div>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!canAfford || !item.available}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      canAfford && item.available
                        ? 'bg-purple-500 text-white hover:bg-purple-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {!item.available ? 'Unavailable' : 
                     canAfford ? 'Purchase' : 'Need more points'}
                  </button>
                </div>
                
                {!canAfford && item.available && (
                  <div className="mt-2 text-xs text-red-500">
                    Need {item.cost - userPoints} more points
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items available in this category
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Trophy className="w-5 h-5 mr-2" />
          Points Leaderboard
        </h3>
        
        <div className="space-y-3">
          {leaderboard.map((employee, index) => (
            <div
              key={employee.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                employee.id === currentUser.id 
                  ? 'bg-purple-50 border border-purple-200' 
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                  index === 0 ? 'bg-yellow-400 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-orange-400 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-800">
                    {employee.name}
                    {employee.id === currentUser.id && (
                      <span className="ml-2 text-purple-600 text-sm">(You)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{employee.role}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-600">{employee.points} pts</div>
                {index === 0 && <div className="text-xs text-yellow-600">👑 Top Performer</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Store;