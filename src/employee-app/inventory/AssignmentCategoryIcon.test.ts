// Test for the assignment category icon fix
import { getCategoryIcon } from './utils';

describe('Assignment Category Icon Fix', () => {
  test('getCategoryIcon should return correct icons for different categories', () => {
    expect(getCategoryIcon('meat')).toBe('🥩');
    expect(getCategoryIcon('dairy')).toBe('🥛');
    expect(getCategoryIcon('uncategorized')).toBe('❓');
    expect(getCategoryIcon('unknownCategory')).toBe('📋');
  });

  test('icon selection logic for assigned items', () => {
    // Helper function that mimics the logic in DatabaseView.tsx
    const getIconForDatabaseItem = (item: any) => {
      const category = item.isAssigned && item.assignedCategory ? item.assignedCategory : (item.type || 'supplies');
      return getCategoryIcon(category);
    };

    // Test case 1: Unassigned item should use original type
    const unassignedItem = {
      id: 1,
      name: 'Test Item',
      type: 'meat',
      isAssigned: false,
      assignedCategory: undefined
    };
    expect(getIconForDatabaseItem(unassignedItem)).toBe('🥩');

    // Test case 2: Assigned item should use assigned category
    const assignedItem = {
      id: 2,
      name: 'Test Item',
      type: 'meat', // Original type
      isAssigned: true,
      assignedCategory: 'dairy' // New assigned category
    };
    expect(getIconForDatabaseItem(assignedItem)).toBe('🥛'); // Should show dairy icon, not meat icon

    // Test case 3: Assigned item with null assignedCategory should fall back to type
    const assignedItemNoCategory = {
      id: 3,
      name: 'Test Item',
      type: 'meat',
      isAssigned: true,
      assignedCategory: null
    };
    expect(getIconForDatabaseItem(assignedItemNoCategory)).toBe('🥩');

    // Test case 4: No type and no assignedCategory should use default
    const noTypeItem = {
      id: 4,
      name: 'Test Item',
      type: undefined,
      isAssigned: false,
      assignedCategory: undefined
    };
    expect(getIconForDatabaseItem(noTypeItem)).toBe('📋'); // supplies gets mapped to 📋
  });
});