// PrepListPrototype.tsx - FIXED: Proper Firebase save for prep completions
import React, { useState, useEffect } from 'react';
import { Calendar, Check, ChefHat, Plus, Search, Users, X } from 'lucide-react';

// Types and constants
import type {
  PrepListPrototypeProps,
  PrepItem,
  ScheduledPrep,
  Recipe,
  Priority,
  PrepSelections
} from './prep-types';
import { categories, timeSlots, priorities, PREP_STYLES } from './prep-constants';
import { getDefaultPrepItems } from './prep-default-data';
import {
  getDateString,
  formatDate,
  getWeekDates,
  getSelectionKey,
  generateUniqueId
} from './prep-utils';

// Components
import TodayView from './TodayView';
import PrepItemCard from './PrepItemCard';
import RecipeModal from './RecipeModal';

const PrepListPrototype: React.FC<PrepListPrototypeProps> = ({
  currentUser,
  connectionStatus,
  prepItems,
  scheduledPreps,
  prepSelections,
  setPrepItems,
  setScheduledPreps,
  setPrepSelections,
  quickSave
}) => {
  // UI State
  const [activeView, setActiveView] = useState('today');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Start with today instead of tomorrow
    return new Date();
  });
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newPrepName, setNewPrepName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeData, setRecipeData] = useState<Recipe>({ ingredients: '', instructions: '' });
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeName, setSelectedRecipeName] = useState<string>('');
  const [showPriorityOptions, setShowPriorityOptions] = useState<number | string | null>(null);
  const [showTimeOptions, setShowTimeOptions] = useState<number | string | null>(null);
  const [assignmentStep, setAssignmentStep] = useState<Record<number, string | null>>({});
  const [showSuggestedPreps, setShowSuggestedPreps] = useState(true);
  const [movedPrepsNotification, setMovedPrepsNotification] = useState<number>(0);

  // FIXED: Track if we're in the middle of a save operation to prevent race conditions
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with default prep items if empty
  useEffect(() => {
    if (prepItems.length === 0) {
      const defaultPreps = getDefaultPrepItems();
      setPrepItems(() => defaultPreps);
      quickSave('prepItems', defaultPreps);
    }
  }, [prepItems.length, setPrepItems, quickSave]);

  // FIXED: Auto-save scheduledPreps whenever they change (but not during save operation)
  useEffect(() => {
    if (scheduledPreps.length > 0 && !isSaving) {
      console.log('🔄 Auto-saving scheduledPreps due to state change');
      
      // Add a small delay to ensure state is fully updated
      const saveTimer = setTimeout(() => {
        quickSave('scheduledPreps', scheduledPreps)
          .then(() => {
            console.log('✅ ScheduledPreps auto-save completed');
          })
          .catch((error) => {
            console.error('❌ ScheduledPreps auto-save failed:', error);
          });
      }, 300);

      return () => clearTimeout(saveTimer);
    }
  }, [scheduledPreps, quickSave, isSaving]);

  // Move incomplete preps from yesterday to today
  useEffect(() => {
    const moveIncompletePreps = () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const todayStr = getDateString(today);
      const yesterdayStr = getDateString(yesterday);

      const incompletePreps = scheduledPreps.filter(prep => 
        prep.scheduledDate === yesterdayStr && !prep.completed
      );
      
      if (incompletePreps.length > 0) {
        console.log(`🔄 Moving ${incompletePreps.length} incomplete preps from ${yesterdayStr} to ${todayStr}`);
        
        setMovedPrepsNotification(incompletePreps.length);
        setTimeout(() => setMovedPrepsNotification(0), 8000);
        
        const movedPreps = incompletePreps.map(prep => ({
          ...prep,
          id: generateUniqueId(),
          scheduledDate: todayStr
        }));
        
        setScheduledPreps(prev => [
          ...prev.filter(prep => 
            !(prep.scheduledDate === yesterdayStr && !prep.completed)
          ),
          ...movedPreps
        ]);
        
        const newSelections: PrepSelections = {};
        incompletePreps.forEach(prep => {
          const selectionKey = getSelectionKey(today, prep.prepId);
          newSelections[selectionKey] = {
            priority: prep.priority,
            timeSlot: prep.timeSlot,
            selected: true
          };
        });
        
        setPrepSelections(prev => ({ ...prev, ...newSelections }));
      }
    };

    const lastMoveCheck = localStorage.getItem('lastPrepMoveCheck');
    const todayStr = getDateString(new Date());

    if (lastMoveCheck !== todayStr) {
      moveIncompletePreps();
      localStorage.setItem('lastPrepMoveCheck', todayStr);
    }
  }, [scheduledPreps, setPrepSelections, setScheduledPreps]);

  // FIXED: Proper prep completion toggle with immediate Firebase save
  const togglePrepCompletion = async (scheduledPrepId: number): Promise<void> => {
    console.log('🔄 Toggling prep completion for ID:', scheduledPrepId);
    
    // Prevent concurrent saves
    if (isSaving) {
      console.log('⏳ Save in progress, skipping...');
      return;
    }

    setIsSaving(true);

    try {
      // Find the prep item to update
      const prepToUpdate = scheduledPreps.find(p => p.id === scheduledPrepId);
      if (!prepToUpdate) {
        console.error('❌ Prep item not found:', scheduledPrepId);
        return;
      }

      const newCompletedStatus = !prepToUpdate.completed;
      console.log(`📋 ${prepToUpdate.name}: ${prepToUpdate.completed ? 'COMPLETED' : 'PENDING'} → ${newCompletedStatus ? 'COMPLETED' : 'PENDING'}`);

      // Update the state
      const updatedScheduledPreps = scheduledPreps.map(prep =>
        prep.id === scheduledPrepId
          ? { ...prep, completed: newCompletedStatus }
          : prep
      );

      // Update state immediately for UI responsiveness
      setScheduledPreps(() => updatedScheduledPreps);

      // CRITICAL: Save to Firebase immediately
      console.log('🔥 Saving prep completion to Firebase...');
      const saveSuccess = await quickSave('scheduledPreps', updatedScheduledPreps);

      if (saveSuccess) {
        console.log('✅ Prep completion saved successfully');
        
        // Log current status for debugging
        const todayStr = getDateString(new Date());
        const todayPreps = updatedScheduledPreps.filter(prep => prep.scheduledDate === todayStr);
        const todayCompleted = todayPreps.filter(prep => prep.completed);
        
        console.log('📊 Today\'s prep status:', {
          total: todayPreps.length,
          completed: todayCompleted.length,
          percentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0
        });
      } else {
        console.error('❌ Failed to save prep completion to Firebase');
        // Revert the state change if save failed
        setScheduledPreps(() => scheduledPreps);
      }

    } catch (error) {
      console.error('❌ Error toggling prep completion:', error);
      // Revert the state change if there was an error
      setScheduledPreps(() => scheduledPreps);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if prep is selected for current date
  const isPrepSelected = (prep: PrepItem): boolean => {
    const selectionKey = getSelectionKey(selectedDate, prep.id);
    return prepSelections[selectionKey]?.selected || false;
  };

  // Get prep selection details
  const getPrepSelection = (prep: PrepItem) => {
    const selectionKey = getSelectionKey(selectedDate, prep.id);
    return prepSelections[selectionKey] || { priority: 'medium' as Priority, timeSlot: '', selected: false };
  };

  // Update prep selection with smart workflow
  const updatePrepSelection = (
    prep: PrepItem,
    field: 'priority' | 'timeSlot',
    value: string,
    context: string = 'main'
  ): void => {
    const selectionKey = getSelectionKey(selectedDate, prep.id);
    const currentSelection = prepSelections[selectionKey] || { priority: 'medium' as Priority, timeSlot: '', selected: false };

    if (field === 'priority') {
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: { 
          ...prev[selectionKey], 
          priority: value as Priority,
          selected: currentSelection.selected
        }
      }));
      
      setAssignmentStep(prev => ({ ...prev, [prep.id]: 'timeSlot' }));
      setShowPriorityOptions(null);
      
      const timeSlotId = context === 'suggested' ? `suggested-${prep.id}` : prep.id;
      setShowTimeOptions(timeSlotId);
      
    } else if (field === 'timeSlot') {
      const updatedSelection = {
        priority: currentSelection.priority,
        timeSlot: value,
        selected: true
      };
      
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: updatedSelection
      }));
      
      const existingScheduledPrep = scheduledPreps.find(p => 
        p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
      );
      
      if (existingScheduledPrep) {
        setScheduledPreps(prev => prev.map(p => 
          p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
            ? { ...p, priority: updatedSelection.priority, timeSlot: value }
            : p
        ));
      } else {
        const newScheduledPrep: ScheduledPrep = {
          id: generateUniqueId(),
          prepId: prep.id,
          name: prep.name,
          category: prep.category,
          estimatedTime: prep.estimatedTime,
          isCustom: prep.isCustom,
          hasRecipe: prep.hasRecipe,
          recipe: prep.recipe,
          scheduledDate: getDateString(selectedDate),
          priority: updatedSelection.priority,
          timeSlot: value,
          completed: false,
          assignedTo: null,
          notes: ''
        };
        setScheduledPreps(prev => [...prev, newScheduledPrep]);
      }
      
      setAssignmentStep(prev => ({ ...prev, [prep.id]: null }));
      setShowPriorityOptions(null);
      setShowTimeOptions(null);
    }
  };

  // Reset workflow when clicking outside
  const resetWorkflow = () => {
    setShowPriorityOptions(null);
    setShowTimeOptions(null);
    setAssignmentStep({});
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;
      const isInsideDropdown = target.closest('.dropdown-container');
      if (!isInsideDropdown) {
        resetWorkflow();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show recipe modal
  const showRecipe = (recipe: Recipe, name: string) => {
    setSelectedRecipe(recipe);
    setSelectedRecipeName(name);
    setShowRecipeModal(true);
  };

  // Toggle prep selection
  const togglePrepSelection = (prep: PrepItem): void => {
    const selectionKey = getSelectionKey(selectedDate, prep.id);
    const isSelected = prepSelections[selectionKey]?.selected;

    if (isSelected) {
      setPrepSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[selectionKey];
        return newSelections;
      });
      
      setScheduledPreps(prev => prev.filter(p => 
        !(p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate))
      ));
    } else {
      const existingScheduledPrep = scheduledPreps.find(p => 
        p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
      );
      
      if (existingScheduledPrep) {
        setPrepSelections(prev => ({
          ...prev,
          [selectionKey]: { 
            priority: existingScheduledPrep.priority, 
            timeSlot: existingScheduledPrep.timeSlot, 
            selected: true 
          }
        }));
      } else {
        const newSelection = { priority: 'medium' as Priority, timeSlot: '', selected: true };
        setPrepSelections(prev => ({
          ...prev,
          [selectionKey]: newSelection
        }));
        
        const newScheduledPrep: ScheduledPrep = {
          id: generateUniqueId(),
          prepId: prep.id,
          name: prep.name,
          category: prep.category,
          estimatedTime: prep.estimatedTime,
          isCustom: prep.isCustom,
          hasRecipe: prep.hasRecipe,
          recipe: prep.recipe,
          scheduledDate: getDateString(selectedDate),
          priority: 'medium',
          timeSlot: '',
          completed: false,
          assignedTo: null,
          notes: ''
        };
        setScheduledPreps(prev => [...prev, newScheduledPrep]);
      }
    }
  };

  // Add custom prep
  const addCustomPrep = () => {
    if (!newPrepName.trim()) return;

    const customPrep: PrepItem = {
      id: Date.now(),
      name: newPrepName.trim(),
      category: selectedCategory === 'all' ? 'majoneesit' : selectedCategory,
      estimatedTime: '20 min',
      isCustom: true,
      hasRecipe: showRecipeForm,
      frequency: 2,
      recipe: showRecipeForm ? {
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions
      } : null
    };

    setPrepItems(prev => [...prev, customPrep]);
    setNewPrepName('');
    setShowAddCustom(false);
    setShowRecipeForm(false);
    setRecipeData({ ingredients: '', instructions: '' });
    setSelectedCategory('majoneesit');

    togglePrepSelection(customPrep);
  };

  // Filter preps
  const filteredPreps = prepItems.filter(prep => {
    const matchesCategory = selectedCategory === 'all' || prep.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prep.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: PREP_STYLES }} />

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <ChefHat className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Prep List Manager</h1>
              <p className="text-gray-600">Plan and track kitchen preparation tasks</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isSaving && (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                <span className="text-sm">Saving...</span>
              </div>
            )}
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected' ? 'Synced' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('today')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeView === 'today' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Check className="w-4 h-4 mr-2" />
            Today's Preps
          </button>
          <button
            onClick={() => setActiveView('plan')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeView === 'plan' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Plan Preps
          </button>
          <button
            onClick={() => setActiveView('week')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeView === 'week' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Week View
          </button>
        </div>
      </div>

      {/* Moved Preps Notification */}
      {movedPrepsNotification > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                📅 Prep items moved to today
              </h3>
              <div className="mt-1 text-sm text-blue-600">
                {movedPrepsNotification} incomplete prep{movedPrepsNotification > 1 ? 's' : ''} from yesterday {movedPrepsNotification > 1 ? 'have' : 'has'} been automatically moved to today's schedule.
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => setMovedPrepsNotification(0)}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Preps View */}
      {activeView === 'today' && (
        <>
          {/* Debug Info Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-800 mb-2">🔍 Debug Info</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-700">Today's Date</div>
                <div className="text-blue-600">{getDateString(new Date())}</div>
              </div>
              <div>
                <div className="font-medium text-blue-700">Total Scheduled</div>
                <div className="text-blue-600">{scheduledPreps.length}</div>
              </div>
              <div>
                <div className="font-medium text-blue-700">Today's Preps</div>
                <div className="text-blue-600">
                  {scheduledPreps.filter(prep => prep.scheduledDate === getDateString(new Date())).length}
                </div>
              </div>
              <div>
                <div className="font-medium text-blue-700">Connection</div>
                <div className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>
                  {connectionStatus}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="font-medium text-blue-700 mb-1">All Scheduled Dates:</div>
              <div className="text-blue-600 text-xs">
                {Array.from(new Set(scheduledPreps.map(p => p.scheduledDate))).sort().join(', ') || 'None'}
              </div>
            </div>
            {scheduledPreps.length > 0 && (
              <div className="mt-2">
                <div className="font-medium text-blue-700 mb-1">Sample Preps:</div>
                <div className="text-blue-600 text-xs">
                  {scheduledPreps.slice(0, 3).map(p => 
                    `${p.name} (${p.scheduledDate})${p.completed ? ' ✅' : ' ⏳'}`
                  ).join(' | ')}
                </div>
              </div>
            )}
          </div>

          <TodayView
            scheduledPreps={scheduledPreps}
            onToggleCompletion={togglePrepCompletion}
            onShowRecipe={showRecipe}
          />
        </>
      )}

      {/* Plan View */}
      {activeView === 'plan' && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Date to Plan</h3>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={getDateString(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-gray-600">
                Planning for: <strong>{formatDate(selectedDate)}</strong>
              </div>
            </div>
          </div>

          {/* Choose Prep Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Choose Prep Items</h3>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  showSearch ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </button>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search prep items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border-0 bg-transparent focus:outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === category.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Prep Items List */}
            <div className="space-y-3">
              {filteredPreps.map(prep => (
                <PrepItemCard
                  key={prep.id}
                  prep={prep}
                  isSelected={isPrepSelected(prep)}
                  selection={getPrepSelection(prep)}
                  showPriorityOptions={showPriorityOptions}
                  showTimeOptions={showTimeOptions}
                  assignmentStep={assignmentStep}
                  onToggleSelection={togglePrepSelection}
                  onUpdateSelection={updatePrepSelection}
                  onShowPriorityOptions={setShowPriorityOptions}
                  onShowRecipe={showRecipe}
                  context="main"
                />
              ))}
            </div>

            {/* Add Custom Prep */}
            <div className="mt-6 pt-6 border-t">
              {!showAddCustom ? (
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="flex items-center px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Prep Item
                </button>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-800 mb-4">Add Custom Prep</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prep Name</label>
                      <input
                        type="text"
                        value={newPrepName}
                        onChange={(e) => setNewPrepName(e.target.value)}
                        placeholder="e.g., Prep special sauce"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={selectedCategory === 'all' ? 'majoneesit' : selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {categories.slice(1).map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={addCustomPrep}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Add Prep
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCustom(false);
                        setNewPrepName('');
                        setShowRecipeForm(false);
                        setRecipeData({ ingredients: '', instructions: '' });
                        setSelectedCategory('majoneesit');
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Week View - Placeholder */}
      {activeView === 'week' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Week View</h3>
          <p className="text-gray-600">Week view implementation coming soon...</p>
        </div>
      )}

      {/* Recipe Modal */}
      <RecipeModal
        isOpen={showRecipeModal}
        recipe={selectedRecipe}
        recipeName={selectedRecipeName}
        onClose={() => setShowRecipeModal(false)}
      />
    </div>
  );
};

export default PrepListPrototype;
