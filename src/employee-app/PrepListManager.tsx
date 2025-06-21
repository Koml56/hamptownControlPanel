// PrepListManager.tsx - Simplified prep list component for existing employee app
import React, { useState, useEffect } from 'react';
import { Calendar, Check, ChefHat, Plus, Search, Users, X } from 'lucide-react';

// Types
interface PrepItem {
  id: number;
  name: string;
  category: string;
  estimatedTime: string;
  isCustom: boolean;
  hasRecipe: boolean;
  frequency: number;
  recipe: Recipe | null;
}

interface ScheduledPrep {
  id: number;
  prepId: number;
  name: string;
  category: string;
  estimatedTime: string;
  isCustom: boolean;
  hasRecipe: boolean;
  recipe: Recipe | null;
  scheduledDate: string;
  priority: Priority;
  timeSlot: string;
  completed: boolean;
  assignedTo: string | null;
  notes: string;
}

interface Recipe {
  ingredients: string;
  instructions: string;
}

type Priority = 'low' | 'medium' | 'high';

// Constants
const categories = [
  { id: 'all', name: 'All Items', icon: '🍽️' },
  { id: 'majoneesit', name: 'Majoneesit', icon: '🥄' },
  { id: 'proteiinit', name: 'Proteiinit', icon: '🥩' },
  { id: 'kasvikset', name: 'Kasvikset', icon: '🥗' },
  { id: 'marinointi', name: 'Marinointi & pikkelöinti', icon: '🥒' },
  { id: 'kastikkeet', name: 'Kastikkeet', icon: '🧂' },
  { id: 'muut', name: 'Muut', icon: '🔧' }
];

const timeSlots = [
  { id: 'morning', name: 'Morning (6-10 AM)', icon: '🌅' },
  { id: 'midday', name: 'Mid-day (10 AM-2 PM)', icon: '☀️' },
  { id: 'afternoon', name: 'Afternoon (2-6 PM)', icon: '🌤️' },
  { id: 'evening', name: 'Evening (6-10 PM)', icon: '🌆' }
];

