// PrepItemCard.tsx - Component for individual prep item cards
import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { PrepItem, Recipe, Priority, PriorityInfo, TimeSlot } from './prep-types';

interface PrepItemCardProps {
  prep: PrepItem;
  isSelected: boolean;
  selection: {
    priority: Priority;
    timeSlot: string;
    selected: boolean;
  };
  showPriorityOptions: boolean | number | string | null;
  showTimeOptions: boolean | number | string | null;
  assignmentStep: string | null;
  priorities: PriorityInfo[];
  timeSlots: TimeSlot[];
  onToggleSelection: () => void;
  onUpdateSelection: (field: 'priority' | 'timeSlot', value: string) => void;
  onShowRecipe: () => void;
  onShowPriorityOptions?: (id: number | string | null) => void;
  onDelete?: () => void;
  context?: string;
}

const PrepItemCard: React.FC<PrepItemCardProps> = ({
  prep,
  isSelected,
  selection,
  showPriorityOptions,
  showTimeOptions,
  assignmentStep,
  priorities,
  timeSlots,
  onToggleSelection,
  onUpdateSelection,
  onShowRecipe,
  onDelete,
  context = 'main'
}) => {
  const contextId = context === 'suggested' ? `suggested-${prep.id}` : prep.id;

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <button
            onClick={onToggleSelection}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected 
                ? 'bg-blue-500 border-blue-500' 
                : 'border-gray-300 hover:border-blue-500'
            }`}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </button>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                {prep.name}
              </h4>
              {prep.hasRecipe && (
                <button 
                  onClick={onShowRecipe}
                  className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full"
                >
                  Recipe
                </button>
              )}
              {prep.isCustom && onDelete && (
                <button 
                  onClick={onDelete}
                  className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <span className="capitalize">{prep.category}</span>
              <span className="mx-1">•</span>
              <span>{prep.estimatedTime}</span>
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="flex items-center space-x-2">
            <div className="dropdown-container">
              <button 
                className={`text-xs px-2 py-1 rounded ${
                  selection.priority === 'high' 
                    ? 'bg-red-100 text-red-700' 
                    : selection.priority === 'medium' 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-green-100 text-green-700'
                } flex items-center`}
                onClick={() => onUpdateSelection('priority', selection.priority)}
              >
                <span className="capitalize">{selection.priority}</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>

              {showPriorityOptions && (
                <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                  {priorities.map(priority => (
                    <button
                      key={priority.id}
                      className={`block w-full px-4 py-2 text-xs text-left hover:bg-gray-100 ${
                        selection.priority === priority.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => onUpdateSelection('priority', priority.id)}
                    >
                      <span className="capitalize">{priority.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="dropdown-container">
              <button 
                className={`text-xs px-2 py-1 rounded ${
                  selection.timeSlot 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700'
                } flex items-center`}
                onClick={() => onUpdateSelection('timeSlot', selection.timeSlot)}
              >
                <span>{selection.timeSlot || 'Time'}</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>

              {showTimeOptions && (
                <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.id}
                      className={`block w-full px-4 py-2 text-xs text-left hover:bg-gray-100 ${
                        selection.timeSlot === slot.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => onUpdateSelection('timeSlot', slot.id)}
                    >
                      {slot.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrepItemCard;
