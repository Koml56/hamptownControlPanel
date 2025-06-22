// PrepItemCard.tsx - Component for individual prep item cards
import React from 'react';
import { Check } from 'lucide-react';
import type { PrepItem, Recipe, Priority } from './prep-types';
import { priorities, timeSlots } from './prep-constants';

interface PrepItemCardProps {
  prep: PrepItem;
  isSelected: boolean;
  selection: {
    priority: Priority;
    timeSlot: string;
    selected: boolean;
  };
  showPriorityOptions: number | string | null;
  showTimeOptions: number | string | null;
  assignmentStep: Record<number, string | null>;
  onToggleSelection: (prep: PrepItem) => void;
  onUpdateSelection: (prep: PrepItem, field: 'priority' | 'timeSlot', value: string, context?: string) => void;
  onShowPriorityOptions: (prepId: number | string | null) => void;
  onShowRecipe: (recipe: Recipe, name: string) => void;
  onSave: (prep: PrepItem, selection: { priority: Priority; timeSlot: string; selected: boolean }) => void;
  context?: string;
}

const PrepItemCard: React.FC<PrepItemCardProps> = ({
  prep,
  isSelected,
  selection,
  showPriorityOptions,
  showTimeOptions,
  assignmentStep,
  onToggleSelection,
  onUpdateSelection,
  onShowPriorityOptions,
  onShowRecipe,
  onSave,
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
            onClick={() => onToggleSelection(prep)}
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
              <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}> 
                {prep.name}
              </h4>
              {prep.hasRecipe && prep.recipe && (
                <button
                  onClick={() => onShowRecipe(prep.recipe!, prep.name)}
                  className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                >
                  📖 Recipe
                </button>
              )}
              <button
                onClick={() => onSave(prep, selection)}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full hover:bg-blue-200 transition-colors"
              >
                💾 Save
              </button>
            </div>
            <p className="text-sm text-gray-600 flex items-center space-x-2">
              <span>{prep.estimatedTime}</span>
              <span>•</span>
              <span>{prep.category}</span>
              <span>•</span>
              <span>Every {prep.frequency} days</span>
              {prep.isCustom && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Custom</span>}
            </p>

            {/* Priority and Time Assignment UI */}
            <div className="mt-2">
              <div className="relative w-2/3">
                <button
                  onClick={() => {
                    if (showPriorityOptions === contextId) {
                      onShowPriorityOptions(null);
                    } else {
                      onShowPriorityOptions(contextId);
                    }
                  }}
                  className={`w-full px-2 py-1 rounded text-xs transition-colors ${
                    isSelected 
                      ? priorities.find(p => p.id === selection.priority)?.color + ' font-medium'
                      : assignmentStep[prep.id] === 'timeSlot'
                      ? 'bg-green-100 text-green-700 font-medium'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {isSelected 
                    ? `${priorities.find(p => p.id === selection.priority)?.name} Priority${selection.timeSlot ? ` • ${timeSlots.find(t => t.id === selection.timeSlot)?.name}` : ' • Anytime'}`
                    : assignmentStep[prep.id] === 'timeSlot'
                    ? 'Now choose time slot'
                    : 'Click to assign priority & time'
                  }
                </button>
                
                {showPriorityOptions === contextId && (
                  <div className="dropdown-container soft-dropdown absolute top-full left-0 mt-2 rounded-xl p-3 z-20 w-full min-w-64 max-w-xs">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Choose Priority Level
                        </div>
                        <div className="space-y-2">
                          {priorities.map(priority => (
                            <button
                              key={priority.id}
                              onClick={() => onUpdateSelection(prep, 'priority', priority.id, context)}
                              className={`soft-button w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${priority.color}`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{priority.name}</span>
                                <span className="text-xs opacity-70">{priority.icon}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showTimeOptions === contextId && (
                  <div className="dropdown-container soft-dropdown absolute top-full left-0 mt-2 rounded-xl p-3 z-20 w-full min-w-64 max-w-sm">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Choose Time Slot
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => onUpdateSelection(prep, 'timeSlot', '', context)}
                            className="soft-button w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 bg-gray-50 text-gray-700 hover:bg-gray-100"
                          >
                            <div className="flex items-center justify-between">
                              <span>Anytime</span>
                              <span className="text-xs opacity-70">🕐</span>
                            </div>
                          </button>
                          {timeSlots.map(slot => (
                            <button
                              key={slot.id}
                              onClick={() => onUpdateSelection(prep, 'timeSlot', slot.id, context)}
                              className="soft-button w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              <div className="flex items-center justify-between">
                                <span>{slot.name}</span>
                                <span className="text-xs opacity-70">{slot.icon}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrepItemCard;
