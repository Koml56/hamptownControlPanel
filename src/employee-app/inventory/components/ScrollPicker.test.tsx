// ScrollPicker floating-point precision fix test
import React from 'react';
import { render } from '@testing-library/react';
import ScrollPicker from './ScrollPicker';

describe('ScrollPicker Floating-Point Precision Fix', () => {
  test('should generate clean decimal values without floating-point precision issues', () => {
    let capturedValue: number = 0;
    const onChange = (value: number) => {
      capturedValue = value;
    };

    // Test with decimal steps that commonly cause floating-point issues
    render(
      <ScrollPicker 
        value={1.4} 
        onChange={onChange} 
        min={0} 
        max={5} 
        step={0.1} 
      />
    );

    // The component should not display values like 1.4000000000000001
    const allText = document.body.textContent || '';
    expect(allText).not.toMatch(/1\.40{3,}/); // Matches 1.4000... with 3+ zeros
    expect(allText).not.toMatch(/2\.30{3,}/); // Matches 2.3000... with 3+ zeros  
    expect(allText).not.toMatch(/4\.30{3,}/); // Matches 4.3000... with 3+ zeros
    
    // Should contain the properly formatted value
    expect(allText).toContain('1.4');
  });

  test('should handle problematic decimal values correctly', () => {
    const problematicValues = [1.4, 2.3, 4.3]; // Test values known to cause precision issues
    
    problematicValues.forEach(value => {
      let capturedValue: number = 0;
      const onChange = (val: number) => {
        capturedValue = val;
      };

      const { unmount } = render(
        <ScrollPicker 
          value={value} 
          onChange={onChange} 
          min={0} 
          max={5} 
          step={0.1} 
        />
      );

      // Check that the value is displayed correctly without precision artifacts
      const allText = document.body.textContent || '';
      
      // Should contain the clean decimal representation
      expect(allText).toContain(value.toFixed(1));
      
      // Should not contain floating-point precision artifacts
      expect(allText).not.toMatch(new RegExp(`${value}0{3,}`));
      
      unmount();
    });
  });

  test('should work correctly with integer steps', () => {
    let capturedValue: number = 0;
    const onChange = (value: number) => {
      capturedValue = value;
    };

    render(
      <ScrollPicker 
        value={5} 
        onChange={onChange} 
        min={0} 
        max={10} 
        step={1} 
      />
    );

    // Integer values should display without decimal places
    const allText = document.body.textContent || '';
    expect(allText).toContain('5');
    
    // Should not display decimal notation for integers
    expect(allText).not.toContain('5.0');
  });
});