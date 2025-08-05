// src/employee-app/inventory/excelExport.ts
import * as XLSX from 'xlsx';
import { EnhancedInventoryItem } from '../types';

export const generateOrderExcel = (items: EnhancedInventoryItem[]) => {
  const orderData = items
    .filter(item => item.status !== 'ok')
    .map(item => ({
      'EAN': item.ean || '',
      'Product Name': item.name,
      'Current Stock': item.currentStock,
      'Minimum Level': item.minimumLevel,
      'To Order': item.recommendedOrder,
      'Unit': item.unit,
      'Pack Size': item.unitPackSize || 'Individual',
      'Packs to Order': item.unitPackSize ? 
        Math.ceil((item.recommendedOrder || 0) / item.unitPackSize) : 
        item.recommendedOrder,
      'Days Remaining': item.daysRemaining === Infinity ? 'N/A' : item.daysRemaining,
      'Avg Daily Use': item.forecast?.averageDailyConsumption.toFixed(1) || '0.0',
      'Last Order': item.forecast?.lastOrderDate ? 
        new Date(item.forecast.lastOrderDate).toLocaleDateString() : 
        'No data',
      'Frequency': item.frequency.toUpperCase(),
      'Notes': item.status === 'out' ? 'OUT OF STOCK!' : 
               item.status === 'critical' ? 'CRITICAL' : 
               item.status === 'low' ? 'LOW STOCK' : ''
    }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(orderData);

  // Auto-width columns
  const colWidths = [
    { wch: 15 }, // EAN
    { wch: 30 }, // Product Name
    { wch: 12 }, // Current Stock
    { wch: 12 }, // Minimum Level
    { wch: 10 }, // To Order
    { wch: 8 },  // Unit
    { wch: 12 }, // Pack Size
    { wch: 12 }, // Packs to Order
    { wch: 12 }, // Days Remaining
    { wch: 12 }, // Avg Daily Use
    { wch: 12 }, // Last Order
    { wch: 10 }, // Frequency
    { wch: 15 }  // Notes
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Order List');

  // Add summary sheet
  const summaryData = [
    {
      'Metric': 'Total Items to Order',
      'Value': orderData.length
    },
    {
      'Metric': 'Out of Stock Items',
      'Value': orderData.filter(i => i.Notes === 'OUT OF STOCK!').length
    },
    {
      'Metric': 'Critical Items',
      'Value': orderData.filter(i => i.Notes === 'CRITICAL').length
    },
    {
      'Metric': 'Low Stock Items',
      'Value': orderData.filter(i => i.Notes === 'LOW STOCK').length
    },
    {
      'Metric': 'Report Generated',
      'Value': new Date().toLocaleString()
    }
  ];

  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  // Generate file
  const fileName = `Order_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
};