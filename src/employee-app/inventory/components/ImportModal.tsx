// src/employee-app/inventory/components/ImportModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { showToast, generateId } from '../utils';

interface ImportModalProps {
  onClose: () => void;
}

interface ParsedItem {
  id: number;
  name: string;
  ean?: string;
  unit?: string;
  cost?: number;
  costWithTax?: number;
  type?: string;
  frequency: 'database';
}

declare global {
  interface Window {
    XLSX: any;
  }
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose }) => {
  const { importFromExcel } = useInventory();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Load SheetJS from CDN
  useEffect(() => {
    const loadSheetJS = async () => {
      // Check if already loaded
      if (window.XLSX) {
        setXlsxLoaded(true);
        return;
      }

      setLoadingLibrary(true);
      
      try {
        // Create script element
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.async = true;
        
        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        
        setXlsxLoaded(true);
        console.log('SheetJS loaded successfully');
      } catch (error) {
        console.error('Failed to load SheetJS:', error);
        showToast('Failed to load Excel parser. Please try refreshing the page.');
      } finally {
        setLoadingLibrary(false);
      }
    };

    loadSheetJS();
  }, []);

  const parseExcelData = (json: any[][]): ParsedItem[] => {
    if (json.length < 2) {
      throw new Error('File appears to be empty or invalid');
    }
    
    const header = json[0];
    console.log('Header row:', header);
    
    // Find column indices - more flexible matching for Finnish headers
    const nameIdx = header.findIndex((h: any) => {
      if (!h) return false;
      const headerStr = h.toString().toLowerCase().trim();
      return headerStr.includes('tuotenimi') || 
             headerStr.includes('name') || 
             headerStr.includes('nimi') ||
             headerStr.includes('product') ||
             headerStr.includes('catentdesc');
    });
    
    const eanIdx = header.findIndex((h: any) => {
      if (!h) return false;
      const headerStr = h.toString().toLowerCase().trim();
      return headerStr.includes('ean') || headerStr.includes('barcode');
    });
    
    const unitIdx = header.findIndex((h: any) => {
      if (!h) return false;
      const headerStr = h.toString().toLowerCase().trim();
      return headerStr === 'pmy' || 
             headerStr.includes('unit') || 
             headerStr.includes('yksikkö') ||
             headerStr.includes('baseunit') ||
             headerStr === 'baseunit_size';
    });
    
    const priceIdx = header.findIndex((h: any) => {
      if (!h) return false;
      const headerStr = h.toString().toLowerCase().trim();
      return headerStr.includes('hinta veroton') || 
             (headerStr.includes('price') && !headerStr.includes('tax')) ||
             headerStr.includes('veroton');
    });
    
    const priceTaxIdx = header.findIndex((h: any) => {
      if (!h) return false;
      const headerStr = h.toString().toLowerCase().trim();
      return headerStr.includes('hinta verollinen') || 
             headerStr.includes('pricetax') ||
             (headerStr.includes('hinta') && headerStr.includes('verollinen'));
    });

    console.log('Column mapping:', { 
      nameIdx: nameIdx >= 0 ? header[nameIdx] : 'Not found', 
      eanIdx: eanIdx >= 0 ? header[eanIdx] : 'Not found',
      unitIdx: unitIdx >= 0 ? header[unitIdx] : 'Not found',
      priceIdx: priceIdx >= 0 ? header[priceIdx] : 'Not found',
      priceTaxIdx: priceTaxIdx >= 0 ? header[priceTaxIdx] : 'Not found'
    });
    
    if (nameIdx === -1) {
      throw new Error('Could not find product name column. Expected columns containing "tuotenimi", "name", "nimi", or "product".');
    }
    
    // Filter out empty rows and rows without names
    const dataRows = json.slice(1).filter(row => {
      return row && row[nameIdx] && row[nameIdx].toString().trim().length > 0;
    });
    
    console.log(`Found ${dataRows.length} valid data rows out of ${json.length - 1} total rows`);
    
    const newItems: ParsedItem[] = dataRows.map((row, i) => {
      const item: ParsedItem = {
        id: generateId() + i,
        name: row[nameIdx]?.toString().trim() || '',
        ean: eanIdx !== -1 ? (row[eanIdx]?.toString().trim() || '') : '',
        unit: unitIdx !== -1 ? (row[unitIdx]?.toString().trim() || '') : '',
        cost: priceIdx !== -1 ? (parseFloat(row[priceIdx]) || 0) : 0,
        costWithTax: priceTaxIdx !== -1 ? (parseFloat(row[priceTaxIdx]) || 0) : 0,
        type: '', // Will be categorized later
        frequency: 'database' as const
      };
      
      return item;
    }).filter(item => item.name.length > 0);
    
    console.log(`Successfully parsed ${newItems.length} items`);
    return newItems;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!xlsxLoaded) {
      showToast('Excel parser is still loading. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      // Validate file
      const validExtensions = ['.xls', '.xlsx', '.csv'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        throw new Error(`Invalid file type: ${fileExtension}. Please use .xls, .xlsx, or .csv files.`);
      }
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size too large. Please use files smaller than 10MB.');
      }
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('File loaded, size:', arrayBuffer.byteLength, 'bytes');
      
      // Parse the workbook using the loaded XLSX library
      const workbook = window.XLSX.read(arrayBuffer, {
        type: 'array',
        cellStyles: true,
        cellFormulas: false,
        cellDates: true,
        cellNF: false,
        sheetStubs: false
      });
      
      console.log('Workbook loaded, sheets:', workbook.SheetNames);
      
      if (workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in the Excel file');
      }
      
      // Use the first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      console.log('Processing sheet:', sheetName);
      
      // Convert to JSON with header row
      const json = window.XLSX.utils.sheet_to_json(sheet, { 
        header: 1,
        defval: null,
        blankrows: false,
        raw: false // This helps with number formatting
      });
      
      console.log('Raw JSON data sample:', json.slice(0, 3));
      
      if (!json || json.length === 0) {
        throw new Error('Sheet appears to be empty');
      }
      
      const parsedItems = parseExcelData(json as any[][]);
      
      if (parsedItems.length === 0) {
        throw new Error('No valid items found in the file. Please check that your file has a header row and product names.');
      }
      
      setPreviewData(parsedItems);
      setShowPreview(true);
      showToast(`Found ${parsedItems.length} items. Review before importing.`);
      
    } catch (error) {
      console.error('Excel parsing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast('Error reading file: ' + errorMessage);
    } finally {
      setIsProcessing(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (previewData.length === 0) return;
    
    importFromExcel(previewData);
    showToast(`Successfully imported ${previewData.length} items!`);
    onClose();
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewData([]);
  };

  const downloadSampleFile = () => {
    // Create sample CSV content
    const sampleData = [
      ['tuotenimi', 'ean', 'PMY', 'hinta veroton', 'hinta verollinen'],
      ['Sample Product 1', '1234567890123', 'kg', '10.50', '12.60'],
      ['Sample Product 2', '2345678901234', 'pcs', '5.25', '6.30'],
      ['Sample Product 3', '3456789012345', 'liters', '8.75', '10.50']
    ];
    
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_inventory.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-xl p-6 mx-4 ${showPreview ? 'max-w-4xl w-full max-h-[90vh] overflow-y-auto' : 'max-w-md w-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {showPreview ? 'Preview Import Data' : 'Import Items from Excel'}
          </h3>
          <button 
            onClick={showPreview ? handleCancelPreview : onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {!showPreview ? (
          <div className="space-y-4">
            {loadingLibrary && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <span className="text-blue-700">Loading Excel parser...</span>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Excel File</label>
              <input 
                type="file" 
                accept=".xls,.xlsx,.csv" 
                onChange={handleFileUpload}
                disabled={isProcessing || !xlsxLoaded}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Supports .xls, .xlsx, and .csv files (max 10MB)</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Expected Excel Format:
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Product Name:</strong> tuotenimi, name, nimi, product</li>
                <li>• <strong>EAN Code:</strong> ean, barcode</li>
                <li>• <strong>Unit:</strong> PMY, unit, yksikkö, baseunit_size</li>
                <li>• <strong>Price (excl. tax):</strong> hinta veroton, price</li>
                <li>• <strong>Price (incl. tax):</strong> hinta verollinen, pricetax</li>
              </ul>
              <button 
                onClick={downloadSampleFile}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Download className="w-3 h-3 mr-1" />
                Download sample file
              </button>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Processing file...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">{previewData.length} items ready to import</span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {previewData.slice(0, 20).map((item, index) => (
                  <div key={item.id} className="bg-white p-3 rounded border">
                    <div className="font-medium text-sm text-gray-800 truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 mt-1">
                      {item.ean && <div>EAN: {item.ean}</div>}
                      {item.unit && <div>Unit: {item.unit}</div>}
                      {item.cost && item.cost > 0 && <div>Price: €{item.cost.toFixed(2)}</div>}
                      {item.costWithTax && item.costWithTax > 0 && <div>Price (tax): €{item.costWithTax.toFixed(2)}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {previewData.length > 20 && (
                <div className="text-center text-sm text-gray-500 mt-3">
                  ... and {previewData.length - 20} more items
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={handleConfirmImport}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Import {previewData.length} Items
              </button>
              <button 
                onClick={handleCancelPreview}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {!showPreview && (
          <div className="flex gap-4 mt-6">
            <button 
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