const priorities = [
  { id: 'low', name: 'Low', color: 'bg-green-100 text-green-700', icon: '🟢' },
  { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  { id: 'high', name: 'High', color: 'bg-red-100 text-red-700', icon: '🔴' }
];

// Default prep items
const getDefaultPrepItems = (): PrepItem[] => [
  {
    id: 1,
    name: 'Valkosipulimajoneesi',
    category: 'majoneesit',
    estimatedTime: '15 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 3,
    recipe: {
      ingredients: '• 1 cup majoneesi\n• 3-4 valkosipulin kynttä\n• 1 rkl sitruunamehua\n• Suolaa ja pippuria',
      instructions: '1. Sekoita majoneesi ja valkosipuli\n2. Lisää sitruunamehu\n3. Mausta suolalla ja pippurilla\n4. Anna maustua 30 min'
    }
  },
  {
    id: 2,
    name: 'Chilimajoneesi',
    category: 'majoneesit',
    estimatedTime: '10 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 4,
    recipe: {
      ingredients: '• 1 cup majoneesi\n• 2-3 rkl sriracha-kastiketta\n• 1 tl hunajaa\n• 1 tl limemehua',
      instructions: '1. Yhdistä majoneesi ja sriracha\n2. Lisää hunaja ja limemehu\n3. Sekoita hyvin\n4. Maista ja säädä'
    }
  },
  { id: 3, name: 'Kevätsipulimajoneesi', category: 'majoneesit', estimatedTime: '10 min', isCustom: false, hasRecipe: false, frequency: 3, recipe: null },
  { id: 4, name: 'Marinoitu kana', category: 'proteiinit', estimatedTime: '30 min', isCustom: false, hasRecipe: false, frequency: 2, recipe: null },
  { id: 5, name: 'Tuoreet tomaatit (leikattu)', category: 'kasvikset', estimatedTime: '15 min', isCustom: false, hasRecipe: false, frequency: 1, recipe: null },
  { id: 6, name: 'Marinoitu punasipuli', category: 'marinointi', estimatedTime: '20 min', isCustom: false, hasRecipe: false, frequency: 4, recipe: null },
  { id: 7, name: 'Konjakki-sinappi', category: 'kastikkeet', estimatedTime: '15 min', isCustom: false, hasRecipe: false, frequency: 6, recipe: null },
  { id: 8, name: 'Täytä kylmävitriini', category: 'muut', estimatedTime: '20 min', isCustom: false, hasRecipe: false, frequency: 1, recipe: null }
];

// Utility functions
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Recipe Modal Component
interface RecipeModalProps {
  isOpen: boolean;
  recipe: Recipe | null;
  recipeName: string;
  onClose: () => void;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ isOpen, recipe, recipeName, onClose }) => {
  if (!isOpen || !recipe) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{recipeName}</h3>
              <p className="text-sm text-gray-600">Recipe Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm mr-2">🥄</span>
              Ingredients
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="whitespace-pre-wrap text-gray-700">{recipe.ingredients}</div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-2">📝</span>
              Instructions
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="whitespace-pre-wrap text-gray-700">{recipe.instructions}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Close Recipe
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const PrepListManager: React.FC = () => {
  // State
  const [activeView, setActiveView] = useState('today');
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeName, setSelectedRecipeName] = useState('');
  const [prepSelections, setPrepSelections] = useState<Record<string, any>>({});

  // Initialize with default prep items
  useEffect(() => {
    if (prepItems.length === 0) {
      setPrepItems(getDefaultPrepItems());
    }
  }, [prepItems.length]);

  // Show recipe modal
  const showRecipe = (recipe: Recipe, name: string) => {
    setSelectedRecipe(recipe);
    setSelectedRecipeName(name);
    setShowRecipeModal(true);
  };

  // Toggle prep completion
  const togglePrepCompletion = (scheduledPrepId: number) => {
    setScheduledPreps(prev => prev.map(prep =>
      prep.id === scheduledPrepId
        ? { ...prep, completed: !prep.completed }
        : prep
    ));
  };

  // Get today's scheduled preps
  const todayScheduledPreps = scheduledPreps.filter(prep =>
    prep.scheduledDate === getDateString(new Date())
  );

  const completedToday = todayScheduledPreps.filter(prep => prep.completed).length;
  const totalToday = todayScheduledPreps.length;

  // Filter preps
  const filteredPreps = prepItems.filter(prep => {
    const matchesCategory = selectedCategory === 'all' || prep.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prep.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Check if prep is selected
  const isPrepSelected = (prepId: number): boolean => {
    const selectionKey = `${getDateString(selectedDate)}-${prepId}`;
    return prepSelections[selectionKey]?.selected || false;
  };

  // Toggle prep selection
  const togglePrepSelection = (prep: PrepItem) => {
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
      // Add selection
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: { priority: 'medium', timeSlot: '', selected: true }
      }));
      
      // Add to scheduled preps
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
  };

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
        </div>
      </div>

      {/* Today's Preps View */}
      {activeView === 'today' && (
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
              <div className="space-y-3">
                {todayScheduledPreps.map(prep => {
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
                        <div className="flex-1">
                          <div className={`font-medium flex items-center space-x-2 ${prep.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            <span>{prep.name}</span>
                            {prep.hasRecipe && prep.recipe && (
                              <button
                                onClick={() => showRecipe(prep.recipe!, prep.name)}
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
                      <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                        {priority?.name || 'Medium'}
                      </span>
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

            {/* Prep Items List */}
            <div className="space-y-3">
              {filteredPreps.map(prep => {
                const isSelected = isPrepSelected(prep.id);
                
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
                            {prep.hasRecipe && prep.recipe && (
                              <button
                                onClick={() => showRecipe(prep.recipe!, prep.name)}
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

export default PrepListManager;
