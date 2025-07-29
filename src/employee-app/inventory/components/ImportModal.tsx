// src/employee-app/inventory/components/ImportModal.tsx
import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { parseExcelData, showToast } from '../utils';

interface ImportModalProps {
  onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose }) => {
  const { importFromExcel } = useInventory();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Check if SheetJS is available (would need to be imported in a real React app)
      if (typeof window !== 'undefined' && !(window as any).XLSX) {
        showToast('Excel parser not loaded yet. Please try again in a moment.');
        setIsProcessing(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const XLSX = (window as any).XLSX;
          const workbook = XLSX.read(data, {type: 'array'});
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, {header:1});
          
          const newItems = parseExcelData(json);
          importFromExcel(newItems);
          onClose();
          showToast(`Successfully imported ${newItems.length} items!`);
        } catch (error) {
          showToast('Error reading file: ' + (error as Error).message);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      showToast('Error processing file: ' + (error as Error).message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Import Items from Excel</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Excel File</label>
            <input 
              type="file" 
              accept=".xls,.xlsx,.csv" 
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Expected Excel Format:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Column 1:</strong> Product Name (tuotenimi/catentdesc.name)</li>
              <li>• <strong>Column 2:</strong> EAN Code (ean)</li>
              <li>• <strong>Column 3:</strong> Unit (PMY/baseunit_size)</li>
              <li>• <strong>Column 4:</strong> Price without tax (hinta veroton)</li>
              <li>• <strong>Column 5:</strong> Price with tax (hinta verollinen)</li>
            </ul>
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Processing file...</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-4 mt-6">
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
