// src/employee-app/inventory/components/TabNavigation.tsx
import React from 'react';
import { Flame, Calendar, Package, Database, BarChart3, AlertTriangle } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getOutOfStockItems } from '../consumptionAnalytics';

const TabNavigation: React.FC = () => {
  const { currentTab, switchTab, dailyItems, weeklyItems, monthlyItems, databaseItems } = useInventory();

  // Calculate out of stock count
  const outOfStockCount = React.useMemo(() => {
    const outOfStockItems = getOutOfStockItems(dailyItems, weeklyItems, monthlyItems);
    return outOfStockItems.length;
  }, [dailyItems, weeklyItems, monthlyItems]);

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
      label: 'Daily Reports',
      icon: BarChart3,
      count: 0,
      color: 'purple'
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
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={getTabClasses(tab.id, tab.color)}
              style={{ minWidth: 'max-content' }}
            >
              <Icon className="w-5 h-5 mr-2" />
              {tab.label}
              <span className={getBadgeClasses(tab.id, tab.color)}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;
