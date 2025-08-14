// src/employee-app/inventory/components/TabNavigation.tsx
import React, { useState } from 'react';
import { Flame, Calendar, Package, Database, BarChart3, AlertTriangle, Clock, Lock } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getOutOfStockItems } from '../consumptionAnalytics';
import { ADMIN_PASSWORD } from '../../constants';

const TabNavigation: React.FC = () => {
  const { currentTab, switchTab, dailyItems, weeklyItems, monthlyItems, databaseItems, stockCountSnapshots } = useInventory();
  
  // Admin authentication state - persistent across sessions
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('inventoryAdminSession') === 'true';
    } catch {
      return false;
    }
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Calculate out of stock count
  const outOfStockCount = React.useMemo(() => {
    const outOfStockItems = getOutOfStockItems(dailyItems, weeklyItems, monthlyItems);
    return outOfStockItems.length;
  }, [dailyItems, weeklyItems, monthlyItems]);

  // Check if tab requires admin access
  const isAdminTab = (tabId: string) => {
    return ['database', 'reports', 'stock-history'].includes(tabId);
  };

  // Handle admin authentication
  const handleAdminLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      try {
        localStorage.setItem('inventoryAdminSession', 'true');
      } catch (error) {
        console.error('Failed to save admin session:', error);
      }
      setShowPasswordModal(false);
      setPasswordInput('');
      
      // Switch to pending tab if available
      if (pendingTab) {
        switchTab(pendingTab as any);
        setPendingTab(null);
      }
    } else {
      alert('Invalid password!');
      setPasswordInput('');
    }
  };

  // Handle tab click with admin protection
  const handleTabClick = (tabId: string) => {
    if (isAdminTab(tabId) && !isAdmin) {
      setPendingTab(tabId);
      setShowPasswordModal(true);
    } else {
      switchTab(tabId as any);
    }
  };

  const tabs = [
    {
      id: 'daily' as const,
      label: 'Daily Items',
      icon: Flame,
      count: dailyItems.length,
      color: 'red'
    },
    {
      id: 'weekly' as const,
      label: 'Weekly Items', 
      icon: Calendar,
      count: weeklyItems.length,
      color: 'yellow'
    },
    {
      id: 'monthly' as const,
      label: 'Monthly Items',
      icon: Package,
      count: monthlyItems.length,
      color: 'green'
    },
    {
      id: 'outofstock' as const,
      label: 'Out of Stock',
      icon: AlertTriangle,
      count: outOfStockCount,
      color: 'orange'
    },
    {
      id: 'database' as const,
      label: 'Items Database',
      icon: Database,
      count: databaseItems.length,
      color: 'blue'
    },
    {
      id: 'reports' as const,
      label: 'Analytics',
      icon: BarChart3,
      count: 0,
      color: 'purple'
    },
    {
      id: 'stock-history' as const,
      label: 'Stock History',
      icon: Clock,
      count: stockCountSnapshots.length,
      color: 'indigo'
    }
  ];

  const getTabClasses = (tabId: string, color: string) => {
    const isActive = currentTab === tabId;
    const baseClasses = "flex-shrink-0 flex items-center justify-center px-4 py-3 rounded-lg transition-all font-medium whitespace-nowrap";
    
    if (isActive) {
      return `${baseClasses} bg-${color}-500 text-white`;
    }
    return `${baseClasses} text-gray-600 hover:bg-gray-100`;
  };

  const getBadgeClasses = (tabId: string, color: string) => {
    const isActive = currentTab === tabId;
    
    if (isActive) {
      return `ml-2 bg-${color}-600 px-2 py-1 rounded-full text-xs`;
    }
    return "ml-2 bg-gray-300 text-gray-700 px-2 py-1 rounded-full text-xs";
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm mb-6 p-2 overflow-x-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', overflowX: 'auto'}}>
        <div 
          className="flex space-x-2" 
          style={{
            width: 'max-content',
            minWidth: '100%'
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isProtected = isAdminTab(tab.id);
            const shouldShow = !isProtected || isAdmin;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={getTabClasses(tab.id, tab.color)}
                style={{ 
                  minWidth: 'max-content',
                  display: shouldShow ? 'flex' : 'none'
                }}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
                {isProtected && <Lock className="w-3 h-3 ml-1" />}
                <span className={getBadgeClasses(tab.id, tab.color)}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Admin Access Required</h3>
            <p className="text-gray-600 mb-4">Enter admin password to access protected sections:</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Enter password..."
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={handleAdminLogin}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Access
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setPendingTab(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TabNavigation;
