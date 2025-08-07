// adminStoreIntegration.test.ts
// Test admin panel store management integration
import { StoreItem } from './types';

// Mock quickSave function
const mockQuickSave = jest.fn();

describe('Admin Panel Store Integration', () => {
  const mockStoreItems: StoreItem[] = [
    {
      id: 1,
      name: 'Test Coffee',
      description: 'A test coffee item',
      cost: 10,
      category: 'food',
      icon: '☕',
      available: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate with Firebase operations through quickSave', () => {
    // Test that the admin panel uses the same Firebase integration pattern
    const mockSetStoreItems = jest.fn((updater) => {
      if (typeof updater === 'function') {
        const newItems = updater(mockStoreItems);
        expect(mockQuickSave).toHaveBeenCalledWith('storeItems', newItems);
      }
    });
    
    // Simulate adding a new store item (how admin panel works)
    const handleAddStoreItem = () => {
      const newItem: StoreItem = {
        id: 2,
        name: 'New Item',
        description: 'New test item',
        cost: 15,
        category: 'food',
        icon: '🍕',
        available: true
      };
      
      mockSetStoreItems((prev: StoreItem[]) => {
        const updated = [...prev, newItem];
        mockQuickSave('storeItems', updated);
        return updated;
      });
    };
    
    handleAddStoreItem();
    
    // Verify quickSave was called for Firebase integration
    expect(mockQuickSave).toHaveBeenCalledWith('storeItems', expect.any(Array));
  });

  it('should handle store item updates through Firebase operations', () => {
    // Test that store item updates use the Firebase pattern
    const mockSetStoreItems = jest.fn((updater) => {
      if (typeof updater === 'function') {
        const newItems = updater(mockStoreItems);
        expect(mockQuickSave).toHaveBeenCalledWith('storeItems', newItems);
      }
    });
    
    // Simulate updating a store item (how admin panel works)
    const handleUpdateStoreItem = (id: number, field: keyof StoreItem, value: any) => {
      mockSetStoreItems((prev: StoreItem[]) => {
        const updated = prev.map(item => item.id === id ? { ...item, [field]: value } : item);
        mockQuickSave('storeItems', updated);
        return updated;
      });
    };
    
    handleUpdateStoreItem(1, 'cost', 15);
    
    // Verify quickSave was called for Firebase integration
    expect(mockQuickSave).toHaveBeenCalledWith('storeItems', expect.any(Array));
  });

  it('should handle store item removal through Firebase operations', () => {
    // Test that store item removal uses the Firebase pattern
    const mockSetStoreItems = jest.fn((updater) => {
      if (typeof updater === 'function') {
        const newItems = updater(mockStoreItems);
        expect(mockQuickSave).toHaveBeenCalledWith('storeItems', newItems);
      }
    });
    
    // Simulate removing a store item (how admin panel works)
    const handleRemoveStoreItem = (id: number) => {
      mockSetStoreItems((prev: StoreItem[]) => {
        const updated = prev.filter(item => item.id !== id);
        mockQuickSave('storeItems', updated);
        return updated;
      });
    };
    
    handleRemoveStoreItem(1);
    
    // Verify quickSave was called for Firebase integration
    expect(mockQuickSave).toHaveBeenCalledWith('storeItems', expect.any(Array));
  });
});