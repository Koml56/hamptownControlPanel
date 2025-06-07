// DebugStoreTest.tsx - Add this temporarily to test store items
import React from 'react';
import { useFirebaseData } from './hooks';

const DebugStoreTest: React.FC = () => {
  const { storeItems, setStoreItems, saveToFirebase } = useFirebaseData();

  const addTestItem = () => {
    const newItem = {
      id: Math.max(...storeItems.map(item => item.id), 0) + 1,
      name: `Test Item ${Date.now()}`,
      description: 'This is a test item to verify Firebase saving',
      cost: 25,
      category: 'reward' as const,
      icon: '🧪',
      available: true
    };

    setStoreItems(prev => [...prev, newItem]);
    console.log('🧪 Test item added:', newItem);
    
    // Force immediate save
    setTimeout(() => {
      saveToFirebase();
      console.log('🔥 Forced Firebase save');
    }, 1000);
  };

  const logStoreItems = () => {
    console.log('🏪 Current store items:', storeItems);
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
      <h3 className="font-bold text-yellow-800 mb-2">🧪 Debug Store Items</h3>
      <div className="space-y-2">
        <div className="text-sm text-yellow-700">
          Store Items Count: {storeItems.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={addTestItem}
            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
          >
            Add Test Item
          </button>
          <button
            onClick={logStoreItems}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
          >
            Log Items to Console
          </button>
          <button
            onClick={saveToFirebase}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
          >
            Force Save
          </button>
        </div>
        <div className="text-xs text-yellow-600">
          Check browser console for logs. This component should be removed in production.
        </div>
      </div>
    </div>
  );
};

export default DebugStoreTest;
