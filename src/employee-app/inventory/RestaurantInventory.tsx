// src/employee-app/inventory/RestaurantInventory.tsx
import React from 'react';
import { InventoryProvider } from './InventoryContext';
import { InventoryTabProps } from './types';
import InventoryHeader from './components/InventoryHeader';
import TabNavigation from './components/TabNavigation';
import DatabaseView from './components/DatabaseView';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyView from './components/MonthlyView';
import ReportsView from './components/ReportsView';
import ToastContainer from './components/ToastContainer';
import { useInventory } from './InventoryContext';

const InventoryContent: React.FC = () => {
  const { currentTab } = useInventory();

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'daily':
        return <DailyView />;
      case 'weekly':
        return <WeeklyView />;
      case 'monthly':
        return <MonthlyView />;
      case 'database':
        return <DatabaseView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DailyView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <ToastContainer />
      
      <div className="max-w-7xl mx-auto">
        <InventoryHeader />
        <TabNavigation />
        {renderCurrentView()}
      </div>
    </div>
  );
};

const RestaurantInventory: React.FC<InventoryTabProps> = ({ currentUser, connectionStatus }) => {
  return (
    <InventoryProvider>
      <InventoryContent />
    </InventoryProvider>
  );
};

export default RestaurantInventory;
