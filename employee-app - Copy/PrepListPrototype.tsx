import React, { useState, useEffect } from 'react';
import { 
  PrepItem, 
  ScheduledPrep, 
  PrepSelections, 
  Priority,
  Recipe,
  ConnectionStatus
} from './types';
import { Calendar, Clock, Plus, ChefHat, Check, Star, Trash2, Users, Search, X } from 'lucide-react';
interface TimeSlot {
  id: string;
  name: string;
  icon: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface PriorityInfo {
  id: Priority;
  name: string;
  color: string;
  icon: string;
}

interface PrepListPrototypeProps {
  currentUser: { id: number; name: string; };
  loadFromFirebase: () => Promise<void>;
  saveToFirebase: () => void;
  quickSave: (field: string, data: any) => Promise<void>;
  connectionStatus: ConnectionStatus;
}

const PrepListPrototype: React.FC<PrepListPrototypeProps> = ({ 
  currentUser,
  loadFromFirebase,
  saveToFirebase,
  quickSave,
  connectionStatus
}): JSX.Element => {
  // Date handling
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  // Initialize with default preps
  const defaultPreps: PrepItem[] = [
    { id: 1, name: 'Cut lettuce for salads', category: 'vegetables', estimatedTime: '15 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 2, name: 'Dice tomatoes', category: 'vegetables', estimatedTime: '10 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 3, name: 'Slice onions', category: 'vegetables', estimatedTime: '15 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 4, name: 'Prep cucumber slices', category: 'vegetables', estimatedTime: '10 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 5, name: 'Make coleslaw mix', category: 'vegetables', estimatedTime: '20 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 6, name: 'Marinate chicken breasts', category: 'proteins', estimatedTime: '30 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 7, name: 'Season burger patties', category: 'proteins', estimatedTime: '20 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 8, name: 'Prep fish portions', category: 'proteins', estimatedTime: '25 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 9, name: 'Make meatball mix', category: 'proteins', estimatedTime: '40 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 10, name: 'Mix ranch dressing', category: 'sauces', estimatedTime: '10 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 11, name: 'Prepare garlic aioli', category: 'sauces', estimatedTime: '15 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 12, name: 'Make burger sauce', category: 'sauces', estimatedTime: '10 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 13, name: 'Prep pizza sauce', category: 'sauces', estimatedTime: '20 min', isCustom: false, hasRecipe: true, recipe: null },
    { id: 14, name: 'Slice bread for sandwiches', category: 'breads', estimatedTime: '10 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 15, name: 'Prep garlic bread', category: 'breads', estimatedTime: '15 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 16, name: 'Cut fries', category: 'sides', estimatedTime: '30 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 17, name: 'Prep soup base', category: 'sides', estimatedTime: '45 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 18, name: 'Mix cake batter', category: 'desserts', estimatedTime: '25 min', isCustom: false, hasRecipe: false, recipe: null },
    { id: 19, name: 'Prep ice cream toppings', category: 'desserts', estimatedTime: '15 min', isCustom: false, hasRecipe: false, recipe: null },
  ];

  // UI State
  const [activeView, setActiveView] = useState('today');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to tomorrow for planning view, today for current view
    return activeView === 'plan' ? getTomorrowDate() : new Date();
  });
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newPrepName, setNewPrepName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeData, setRecipeData] = useState<Recipe>({
    ingredients: '',
    instructions: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showPriorityOptions, setShowPriorityOptions] = useState<number | string | null>(null);
  const [showTimeOptions, setShowTimeOptions] = useState<number | string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [assignmentStep, setAssignmentStep] = useState<Record<number, string | null>>({});
  const [shownRecipe, setShownRecipe] = useState<number | null>(null);

  // Firebase-synced state
  const [allPreps, setAllPreps] = useState<PrepItem[]>(defaultPreps);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});


  const categories: Category[] = [
    { id: 'all', name: 'All Items', icon: '🍽️' },
    { id: 'vegetables', name: 'Vegetables', icon: '🥗' },
    { id: 'proteins', name: 'Proteins', icon: '🥩' },
    { id: 'sauces', name: 'Sauces', icon: '🧂' },
    { id: 'breads', name: 'Breads', icon: '🍞' },
    { id: 'sides', name: 'Sides', icon: '🍟' },
    { id: 'desserts', name: 'Desserts', icon: '🍰' }
  ];

  const timeSlots: TimeSlot[] = [
    { id: 'morning', name: 'Morning (6-10 AM)', icon: '🌅' },
    { id: 'midday', name: 'Mid-day (10 AM-2 PM)', icon: '☀️' },
    { id: 'afternoon', name: 'Afternoon (2-6 PM)', icon: '🌤️' },
    { id: 'evening', name: 'Evening (6-10 PM)', icon: '🌆' }
  ];

  const priorities: PriorityInfo[] = [
    { id: 'low', name: 'Low', color: 'bg-green-100 text-green-700', icon: '🟢' },
    { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
    { id: 'high', name: 'High', color: 'bg-red-100 text-red-700', icon: '🔴' }
  ];

  // Utility functions
  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Check if prep is selected for current date
  const isPrepSelected = (prep: PrepItem): boolean => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    return prepSelections[selectionKey]?.selected || false;
  };

  // Get prep selection details
  const getPrepSelection = (prep: PrepItem) => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    return prepSelections[selectionKey] || { priority: 'medium', timeSlot: '', selected: false };
  };

  // Toggle prep selection
  const togglePrepSelection = (prep: PrepItem): void => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    const isSelected = prepSelections[selectionKey]?.selected;
    
    if (isSelected) {
      // Remove selection
      setPrepSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[selectionKey];
        return newSelections;
      });
      
      // Remove from scheduled preps
      setScheduledPreps(prev => prev.filter(p => 
        !(p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate))
      ));
    } else {
      // Add selection with defaults
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: { priority: 'medium', timeSlot: '', selected: true }
      }));
      
      // Add to scheduled preps
      const newScheduledPrep: ScheduledPrep = {
        id: Date.now(),
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
  };

  // Update prep priority or time slot with smart workflow
  const updatePrepSelection = (
    prep: PrepItem, 
    field: 'priority' | 'timeSlot', 
    value: string, 
    context: string = 'main'
  ): void => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    
    if (field === 'priority') {
      // Step 1: Set priority and immediately move to time slot selection
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: { 
          ...prev[selectionKey], 
          priority: value,
          selected: false // Don't auto-select yet
        }
      }));
      
      // Move to time slot selection step and immediately open time dropdown with context
      setAssignmentStep(prev => ({ ...prev, [prep.id]: 'timeSlot' }));
      setShowPriorityOptions(null);
      
      // Use context-specific time slot identifier
      const timeSlotId = context === 'suggested' ? `suggested-${prep.id}` : prep.id;
      setShowTimeOptions(timeSlotId);
      
    } else if (field === 'timeSlot') {
      // Step 2: Set time slot, auto-check, and complete workflow
      const currentSelection = prepSelections[selectionKey] || { priority: 'medium' };
      
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: { 
          ...prev[selectionKey], 
          timeSlot: value,
          selected: true // Auto-select when time is chosen
        }
      }));
      
      // Auto-add to scheduled preps
      if (!isPrepSelected(prep)) {
      const newScheduledPrep: ScheduledPrep = {
          id: Date.now(),
          prepId: prep.id,
          name: prep.name,
          category: prep.category,
          estimatedTime: prep.estimatedTime,
          isCustom: prep.isCustom,
          hasRecipe: prep.hasRecipe,
          recipe: prep.recipe,
          scheduledDate: getDateString(selectedDate),
          priority: currentSelection.priority,
          timeSlot: value,
          completed: false,
          assignedTo: null,
          notes: ''
        };
        setScheduledPreps(prev => [...prev, newScheduledPrep]);
      } else {
        // Update existing scheduled prep
        setScheduledPreps(prev => prev.map(p => 
          p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
            ? { ...p, priority: currentSelection.priority, timeSlot: value }
            : p
        ));
      }
      
      // Complete the workflow - close all dropdowns
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

  // Add click outside handler
  useEffect(() => {
  const handleClickOutside = (event: MouseEvent): void => {
    // Check if click is inside any dropdown
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

  // Add custom prep
  const addCustomPrep = () => {
    if (!newPrepName.trim()) return;
    
    const customPrep = {
      id: Date.now(),
      name: newPrepName.trim(),
      category: selectedCategory === 'all' ? 'vegetables' : selectedCategory,
      estimatedTime: '20 min',
      isCustom: true,
      hasRecipe: showRecipeForm,
      recipe: showRecipeForm ? {
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions
      } : null
    };
    
    setAllPreps(prev => [...prev, customPrep]);
    setNewPrepName('');
    setShowAddCustom(false);
    
    // Auto-select the new custom prep
    togglePrepSelection(customPrep);
  };

  // Toggle task completion (for today's view)
  const togglePrepCompletion = (scheduledPrepId: number): void => {
    setScheduledPreps(prev => prev.map(prep => 
      prep.id === scheduledPrepId 
        ? { ...prep, completed: !prep.completed }
        : prep
    ));
  };

  // Filter preps
  const filteredPreps = allPreps.filter(prep => {
    const matchesCategory = selectedCategory === 'all' || prep.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prep.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get today's scheduled preps
  const todayScheduledPreps = scheduledPreps.filter(prep => 
    prep.scheduledDate === getDateString(currentDate)
  );

  // Get selected date's scheduled preps
  const selectedDateScheduledPreps = scheduledPreps.filter(prep => 
    prep.scheduledDate === getDateString(selectedDate)
  );

  const completedToday = todayScheduledPreps.filter(prep => prep.completed).length;
  const totalToday = todayScheduledPreps.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <style dangerouslySetInnerHTML={{
        __html: `
          .priority-glow {
            position: relative;
            z-index: 0;
            font-weight: 600;
            border-radius: 0.25rem;
            padding: 0.125rem 0.25rem;
          }
          .priority-glow::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            width: 110%;
            height: 2em;
            transform: translate(-50%, -50%);
            border-radius: 0.375rem;
            filter: blur(6px);
            z-index: -1;
            opacity: 0.3;
          }
          .priority-low {
            color: #047857;
          }
          .priority-low::before {
            box-shadow: 0 0 8px 4px rgba(5, 150, 105, 0.4);
          }
          .priority-medium {
            color: #92400e;
          }
          .priority-medium::before {
            box-shadow: 0 0 8px 4px rgba(202, 138, 4, 0.4);
          }
          .priority-high {
            color: #b91c1c;
          }
          .priority-high::before {
            box-shadow: 0 0 8px 4px rgba(185, 28, 28, 0.4);
          }
          .priority-urgent {
            color: #7c2d12;
          }
          .priority-urgent::before {
            box-shadow: 0 0 8px 4px rgba(147, 51, 234, 0.4);
          }
          
          /* Soft blurry dropdown styles */
          .soft-dropdown {
            backdrop-filter: blur(16px);
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
          
          /* Soft button styles */
          .soft-button {
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
          
          .soft-button:hover {
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
        `
      }} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ChefHat className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Prep List Manager</h1>
                <p className="text-gray-600">Plan and track kitchen preparation tasks</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-800">
                {formatDate(currentDate)}
              </div>
              <div className="text-sm text-gray-600">
                {completedToday}/{totalToday} preps completed today
              </div>
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

        {/* Today's Preps View */}
        {activeView === 'today' && (
          <div className="space-y-6">
            {/* Today's Progress */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Progress</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalToday}</div>
                  <div className="text-sm text-blue-700">Total Preps</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{completedToday}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalToday - completedToday}</div>
                  <div className="text-sm text-orange-700">Remaining</div>
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
                  {/* Anytime Tasks */}
                  {(() => {
                    const anytimePreps = todayScheduledPreps.filter(prep => prep.timeSlot === '');
                    if (anytimePreps.length === 0) return null;
                    
                    return (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                          🕐 Anytime
                        </h4>
                        <div className="space-y-3">
                          {anytimePreps.map(prep => {
                            const priority = priorities.find(p => p.id === prep.priority);
                            return (
                              <div key={prep.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                  <button
                                    onClick={() => togglePrepCompletion(prep.id)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                      prep.completed 
                                        ? 'bg-green-500 border-green-500' 
                                        : 'border-gray-300 hover:border-green-500'
                                    }`}
                                  >
                                    {prep.completed && <Check className="w-4 h-4 text-white" />}
                                  </button>
                                  <div>
                                    <div className={`font-medium ${prep.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                      {prep.name}
                                    </div>
                                                        <div className="flex items-center space-x-2">
                                                          <div className="text-sm text-gray-600">
                                                            {prep.estimatedTime} • {prep.category}
                                                          </div>
                                                          {prep.hasRecipe && (
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShownRecipe(shownRecipe === prep.id ? null : prep.id);
                                                              }}
                                                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                                                            >
                                                              View Recipe
                                                            </button>
                                                          )}
                                                        </div>
                                                          {shownRecipe === prep.id && prep.recipe && (
                                                            <div className="mt-2 p-4 bg-blue-50 text-blue-700 rounded-lg text-sm">
                                                              <div className="mb-2">
                                                                <strong className="block text-blue-800 mb-1">Ingredients:</strong>
                                                                <pre className="whitespace-pre-wrap">{prep.recipe.ingredients}</pre>
                                                              </div>
                                                              <div>
                                                                <strong className="block text-blue-800 mb-1">Instructions:</strong>
                                                                <pre className="whitespace-pre-wrap">{prep.recipe.instructions}</pre>
                                                              </div>
                                                            </div>
                                                          )}
                                  </div>
                                </div>
                                    <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                                      {priority?.name || 'Medium'}
                                    </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  
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
                          {slotPreps.map(prep => {
                            const priority = priorities.find(p => p.id === prep.priority);
                            return (
                              <div key={prep.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                  <button
                                    onClick={() => togglePrepCompletion(prep.id)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                      prep.completed 
                                        ? 'bg-green-500 border-green-500' 
                                        : 'border-gray-300 hover:border-green-500'
                                    }`}
                                  >
                                    {prep.completed && <Check className="w-4 h-4 text-white" />}
                                  </button>
                                  <div>
                                    <div className={`font-medium ${prep.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                      {prep.name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {prep.estimatedTime} • {prep.category}
                                    </div>
                                  </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                                  {priority?.name || 'Medium'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plan Preps View */}
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

              {/* Suggested Preps - Items not done recently */}
              {(() => {
                // Calculate suggested preps (not done in last 2 days)
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                
                const suggestedPreps = allPreps.filter(prep => {
                  // Check if this prep was completed in the last 2 days
                  const recentCompletions = scheduledPreps.filter(scheduledPrep => {
                    if (scheduledPrep.prepId !== prep.id) return false;
                    const scheduledDate = new Date(scheduledPrep.scheduledDate);
                    return scheduledDate >= twoDaysAgo && scheduledPrep.completed;
                  });
                  
                  // Also check if it matches current filters
                  const matchesCategory = selectedCategory === 'all' || prep.category === selectedCategory;
                  const matchesSearch = searchQuery === '' || 
                    prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    prep.category.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  return recentCompletions.length === 0 && matchesCategory && matchesSearch;
                }).slice(0, 3); // Show max 3 suggestions
                
                if (suggestedPreps.length === 0) return null;
                
                return (
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-3 flex items-center">
                      🕐 Suggested Preps (Not done in 2+ days)
                    </h4>
                    <div className="space-y-2">
                      {suggestedPreps.map(prep => {
                        const isSelected = isPrepSelected(prep);
                        const selection = getPrepSelection(prep);
                        
                        return (
                          <div key={`suggested-${prep.id}`} className={`border rounded-lg p-3 transition-colors ${
                            isSelected ? 'border-orange-500 bg-orange-100' : 'border-orange-300 hover:border-orange-400 bg-white'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <button
                                  onClick={() => togglePrepSelection(prep)}
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isSelected 
                                      ? 'bg-orange-500 border-orange-500' 
                                      : 'border-orange-400 hover:border-orange-500'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <h5 className={`font-medium text-sm truncate ${isSelected ? 'text-orange-900' : 'text-orange-800'}`}>
                                    {prep.name}
                                  </h5>
                                  <p className="text-xs text-orange-600 truncate">
                                    {prep.estimatedTime} • {prep.category}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="ml-3 flex-shrink-0">
                                <div className="relative">
                                  <button
                                    onClick={() => {
                                      if (showPriorityOptions === `suggested-${prep.id}`) {
                                        resetWorkflow();
                                      } else {
                                        setShowPriorityOptions(`suggested-${prep.id}`);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                                      isSelected 
                                        ? priorities.find(p => p.id === selection.priority)?.color + ' font-medium'
                                        : assignmentStep[prep.id] === 'timeSlot'
                                        ? 'bg-green-100 text-green-700 font-medium'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                  >
                                    {isSelected 
                                      ? `${priorities.find(p => p.id === selection.priority)?.name}${selection.timeSlot ? ` • ${timeSlots.find(t => t.id === selection.timeSlot)?.name.split(' ')[0]}` : ' • Anytime'}`
                                      : assignmentStep[prep.id] === 'timeSlot'
                                      ? 'Choose time'
                                      : 'Click to assign'
                                    }
                                  </button>
                                  
                                  {showPriorityOptions === `suggested-${prep.id}` && (
                                    <div className="dropdown-container soft-dropdown absolute top-full right-0 mt-2 rounded-xl p-3 z-20 w-52">
                                      <div className="space-y-3">
                                        <div>
                                          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                            Choose Priority
                                          </div>
                                          <div className="space-y-2">
                                            {priorities.map(priority => (
                                              <button
                                                key={priority.id}
                                                onClick={() => updatePrepSelection(prep, 'priority', priority.id, 'suggested')}
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

                                  {showTimeOptions === `suggested-${prep.id}` && (
                                    <div className="dropdown-container soft-dropdown absolute top-full right-0 mt-2 rounded-xl p-3 z-20 w-64">
                                      <div className="space-y-3">
                                        <div>
                                          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                            Choose Time Slot
                                          </div>
                                          <div className="space-y-2">
                                            <button
                                              onClick={() => updatePrepSelection(prep, 'timeSlot', '', 'suggested')}
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
                                                onClick={() => updatePrepSelection(prep, 'timeSlot', slot.id, 'suggested')}
                                                className="soft-button w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span>{slot.name.split(' ')[0]}</span>
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
                        );
                      })}
                    </div>
                    <div className="mt-2 text-xs text-orange-600">
                      💡 These prep items haven't been completed recently and might need attention
                    </div>
                  </div>
                );
              })()}

              {/* Prep Items List */}
              <div className="space-y-3">
                {filteredPreps.map(prep => {
                  const isSelected = isPrepSelected(prep);
                  const selection = getPrepSelection(prep);

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
                            <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                              {prep.name}
                            </h4>
                            <div>
                              <p className="text-sm text-gray-600 flex items-center space-x-2">
                                <span>{prep.estimatedTime}</span>
                                <span>•</span>
                                <span>{prep.category}</span>
                                {prep.isCustom && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Custom</span>}
                              {prep.hasRecipe && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShownRecipe(shownRecipe === prep.id ? null : prep.id);
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                                >
                                  View Recipe
                                </button>
                              )}
                            </p>
                            {shownRecipe === prep.id && prep.recipe && (
                              <div className="mt-2 p-4 bg-blue-50 text-blue-700 rounded-lg text-sm">
                                <div className="mb-2">
                                  <strong className="block text-blue-800 mb-1">Ingredients:</strong>
                                  <div 
                                    className="whitespace-pre-wrap markdown"
                                    dangerouslySetInnerHTML={{
                                      __html: prep.recipe.ingredients
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                        .replace(/\n/g, '<br/>')
                                    }}
                                  />
                                </div>
                                <div>
                                  <strong className="block text-blue-800 mb-1">Instructions:</strong>
                                  <div 
                                    className="whitespace-pre-wrap markdown"
                                    dangerouslySetInnerHTML={{
                                      __html: prep.recipe.instructions
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                        .replace(/\n/g, '<br/>')
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            </div>
                            
                            <div className="mt-2">
                              <div className="relative w-2/3">
                                <button
                                  onClick={() => {
                                    if (showPriorityOptions === prep.id) {
                                      resetWorkflow();
                                    } else {
                                      setShowPriorityOptions(prep.id);
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
                                
                                {showPriorityOptions === prep.id && (
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
                                              onClick={() => updatePrepSelection(prep, 'priority', priority.id, 'main')}
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

                                {showTimeOptions === prep.id && (
                                  <div className="dropdown-container soft-dropdown absolute top-full left-0 mt-2 rounded-xl p-3 z-20 w-full min-w-64 max-w-sm">
                                    <div className="space-y-3">
                                      <div>
                                        <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                          Choose Time Slot
                                        </div>
                                        <div className="space-y-2">
                                          <button
                                            onClick={() => updatePrepSelection(prep, 'timeSlot', '', 'main')}
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
                                              onClick={() => updatePrepSelection(prep, 'timeSlot', slot.id, 'main')}
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
                          value={selectedCategory === 'all' ? 'vegetables' : selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {categories.slice(1).map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center mt-2">
                        <label className="flex items-center space-x-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={showRecipeForm}
                            onChange={(e) => setShowRecipeForm(e.target.checked)}
                            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                          />
                          <span>Add Recipe</span>
                        </label>
                      </div>
                      {showRecipeForm && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
                            <div className="mb-2 flex space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById('ingredients-textarea') as HTMLTextAreaElement;
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const selection = text.substring(start, end);
                                  const after = text.substring(end);
                                  const newText = before + '**' + selection + '**' + after;
                                  setRecipeData(prev => ({ ...prev, ingredients: newText }));
                                }}
                                className="px-2 py-1 bg-gray-100 rounded text-sm font-bold hover:bg-gray-200"
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById('ingredients-textarea') as HTMLTextAreaElement;
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const selection = text.substring(start, end);
                                  const after = text.substring(end);
                                  const newText = before + '*' + selection + '*' + after;
                                  setRecipeData(prev => ({ ...prev, ingredients: newText }));
                                }}
                                className="px-2 py-1 bg-gray-100 rounded text-sm italic hover:bg-gray-200"
                              >
                                I
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById('ingredients-textarea') as HTMLTextAreaElement;
                                  const start = textarea.selectionStart;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const after = text.substring(start);
                                  const newText = before + '\n• ' + after;
                                  setRecipeData(prev => ({ ...prev, ingredients: newText }));
                                }}
                                className="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                              >
                                •
                              </button>
                            </div>
                            <textarea
                              id="ingredients-textarea"
                              value={recipeData.ingredients}
                              onChange={(e) => setRecipeData(prev => ({ ...prev, ingredients: e.target.value }))}
                              placeholder="Enter ingredients (one per line)&#10;Use formatting buttons above to style text&#10;Example:&#10;• **2 cups** flour&#10;• *1 tsp* salt"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-32 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                            <div className="mb-2 flex space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById('instructions-textarea') as HTMLTextAreaElement;
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const selection = text.substring(start, end);
                                  const after = text.substring(end);
                                  const newText = before + '**' + selection + '**' + after;
                                  setRecipeData(prev => ({ ...prev, instructions: newText }));
                                }}
                                className="px-2 py-1 bg-gray-100 rounded text-sm font-bold hover:bg-gray-200"
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById('instructions-textarea') as HTMLTextAreaElement;
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const selection = text.substring(start, end);
                                  const after = text.substring(end);
                                  const newText = before + '*' + selection + '*' + after;
                                  setRecipeData(prev => ({ ...prev, instructions: newText }));
                                }}
                                className="px-2 py-1 bg-gray-100 rounded text-sm italic hover:bg-gray-200"
                              >
                                I
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById('instructions-textarea') as HTMLTextAreaElement;
                                  const start = textarea.selectionStart;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const after = text.substring(start);
                                  const newText = before + '\n1. ' + after;
                                  setRecipeData(prev => ({ ...prev, instructions: newText }));
                                }}
                                className="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                              >
                                1.
                              </button>
                            </div>
                            <textarea
                              id="instructions-textarea"
                              value={recipeData.instructions}
                              onChange={(e) => setRecipeData(prev => ({ ...prev, instructions: e.target.value }))}
                              placeholder="Enter cooking instructions&#10;Use formatting buttons above to style text&#10;Example:&#10;1. Mix **flour** and *salt*&#10;2. Add water slowly"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-32 font-mono"
                            />
                          </div>
                        </div>
                      )}
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
                            <div className="font-medium text-gray-800">{prep.name}</div>
                            <div className="text-sm text-gray-600">
                              {prep.timeSlot ? timeSlot?.name : 'Anytime'} • {prep.estimatedTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                                  {priority?.name || 'Medium'}
                                </span>
                          <button
                            onClick={() => {
                              // Remove from scheduled preps
                              setScheduledPreps(prev => prev.filter(p => 
                                !(p.prepId === prep.prepId && p.scheduledDate === prep.scheduledDate)
                              ));
                              // Remove from selections
                              const selectionKey = `${prep.scheduledDate}-${prep.prepId}`;
                              setPrepSelections(prev => {
                                const newSelections = { ...prev };
                                delete newSelections[selectionKey];
                                return newSelections;
                              });
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
          <div className="space-y-6">
            {/* Week Navigation */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Week Overview</h3>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setDate(newDate.getDate() - 7);
                      setCurrentDate(newDate);
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                  >
                    ← Previous Week
                  </button>
                  <button 
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setDate(newDate.getDate() + 7);
                      setCurrentDate(newDate);
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                  >
                    Next Week →
                  </button>
                </div>
              </div>
              
              {/* Week Calendar Grid */}
              <div className="space-y-3">
                {getWeekDates().map((date, index) => {
                  const datePreps = scheduledPreps.filter(prep => 
                    prep.scheduledDate === getDateString(date)
                  );
                  const completed = datePreps.filter(prep => prep.completed).length;
                  const isToday = getDateString(date) === getDateString(new Date());
                  const isSelected = getDateString(date) === getDateString(selectedDate);
                  const isExpanded = expandedDay === getDateString(date);
                  
                  return (
                    <div 
                      key={index} 
                      className={`border rounded-xl transition-all duration-500 ease-in-out overflow-hidden ${
                        isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                      } ${
                        isToday ? 'ring-2 ring-blue-500' : 
                        isSelected && !isExpanded ? 'ring-2 ring-purple-500' :
                        isExpanded ? 'ring-2 ring-green-500 shadow-lg' :
                        'hover:shadow-md'
                      }`}
                    >
                      {/* Day Header - Always Visible */}
                      <div 
                        className={`flex items-center cursor-pointer transition-all duration-300 ${
                          isExpanded ? 'p-4 bg-white border-b' : 'p-4'
                        }`}
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedDay(null);
                          } else {
                            setExpandedDay(getDateString(date));
                          }
                        }}
                      >
                        {/* Date Info */}
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="font-medium text-gray-800 text-sm">
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`text-2xl font-bold ${
                              isToday ? 'text-blue-600' : 
                              isSelected && !isExpanded ? 'text-purple-600' :
                              isExpanded ? 'text-green-600' :
                              'text-gray-600'
                            }`}>
                              {date.getDate()}
                            </div>
                            {isToday && (
                              <div className="text-xs text-blue-600 font-medium">Today</div>
                            )}
                            {isSelected && !isToday && !isExpanded && (
                              <div className="text-xs text-purple-600 font-medium">Selected</div>
                            )}
                            {isExpanded && (
                              <div className="text-xs text-green-600 font-medium">Expanded</div>
                            )}
                          </div>
                          
                          {/* Quick Summary */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="text-sm text-gray-600">
                                {completed}/{datePreps.length} tasks
                              </div>
                              {datePreps.length > 0 && (
                                <div className="flex-1 max-w-32">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        completed === datePreps.length ? 'bg-green-500' :
                                        completed > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                      }`}
                                      style={{ width: `${(completed / datePreps.length) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Quick preview for collapsed state */}
                            {!isExpanded && datePreps.length > 0 && (
                              <div className="text-xs mt-1">
                                {datePreps.slice(0, 2).map((prep, idx) => {
                                  const priority = priorities.find(p => p.id === prep.priority);
                                  return (
                                    <span key={prep.id} className={`priority-glow priority-${prep.priority} ${idx > 0 ? 'ml-1' : ''}`}>
                                      {prep.name}
                                      {idx < Math.min(datePreps.length, 2) - 1 && ', '}
                                    </span>
                                  );
                                })}
                                {datePreps.length > 2 && <span className="text-gray-500 ml-1">+{datePreps.length - 2} more</span>}
                              </div>
                            )}
                            
                            {!isExpanded && datePreps.length === 0 && (
                              <div className="text-xs text-gray-400 mt-1 italic">
                                No preps scheduled
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Expand/Collapse Arrow */}
                        <div className={`transform transition-transform duration-300 ${
                          isExpanded ? 'rotate-180' : 'rotate-0'
                        }`}>
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Expanded Content */}
                      <div className={`transition-all duration-500 ease-in-out ${
                        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        {isExpanded && (
                          <div className="p-4 space-y-3">
                            {datePreps.length === 0 ? (
                              <div className="text-center py-8">
                                <div className="text-gray-400 text-sm">No prep tasks scheduled</div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(date);
                                    setActiveView('plan');
                                  }}
                                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                >
                                  Plan Preps for This Day
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Group by time slots */}
                                {(() => {
                                  const anytimePreps = datePreps.filter(prep => prep.timeSlot === '');
                                  const timeSlotGroups = timeSlots.map(slot => ({
                                    slot,
                                    preps: datePreps.filter(prep => prep.timeSlot === slot.id)
                                  })).filter(group => group.preps.length > 0);
                                  
                                  return (
                                    <>
                                      {/* Anytime tasks */}
                                      {anytimePreps.length > 0 && (
                                        <div>
                                          <h5 className="font-medium text-gray-700 text-sm mb-2 flex items-center">
                                            🕐 Anytime
                                          </h5>
                                          <div className="space-y-2">
                                            {anytimePreps.map(prep => {
                                              const priority = priorities.find(p => p.id === prep.priority);
                                              return (
                                                <div key={prep.id} className={`p-3 rounded-lg border-l-4 transition-colors ${
                                                  prep.completed ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300 hover:bg-gray-50'
                                                }`}>
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          togglePrepCompletion(prep.id);
                                                        }}
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                          prep.completed 
                                                            ? 'bg-green-500 border-green-500' 
                                                            : 'border-gray-300 hover:border-green-500'
                                                        }`}
                                                      >
                                                        {prep.completed && <Check className="w-3 h-3 text-white" />}
                                                      </button>
                                                      <div>
                                                        <div className={`font-medium text-sm priority-glow priority-${prep.priority} ${prep.completed ? 'line-through opacity-60' : ''}`}>
                                                          {prep.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                          {prep.estimatedTime} • {prep.category}
                                                        </div>
                                                      </div>
                                                    </div>
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
                                      
                                      {/* Time slot tasks */}
                                      {timeSlotGroups.map(({ slot, preps }) => (
                                        <div key={slot.id}>
                                          <h5 className="font-medium text-gray-700 text-sm mb-2 flex items-center">
                                            <span className="mr-2">{slot.icon}</span>
                                            {slot.name}
                                          </h5>
                                          <div className="space-y-2">
                                            {preps.map(prep => {
                                              const priority = priorities.find(p => p.id === prep.priority);
                                              return (
                                                <div key={prep.id} className={`p-3 rounded-lg border-l-4 transition-colors ${
                                                  prep.completed ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300 hover:bg-gray-50'
                                                }`}>
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          togglePrepCompletion(prep.id);
                                                        }}
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                          prep.completed 
                                                            ? 'bg-green-500 border-green-500' 
                                                            : 'border-gray-300 hover:border-green-500'
                                                        }`}
                                                      >
                                                        {prep.completed && <Check className="w-3 h-3 text-white" />}
                                                      </button>
                                                      <div>
                                                        <div className={`font-medium text-sm priority-glow priority-${prep.priority} ${prep.completed ? 'line-through opacity-60' : ''}`}>
                                                          {prep.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                          {prep.estimatedTime} • {prep.category}
                                                        </div>
                                                      </div>
                                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                                      {priority?.name || 'Medium'}
                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </>
                                  );
                                })()}
                                
                                {/* Action buttons */}
                                <div className="flex gap-2 pt-2 border-t">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDate(date);
                                      setActiveView('plan');
                                    }}
                                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                  >
                                    Edit Preps
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedDay(null);
                                    }}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                                  >
                                    Collapse
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Week Summary */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {getWeekDates().reduce((total, date) => {
                      const datePreps = scheduledPreps.filter(prep => 
                        prep.scheduledDate === getDateString(date)
                      );
                      return total + datePreps.length;
                    }, 0)}
                  </div>
                  <div className="text-sm text-blue-700">Total Tasks This Week</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">
                    {getWeekDates().reduce((total, date) => {
                      const datePreps = scheduledPreps.filter(prep => 
                        prep.scheduledDate === getDateString(date) && prep.completed
                      );
                      return total + datePreps.length;
                    }, 0)}
                  </div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {(() => {
                      const totalTasks = getWeekDates().reduce((total, date) => {
                        const datePreps = scheduledPreps.filter(prep => 
                          prep.scheduledDate === getDateString(date)
                        );
                        return total + datePreps.length;
                      }, 0);
                      const completedTasks = getWeekDates().reduce((total, date) => {
                        const datePreps = scheduledPreps.filter(prep => 
                          prep.scheduledDate === getDateString(date) && prep.completed
                        );
                        return total + datePreps.length;
                      }, 0);
                      return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    })()}%
                  </div>
                  <div className="text-sm text-purple-700">Week Progress</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrepListPrototype;