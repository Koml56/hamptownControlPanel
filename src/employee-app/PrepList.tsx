import React, { useState, useEffect } from 'react';
import type { PrepItem, ScheduledPrep, PrepSelections } from './types';
import { Check } from 'lucide-react';

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

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getTomorrowDate());
  const [allPreps, setAllPreps] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});
  const [shownRecipe, setShownRecipe] = useState<number | null>(null);

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

  // Toggle prep selection logic (simplified)
  const togglePrepSelection = (prep: PrepItem) => {
    const selectionKey = `${selectedDate.toISOString().split('T')[0]}-${prep.id}`;
    const isSelected = prepSelections[selectionKey]?.selected;

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
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Prep List</h2>
      <div>
        {allPreps.map(prep => {
          const selectionKey = `${selectedDate.toISOString().split('T')[0]}-${prep.id}`;
          const isSelected = prepSelections[selectionKey]?.selected;
          return (
            <div key={prep.id} className={`p-2 border rounded mb-2 flex justify-between items-center ${isSelected ? 'bg-blue-100' : 'bg-white'}`}>
              <div>
                <div className="font-semibold">{prep.name}</div>
                <div className="text-sm text-gray-600">{prep.category} • {prep.estimatedTime}</div>
              </div>
              <button
                onClick={() => togglePrepSelection(prep)}
                className={`px-3 py-1 rounded text-white ${isSelected ? 'bg-red-500' : 'bg-green-500'}`}
              >
                {isSelected ? 'Remove' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrepList;
