// src/employee-app/inventory/components/TabNavigation.tsx
import React from 'react';
import { Flame, Calendar, Package, Database, BarChart3, AlertTriangle, Clock, Lock } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getOutOfStockItems } from '../consumptionAnalytics';

const TabNavigation: React.FC = () => {
  const { currentTab, switchTab, dailyItems, weeklyItems, monthlyItems, databaseItems, stockCountSnapshots, dailyInventorySnapshots, activityLog, isAdmin } = useInventory();

  // Calculate out of stock count
  const outOfStockCount = React.useMemo(() => {
    const outOfStockItems = getOutOfStockItems(dailyItems, weeklyItems, monthlyItems);
    return outOfStockItems.length;
  }, [dailyItems, weeklyItems, monthlyItems]);

  // Calculate analytics count - number of today's activity log entries or daily snapshots available
  const analyticsCount = React.useMemo(() => {
    // Try to count today's activity log entries first
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const todayEntries = (activityLog || []).filter(entry => {
      if (!entry?.timestamp) return false;
      const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
      return entryDate === today;
    });
    
    // If we have today's entries, return that count, otherwise return snapshot count
    return todayEntries.length > 0 ? todayEntries.length : (dailyInventorySnapshots || []).length;
  }, [activityLog, dailyInventorySnapshots]);

  // Check if tab requires admin access
  const isAdminTab = (tabId: string) => {
    return ['database', 'reports', 'stock-history'].includes(tabId);
  };

  // Handle tab click - now simply switches tabs since admin state comes from main app
  const handleTabClick = (tabId: string) => {
    switchTab(tabId as any);
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
      count: analyticsCount,
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

    </>
  );
};

export default TabNavigation;
