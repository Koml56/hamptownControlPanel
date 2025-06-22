// PrepListPrototype.tsx - Main component for prep list management (Updated with Week View)
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
import WeekView from './WeekView';
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [currentDate, setCurrentDate] = useState(new Date()); // For week view navigation
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

  // Initialize with default prep items if empty
  useEffect(() => {
    if (prepItems.length === 0) {
      const defaultPreps = getDefaultPrepItems();
      setPrepItems(() => defaultPreps);
      quickSave('prepItems', defaultPreps);
    }
  }, [prepItems.length, setPrepItems, quickSave]);

  // Check and move incomplete preps to tomorrow (run once per day)
  useEffect(() => {
    const moveIncompletePreps = () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const todayStr = getDateString(today);
      const yesterdayStr = getDateString(yesterday);
      
      // Find incomplete preps from yesterday
      const incompletePreps = scheduledPreps.filter(prep => 
        prep.scheduledDate === yesterdayStr && !prep.completed
      );
      
      if (incompletePreps.length > 0) {
        console.log(`🔄 Moving ${incompletePreps.length} incomplete preps from ${yesterdayStr} to ${todayStr}`);
        
        // Show notification
        setMovedPrepsNotification(incompletePreps.length);
        setTimeout(() => setMovedPrepsNotification(0), 8000); // Hide after 8 seconds
        
        // Remove from yesterday and add to today
        const movedPreps = incompletePreps.map(prep => ({
          ...prep,
          id: Date.now() + Math.random(), // New ID to avoid conflicts
          scheduledDate: todayStr
        }));
        
        setScheduledPreps(prev => [
          ...prev.filter(prep => 
            !(prep.scheduledDate === yesterdayStr && !prep.completed)
          ),
          ...movedPreps
        ]);
        
        // Update prep selections for today
        const newSelections: PrepSelections = {};
        incompletePreps.forEach(prep => {
          const selectionKey = `${todayStr}-${prep.prepId}`;
          newSelections[selectionKey] = {
            priority: prep.priority,
            timeSlot: prep.timeSlot,
            selected: true
          };
        });
        
        setPrepSelections(prev => ({ ...prev, ...newSelections }));
        
        // Save immediately
        quickSave('scheduledPreps', [
          ...scheduledPreps.filter(prep => 
            !(prep.scheduledDate === yesterdayStr && !prep.completed)
          ),
          ...movedPreps
        ]);
      }
    };
    
    // Check on app load and once per day
    const lastMoveCheck = localStorage.getItem('lastPrepMoveCheck');
    const todayStr = getDateString(new Date());
    
    if (lastMoveCheck !== todayStr) {
      moveIncompletePreps();
      localStorage.setItem('lastPrepMoveCheck', todayStr);
    }
    
    // Set up daily check at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0); // 12:01 AM
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    const midnightTimer = setTimeout(() => {
      moveIncompletePreps();
      localStorage.setItem('lastPrepMoveCheck', getDateString(new Date()));
    }, timeUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [scheduledPreps, setPrepSelections, setScheduledPreps, quickSave]);

  // Show recipe modal
  const showRecipe = (recipe: Recipe, name: string) => {
    setSelectedRecipe(recipe);
    setSelectedRecipeName(name);
    setShowRecipeModal(true);
  };

  // FIXED: Toggle prep completion with proper state updates
  const togglePrepCompletion = (scheduledPrepId: number): void => {
    setScheduledPreps(prev => {
      const updatedScheduledPreps = prev.map(prep => 
        prep.id === scheduledPrepId 
          ? { ...prep, completed: !prep.completed }
          : prep
      );
      
      const toggledPrep = updatedScheduledPreps.find(p => p.id === scheduledPrepId);
      console.log('🔄 Toggling prep completion:', {
        prepId: scheduledPrepId,
        prepName: toggledPrep?.name,
        newCompletedStatus: toggledPrep?.completed,
        totalScheduledPreps: updatedScheduledPreps.length
      });
      
      console.log('🔥 Immediate save triggered by prep completion');
      quickSave('scheduledPreps', updatedScheduledPreps).catch(error => {
        console.error('❌ Failed to save prep completion:', error);
      });
      
      return updatedScheduledPreps;
    });
  };

  // Additional utility functions for Plan View (simplified for brevity)
  const isPrepSelected = (prep: PrepItem): boolean => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    return prepSelections[selectionKey]?.selected || false;
  };

  const togglePrepSelection = (prep: PrepItem): void => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
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
          id: Date.now() + Math.random(),
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

  // Filter preps for Plan View
  const filteredPreps = prepItems.filter(prep => {
    const matchesCategory = selectedCategory === 'all' || prep.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prep.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get selected date's scheduled preps for Plan View
  const selectedDateScheduledPreps = scheduledPreps.filter(prep => 
    prep.scheduledDate === getDateString(selectedDate)
  );

  return (
    <div className="space-y-6">
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
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected' ? 'Synced' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
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
        <TodayView
          scheduledPreps={scheduledPreps}
          onToggleCompletion={togglePrepCompletion}
          onShowRecipe={showRecipe}
        />
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
              {filteredPreps.map(prep => {
                const isSelected = isPrepSelected(prep);

                return (
                  <div key={prep.id} className={`border rounded-lg p-4 transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <button
                          onClick={() => togglePrepSelection(prep)}
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
                            {prep.hasRecipe && (
                              <button
                                onClick={() => prep.recipe && showRecipe(prep.recipe, prep.name)}
                                className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                              >
                                📖 Recipe
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 flex items-center space-x-2">
                            <span>{prep.estimatedTime}</span>
                            <span>•</span>
                            <span>{prep.category}</span>
                            <span>•</span>
                            <span>Every {prep.frequency} days</span>
                            {prep.isCustom && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Custom</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No Results Message */}
            {filteredPreps.length === 0 && searchQuery && (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No prep items found matching "{searchQuery}"</p>
                <p className="text-sm">Try a different search term or browse categories above.</p>
              </div>
            )}
          </div>

          {/* Scheduled Preps for Selected Date */}
          {selectedDateScheduledPreps.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Scheduled for {formatDate(selectedDate).split(',')[0]}
              </h3>
              <div className="space-y-2">
                {selectedDateScheduledPreps.map(prep => {
                  const priority = priorities.find(p => p.id === prep.priority);
                  const timeSlot = timeSlots.find(t => t.id === prep.timeSlot);
                  
                  return (
                    <div key={prep.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{prep.timeSlot ? timeSlot?.icon : '🕐'}</span>
                        <div>
                          <div className="font-medium text-gray-800 flex items-center space-x-2">
                            <span>{prep.name}</span>
                            {prep.hasRecipe && (
                              <button
                                onClick={() => prep.recipe && showRecipe(prep.recipe, prep.name)}
                                className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                              >
                                📖
                              </button>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {prep.timeSlot ? timeSlot?.name : 'Anytime'} • {prep.estimatedTime}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                          {priority?.name || 'Medium'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Week View */}
      {activeView === 'week' && (
        <WeekView
          scheduledPreps={scheduledPreps}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setActiveView={setActiveView}
          onToggleCompletion={togglePrepCompletion}
          onShowRecipe={showRecipe}
        />
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
