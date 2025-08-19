import React, { useState, useEffect } from 'react';
import type { PrepItem, ScheduledPrep, PrepSelections } from './types';

interface PrepListProps {
  loadFromFirebase: () => Promise<void>;
  saveToFirebase: () => void;
  quickSave: (field: string, data: any) => Promise<void>;
  connectionStatus: 'connecting' | 'connected' | 'error';
}

const PrepList: React.FC<PrepListProps> = ({ 
  loadFromFirebase,
  saveToFirebase,
  quickSave,
  connectionStatus
}) => {
  // Similar state and logic as PrepListPrototype but adapted for integration
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const [selectedDate] = useState(getTomorrowDate());
  const [allPreps] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});
  // Track which prep items are currently being saved - COPIED FROM TODAYVIEW
  const [savingPreps, setSavingPreps] = useState<Set<number>>(new Set());

  // Load prep data from Firebase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadFromFirebase();
      } catch (error) {
        console.error('Failed to load prep data:', error);
      }
    };
    loadData();
  }, [loadFromFirebase]);

  // Save scheduledPreps to Firebase on change
  useEffect(() => {
    if (connectionStatus === 'connected' && scheduledPreps.length > 0) {
      quickSave('scheduledPreps', scheduledPreps);
    }
  }, [scheduledPreps, quickSave, connectionStatus]);

  // Enhanced prep selection toggle with loading state - COPIED FROM TODAYVIEW PATTERN
  const togglePrepSelection = async (prep: PrepItem) => {
    const selectionKey = `${selectedDate.toISOString().split('T')[0]}-${prep.id}`;
    const isSelected = prepSelections[selectionKey]?.selected;

    if (savingPreps.has(prep.id)) {
      console.log('⏳ Prep selection toggle already in progress for prep:', prep.id);
      return; // Prevent double-clicks while saving
    }

    setSavingPreps(prev => new Set(prev).add(prep.id));
    
    try {
      console.log('🔄 PrepList: Toggling selection for prep:', prep.id);
      
      if (isSelected) {
        setPrepSelections(prev => {
          const newSelections = { ...prev };
          delete newSelections[selectionKey];
          return newSelections;
        });
        setScheduledPreps(prev => prev.filter(p => !(p.prepId === prep.id && p.scheduledDate === selectionKey.split('-')[0])));
      } else {
        setPrepSelections(prev => ({
          ...prev,
          [selectionKey]: { priority: 'medium', timeSlot: '', selected: true }
        }));
        const newScheduledPrep: ScheduledPrep = {
          id: Date.now(),
          prepId: prep.id,
          name: prep.name,
          category: prep.category,
          estimatedTime: prep.estimatedTime,
          isCustom: prep.isCustom,
          hasRecipe: prep.hasRecipe,
          recipe: prep.recipe,
          scheduledDate: selectionKey.split('-')[0],
          priority: 'medium',
          timeSlot: '',
          completed: false,
          assignedTo: null,
          notes: ''
        };
        setScheduledPreps(prev => [...prev, newScheduledPrep]);
      }

      // Save to Firebase - SIMPLE PATTERN LIKE TODAYVIEW
      await quickSave('prepSelections', prepSelections);
      await quickSave('scheduledPreps', scheduledPreps);
      console.log('✅ PrepList: Prep selection toggle finished for prep:', prep.id);
    } catch (error) {
      console.error('❌ PrepList: Prep selection toggle failed for prep:', prep.id, error);
    } finally {
      setSavingPreps(prev => {
        const newSet = new Set(prev);
        newSet.delete(prep.id);
        return newSet;
      });
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Prep List</h2>
      <div>
        {allPreps.map(prep => {
          const selectionKey = `${selectedDate.toISOString().split('T')[0]}-${prep.id}`;
          const isSelected = prepSelections[selectionKey]?.selected;
          const isSaving = savingPreps.has(prep.id); // COPIED FROM TODAYVIEW PATTERN
          return (
            <div key={prep.id} className={`p-2 border rounded mb-2 flex justify-between items-center transition-all ${
              isSaving ? 'bg-blue-50 border-blue-200' : isSelected ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'
            }`}>
              <div>
                <div className="font-semibold">{prep.name}</div>
                <div className="text-sm text-gray-600">{prep.category} • {prep.estimatedTime}</div>
              </div>
              <button
                onClick={() => togglePrepSelection(prep)}
                disabled={isSaving}
                className={`px-3 py-1 rounded text-white transition-colors ${
                  isSaving 
                    ? 'bg-blue-400 cursor-wait' 
                    : isSelected 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } disabled:cursor-wait`}
                title={isSaving ? 'Saving...' : isSelected ? 'Remove prep' : 'Add prep'}
              >
                {isSaving ? 'Saving...' : isSelected ? 'Remove' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrepList;
