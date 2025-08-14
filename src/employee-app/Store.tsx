// Store.tsx - Component for employees to browse and purchase rewards with points
import React, { useState, useMemo } from 'react';
import { ShoppingCart, Star, Gift, Coffee, Utensils, Trophy, Check, X } from 'lucide-react';
import type { StoreItem, Purchase, Employee, CurrentUser } from './types';

interface StoreProps {
  currentUser: CurrentUser;
  employees: Employee[];
  storeItems: StoreItem[];
  purchases: Purchase[];
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  setPurchases: (updater: (prev: Purchase[]) => Purchase[]) => void;
  quickSave: (field: string, data: any) => Promise<any>;
}

const Store: React.FC<StoreProps> = ({
  currentUser,
  employees,
  storeItems,
  purchases,
  setEmployees,
  setPurchases,
  quickSave
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [confirmingPurchase, setConfirmingPurchase] = useState<number | null>(null);

  // Get current employee data
  const currentEmployee = employees.find(emp => emp.id === currentUser.id);
  const userPoints = currentEmployee?.points || 0;

  // Get available store items
  const availableItems = storeItems.filter(item => item.available);
  
  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return availableItems;
    return availableItems.filter(item => item.category === selectedCategory);
  }, [availableItems, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(availableItems.map(item => item.category))];
    return cats;
  }, [availableItems]);

  // Get user's purchase history
  const userPurchases = purchases.filter(p => p.employeeId === currentUser.id)
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());

  const handlePurchase = async (item: StoreItem) => {
    if (userPoints < item.cost) {
      alert('Not enough points!');
      return;
    }

    if (!currentEmployee) return;

    // Create purchase record
    const newPurchase: Purchase = {
      id: Date.now(),
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      storeItemId: item.id,
      storeItemName: item.name,
      cost: item.cost,
      purchasedAt: new Date().toISOString(),
      fulfilled: false,
      notes: ''
    };

    // Update employee points
    setEmployees(prev => prev.map(emp => 
      emp.id === currentUser.id 
        ? { ...emp, points: emp.points - item.cost }
        : emp
    ));

    // Add purchase to history
    setPurchases(prev => [...prev, newPurchase]);

    // Save to Firebase
    await quickSave('employees', employees);
    await quickSave('purchases', [...purchases, newPurchase]);

    setConfirmingPurchase(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return <Utensils className="w-4 h-4" />;
      case 'drinks': return <Coffee className="w-4 h-4" />;
      case 'rewards': return <Trophy className="w-4 h-4" />;
      case 'gifts': return <Gift className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'food': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'drinks': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rewards': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'gifts': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (availableItems.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">Store Coming Soon!</h3>
            <p className="text-gray-400">
              The store is being set up. Check back later for rewards you can purchase with your points!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <ShoppingCart className="w-7 h-7 mr-3 text-blue-600" />
              Points Store
            </h2>
            <p className="text-gray-600 mt-1">Spend your points on rewards and treats!</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{userPoints}</div>
            <div className="text-sm text-gray-500">Your Points</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'All Items' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setShowPurchaseHistory(!showPurchaseHistory)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showPurchaseHistory ? 'Hide' : 'View'} Purchase History ({userPurchases.length})
        </button>
      </div>

      {/* Purchase History */}
      {showPurchaseHistory && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Purchase History</h3>
          {userPurchases.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No purchases yet!</p>
          ) : (
            <div className="space-y-3">
              {userPurchases.map(purchase => (
                <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">{purchase.storeItemName}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(purchase.purchasedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">-{purchase.cost} pts</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      purchase.fulfilled 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {purchase.fulfilled ? 'Fulfilled' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Store Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl">{item.icon}</div>
              <div className={`px-2 py-1 rounded-full text-xs border ${getCategoryColor(item.category)}`}>
                <span className="flex items-center">
                  {getCategoryIcon(item.category)}
                  <span className="ml-1">{item.category}</span>
                </span>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{item.description}</p>
            
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-blue-600">{item.cost} pts</div>
              
              {confirmingPurchase === item.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePurchase(item)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingPurchase(null)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingPurchase(item.id)}
                  disabled={userPoints < item.cost}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    userPoints >= item.cost
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {userPoints >= item.cost ? 'Purchase' : 'Not Enough Points'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Store;