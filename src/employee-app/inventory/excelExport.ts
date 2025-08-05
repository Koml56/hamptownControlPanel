// src/employee-app/inventory/excelExport.ts
import * as XLSX from 'xlsx';
import { EnhancedInventoryItem } from '../types';
import { getStockStatus } from './stockUtils';

export const generateOrderExcel = (items: EnhancedInventoryItem[]): string => {
  // Filter items that need ordering and are not already ordered
  const needsOrdering = items.filter(item => {
    const status = getStockStatus(item.currentStock, item.minimumLevel);
    return ['out', 'critical', 'low'].includes(status) && !item.orderedStatus?.isOrdered;
  });

  const data = needsOrdering.map(item => ({
    'EAN': item.ean || '',
    'Product Name': item.name,
    'Current Stock': `${item.currentStock} ${item.unit}`,
    'Minimum': `${item.minimumLevel} ${item.unit}`,
    'Optimal': `${item.optimalLevel || item.minimumLevel * 2} ${item.unit}`,
    'Status': getStockStatus(item.currentStock, item.minimumLevel),
    'Stock %': `${Math.round((item.currentStock / item.minimumLevel) * 100)}%`,
    'Days Remaining': item.daysRemaining === Infinity ? 'No data' : 
                      item.daysRemaining === 0 ? 'OUT NOW' : 
                      `${item.daysRemaining} days`,
    'Avg Daily Use': item.forecast?.averageDailyConsumption 
      ? `${item.forecast.averageDailyConsumption.toFixed(1)} ${item.unit}/day`
      : 'No data',
    'Recommended Order': `${item.recommendedOrder || 0} ${item.unit}`,
    'Pack Size': item.unitPackSize || 1,
    'Packs to Order': Math.ceil((item.recommendedOrder || 0) / (item.unitPackSize || 1)),
    'Frequency': item.frequency.toUpperCase(),
    'Category': item.category,
    'Cost per Unit': item.cost ? `€${item.cost.toFixed(2)}` : 'N/A',
    'Total Cost': item.cost ? `€${(item.cost * (item.recommendedOrder || 0)).toFixed(2)}` : 'N/A',
    'Last Updated': new Date(item.lastUsed).toLocaleDateString(),
    'Urgent': item.status === 'out' ? 'YES' : 
              item.status === 'critical' ? 'CRITICAL' : 
              (item.daysRemaining || 0) <= 3 ? 'YES' : 'NO'
  }));

  // Create workbook with color coding
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // EAN
    { wch: 30 }, // Product Name
    { wch: 12 }, // Current Stock
    { wch: 12 }, // Minimum
    { wch: 12 }, // Optimal
    { wch: 10 }, // Status
    { wch: 8 },  // Stock %
    { wch: 12 }, // Days Remaining
    { wch: 15 }, // Avg Daily Use
    { wch: 15 }, // Recommended Order
    { wch: 10 }, // Pack Size
    { wch: 12 }, // Packs to Order
    { wch: 10 }, // Frequency
    { wch: 15 }, // Category
    { wch: 12 }, // Cost per Unit
    { wch: 12 }, // Total Cost
    { wch: 12 }, // Last Updated
    { wch: 8 }   // Urgent
  ];
  ws['!cols'] = colWidths;

  // Add conditional formatting (note: basic XLSX doesn't support advanced formatting)
  // We'll add notes in the summary instead
  
  XLSX.utils.book_append_sheet(wb, ws, 'Order List');

  // Add summary sheet with statistics
  const totalCost = data.reduce((sum, item) => {
    const cost = parseFloat(item['Total Cost'].replace('€', '')) || 0;
    return sum + cost;
  }, 0);

  const summaryData = [
    { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() },
    { 'Metric': 'Total Items to Order', 'Value': data.length },
    { 'Metric': 'Out of Stock (RED)', 'Value': data.filter(i => i.Status === 'out').length },
    { 'Metric': 'Critical ≤20% (ORANGE)', 'Value': data.filter(i => i.Status === 'critical').length },
    { 'Metric': 'Low Stock ≤50% (YELLOW)', 'Value': data.filter(i => i.Status === 'low').length },
    { 'Metric': 'Urgent Orders (≤3 days)', 'Value': data.filter(i => i.Urgent === 'YES' || i.Urgent === 'CRITICAL').length },
    { 'Metric': 'Total Estimated Cost', 'Value': `€${totalCost.toFixed(2)}` },
    { 'Metric': 'Daily Frequency Items', 'Value': data.filter(i => i.Frequency === 'DAILY').length },
    { 'Metric': 'Weekly Frequency Items', 'Value': data.filter(i => i.Frequency === 'WEEKLY').length },
    { 'Metric': 'Monthly Frequency Items', 'Value': data.filter(i => i.Frequency === 'MONTHLY').length }
  ];

  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  // Add instructions sheet
  const instructionsData = [
    { 'Instructions': 'Color Coding Guide' },
    { 'Instructions': 'Status = "out" → RED - Out of stock, order immediately' },
    { 'Instructions': 'Status = "critical" → ORANGE - ≤20% of minimum, urgent order' },
    { 'Instructions': 'Status = "low" → YELLOW - ≤50% of minimum, order soon' },
    { 'Instructions': '' },
    { 'Instructions': 'Priority Order:' },
    { 'Instructions': '1. All items with Urgent = "YES"' },
    { 'Instructions': '2. Items with lowest "Days Remaining"' },
    { 'Instructions': '3. Items with highest daily consumption' },
    { 'Instructions': '' },
    { 'Instructions': 'Pack Size Information:' },
    { 'Instructions': 'Use "Packs to Order" for ordering if supplier sells in packs' },
    { 'Instructions': 'Use "Recommended Order" for individual unit ordering' }
  ];

  const ws3 = XLSX.utils.json_to_sheet(instructionsData);
  ws3['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Instructions');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Hamptown_Order_${timestamp}.xlsx`;
  
  try {
    XLSX.writeFile(wb, fileName);
    return fileName;
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error('Failed to generate Excel file');
  }
};