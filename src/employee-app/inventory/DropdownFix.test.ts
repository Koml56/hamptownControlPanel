// Test for the dropdown category fix
import { getAllCategoryOptions, defaultCategories } from './utils';
import { CustomCategory } from '../types';

describe('Dropdown Category Fix', () => {
  const mockCustomCategories: CustomCategory[] = [
    {
      id: 'custom123',
      name: 'Bread & Bakery',
      icon: '🍞',
      color: '#FFD700',
      createdAt: '2024-01-01T00:00:00.000Z',
      isDefault: false
    },
    {
      id: 'vegetables456',
      name: 'Fresh Vegetables',
      icon: '🥬',
      color: '#4CAF50',
      createdAt: '2024-01-01T00:00:00.000Z',
      isDefault: false
    }
  ];

  describe('getAllCategoryOptions', () => {
    test('should return default categories when no custom categories provided', () => {
      const options = getAllCategoryOptions([]);
      expect(options).toHaveLength(2); // default categories: meat, dairy
      expect(options[0].value).toBe('meat');
      expect(options[0].label).toBe('🥩 Meat & Fish');
      expect(options[0].icon).toBe('🥩');
      expect(options[0].isCustom).toBe(false);
    });

    test('should include custom categories after default categories', () => {
      const options = getAllCategoryOptions(mockCustomCategories);
      expect(options).toHaveLength(4); // 2 default + 2 custom
      
      // Check default categories come first
      expect(options[0].value).toBe('meat');
      expect(options[1].value).toBe('dairy');
      
      // Check custom categories come after
      expect(options[2].value).toBe('custom123');
      expect(options[2].label).toBe('🍞 Bread & Bakery');
      expect(options[2].icon).toBe('🍞');
      expect(options[2].isCustom).toBe(true);
      
      expect(options[3].value).toBe('vegetables456');
      expect(options[3].label).toBe('🥬 Fresh Vegetables');
      expect(options[3].icon).toBe('🥬');
      expect(options[3].isCustom).toBe(true);
    });

    test('should always have at least one option (default categories)', () => {
      const options = getAllCategoryOptions();
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].value).toBeTruthy();
      expect(options[0].label).toContain(options[0].icon);
    });

    test('all options should have proper structure', () => {
      const options = getAllCategoryOptions(mockCustomCategories);
      
      options.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('icon');
        expect(option).toHaveProperty('isCustom');
        
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
        expect(typeof option.icon).toBe('string');
        expect(typeof option.isCustom).toBe('boolean');
        
        // Label should contain the icon
        expect(option.label).toContain(option.icon);
        
        // Value should not be 'produce' (the problematic value)
        expect(option.value).not.toBe('produce');
      });
    });
  });

  describe('default categories validation', () => {
    test('defaultCategories should not contain "produce"', () => {
      const produceCategory = defaultCategories.find(cat => cat.id === 'produce');
      expect(produceCategory).toBeUndefined();
    });

    test('defaultCategories should contain valid categories', () => {
      expect(defaultCategories.length).toBeGreaterThan(0);
      
      defaultCategories.forEach(category => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('icon');
        expect(category).toHaveProperty('color');
        
        expect(typeof category.id).toBe('string');
        expect(typeof category.name).toBe('string');
        expect(typeof category.icon).toBe('string');
        expect(typeof category.color).toBe('string');
        
        expect(category.id).toBeTruthy();
        expect(category.name).toBeTruthy();
        expect(category.icon).toBeTruthy();
        expect(category.color).toBeTruthy();
      });
    });
  });
});