// TodayView.tsx - Component for displaying today's prep tasks
import React, { useState } from 'react';
import { Check, ChefHat, Edit3, Save, User, X } from 'lucide-react';
import type { ScheduledPrep, Recipe, CurrentUser } from './prep-types';
import { timeSlots, priorities } from './prep-constants';
import { getDateString } from './prep-utils';

// Updated props interface to include all required props
interface TodayViewProps {
  currentUser: CurrentUser;
  scheduledPreps: ScheduledPrep[];
  onToggleCompletion: (scheduledPrepId: number) => void;
  onAssignTo: (prepId: number, userId: number | null) => void;
  onUpdateNotes: (prepId: number, notes: string) => void;
  onShowRecipe: (recipe: Recipe, name: string) => void;
  saveToFirebase: () => void;
}

const TodayView: React.FC<TodayViewProps> = ({
  currentUser,
  scheduledPreps,
  onToggleCompletion,
  onAssignTo,
  onUpdateNotes,
  onShowRecipe,
  saveToFirebase
}) => {
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  const todayScheduledPreps = scheduledPreps.filter(prep =>
    prep.scheduledDate === getDateString(new Date())
  );

  const completedToday = todayScheduledPreps.filter(prep => prep.completed).length;
  const totalToday = todayScheduledPreps.length;

  // Start editing notes for a prep item
  const startEditingNotes = (prep: ScheduledPrep) => {
    setEditingNotes(prep.id);
    setNoteText(prep.notes || '');
  };

  // Save notes for a prep item
  const saveNotes = (prepId: number) => {
    onUpdateNotes(prepId, noteText);
    setEditingNotes(null);
    saveToFirebase(); // Save changes to Firebase
  };

  // Cancel editing notes
  const cancelEditingNotes = () => {
    setEditingNotes(null);
    setNoteText('');
  };

  // Assign prep to current user or unassign
  const toggleAssignment = (prep: ScheduledPrep) => {
    if (prep.assignedTo === currentUser.id) {
      onAssignTo(prep.id, null); // Unassign
    } else {
      onAssignTo(prep.id, currentUser.id); // Assign to current user
    }
    saveToFirebase(); // Save changes to Firebase
  };

  const renderPrepCard = (prep: ScheduledPrep) => {
    const priority = priorities.find(p => p.id === prep.priority);
    const isAssignedToCurrentUser = prep.assignedTo === currentUser.id;

    return (
      <div key={prep.id} className="flex flex-col border rounded-lg hover:bg-gray-50 transition-colors overflow-hidden">
        {/* Main prep info */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompletion(prep.id);
              }}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                prep.completed 
                  ? 'bg-green-500 border-green-500' 
                  : 'border-gray-300 hover:border-green-500'
              }`}
            >
              {prep.completed && <Check className="w-4 h-4 text-white" />}
            </button>
            <div className="flex-1">
              <div className={`font-medium flex items-center space-x-2 ${prep.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                <span>{prep.name}</span>
                {prep.hasRecipe && prep.recipe && (
                  <button
                    onClick={() => onShowRecipe(prep.recipe!, prep.name)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                  >
                    📖 Recipe
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {prep.estimatedTime} • {prep.category}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
              {priority?.name || 'Medium'}
            </span>
            <button 
              onClick={() => toggleAssignment(prep)}
              className={`p-1 rounded-full ${
                isAssignedToCurrentUser 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isAssignedToCurrentUser ? 'Unassign yourself' : 'Assign to yourself'}
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Notes section */}
        {(prep.notes || editingNotes === prep.id) && (
          <div className="border-t px-4 py-3 bg-gray-50">
            {editingNotes === prep.id ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600">Notes:</label>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => saveNotes(prep.id)}
                      className="p-1 rounded text-green-600 hover:bg-green-100"
                      title="Save notes"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={cancelEditingNotes}
                      className="p-1 rounded text-red-600 hover:bg-red-100"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add notes about this prep item..."
                />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-600 mb-1">Notes:</div>
                  <p className="text-sm text-gray-700">{prep.notes}</p>
                </div>
                <button
                  onClick={() => startEditingNotes(prep)}
                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Add notes button when no notes and not editing */}
        {!prep.notes && editingNotes !== prep.id && (
          <button 
            onClick={() => startEditingNotes(prep)}
            className="border-t py-1 text-center text-xs text-gray-500 hover:bg-gray-100"
          >
            + Add notes
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Today's Progress */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalToday}</div>
            <div className="text-sm text-blue-700">Total Preps</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0}%
            </div>
            <div className="text-sm text-purple-700">Complete</div>
          </div>
        </div>
      </div>

      {/* Today's Prep List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Prep Tasks</h3>
        
        {todayScheduledPreps.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No prep tasks scheduled for today</p>
            <p className="text-sm">Use the "Plan Preps" tab to schedule tasks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Time Slot Tasks */}
            {timeSlots.map(timeSlot => {
              const slotPreps = todayScheduledPreps.filter(prep => prep.timeSlot === timeSlot.id);
              if (slotPreps.length === 0) return null;
              
              return (
                <div key={timeSlot.id}>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">{timeSlot.icon}</span>
                    {timeSlot.name}
                  </h4>
                  <div className="space-y-3">
                    {slotPreps.map(renderPrepCard)}
                  </div>
                </div>
              );
            })}
            
            {/* Anytime Tasks - Show Last */}
            {(() => {
              const anytimePreps = todayScheduledPreps.filter(prep => prep.timeSlot === '');
              if (anytimePreps.length === 0) return null;
              
              return (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    🕐 Anytime
                  </h4>
                  <div className="space-y-3">
                    {anytimePreps.map(renderPrepCard)}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayView;
