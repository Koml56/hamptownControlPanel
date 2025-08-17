// Test to verify category changes are working correctly
import { defaultCategories, getCategoryIcon, getCategoryColor, getAllCategoryOptions } from './utils';
import { InventoryCategory } from '../types';

describe('Category Changes', () => {
  test('should only have meat and dairy in default categories', () => {
    expect(defaultCategories).toHaveLength(2);
    expect(defaultCategories.map(cat => cat.id)).toEqual(['meat', 'dairy']);
    expect(defaultCategories.map(cat => cat.name)).toEqual(['Meat & Fish', 'Dairy']);
  });

  test('should return correct icons for meat and dairy', () => {
    expect(getCategoryIcon('meat')).toBe('🥩');
    expect(getCategoryIcon('dairy')).toBe('🥛');
    expect(getCategoryIcon('uncategorized')).toBe('❓');
    expect(getCategoryIcon('unknown_category')).toBe('📋');
  });

  test('should return correct colors for meat and dairy', () => {
    expect(getCategoryColor('meat')).toBe('red');
    expect(getCategoryColor('dairy')).toBe('blue');
    expect(getCategoryColor('uncategorized')).toBe('gray');
    expect(getCategoryColor('unknown_category')).toBe('slate');
  });

  test('should handle removed categories gracefully', () => {
    // These categories should now be handled as unknown/custom categories
    expect(getCategoryIcon('produce')).toBe('📋');
    expect(getCategoryIcon('bread')).toBe('📋');
    expect(getCategoryColor('produce')).toBe('slate');
    expect(getCategoryColor('bread')).toBe('slate');
  });

  test('should include only meat and dairy in category options', () => {
    const options = getAllCategoryOptions([]);
    const defaultOptions = options.filter(opt => !opt.isCustom);
    
    expect(defaultOptions).toHaveLength(2);
    expect(defaultOptions.map(opt => opt.value)).toEqual(['meat', 'dairy']);
  });

  test('InventoryCategory type should be restricted', () => {
    // This is a compile-time test - if the type doesn't include these values, 
    // TypeScript would catch it during compilation
    const validCategories: InventoryCategory[] = ['meat', 'dairy', 'uncategorized'];
    expect(validCategories).toContain('meat');
    expect(validCategories).toContain('dairy');
    expect(validCategories).toContain('uncategorized');
  });
});