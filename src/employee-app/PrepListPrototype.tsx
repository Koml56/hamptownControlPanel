// PrepListPrototype.tsx - Updated to use standard state management without quickSave
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, ChefHat, Check, Star, Trash2, Users, Search, X } from 'lucide-react';
import { getFormattedDate } from './utils';
import type { PrepItem, ScheduledPrep, PrepSelections, Priority, Recipe, CurrentUser, ConnectionStatus } from './types';

interface PrepListPrototypeProps {
  currentUser: CurrentUser;
  connectionStatus: ConnectionStatus;
  // Firebase data from main hooks
  prepItems: PrepItem[];
  scheduledPreps: ScheduledPrep[];
  prepSelections: PrepSelections;
  // Firebase setters from main hooks (these trigger automatic saves)
  setPrepItems: (updater: (prev: PrepItem[]) => PrepItem[]) => void;
  setScheduledPreps: (updater: (prev: ScheduledPrep[]) => ScheduledPrep[]) => void;
  setPrepSelections: (updater: (prev: PrepSelections) => PrepSelections) => void;
}

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

const PrepListPrototype: React.FC<PrepListPrototypeProps> = ({
  currentUser,
  connectionStatus,
  prepItems,
  scheduledPreps,
  prepSelections,
  setPrepItems,
  setScheduledPreps,
  setPrepSelections
}) => {
  // UI State
  const [activeView, setActiveView] = useState('today');
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newPrepName, setNewPrepName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeData, setRecipeData] = useState<Recipe>({ ingredients: '', instructions: '' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeName, setSelectedRecipeName] = useState<string>('');
  const [showPriorityOptions, setShowPriorityOptions] = useState<number | string | null>(null);
  const [showTimeOptions, setShowTimeOptions] = useState<number | string | null>(null);
  const [assignmentStep, setAssignmentStep] = useState<Record<number, string | null>>({});
  const [showSuggestedPreps, setShowSuggestedPreps] = useState(true);
  const [movedPrepsNotification, setMovedPrepsNotification] = useState<number>(0);

  const categories: Category[] = [
    { id: 'all', name: 'All Items', icon: '🍽️' },
    { id: 'majoneesit', name: 'Majoneesit', icon: '🥄' },
    { id: 'proteiinit', name: 'Proteiinit', icon: '🥩' },
    { id: 'kasvikset', name: 'Kasvikset', icon: '🥗' },
    { id: 'marinointi', name: 'Marinointi & pikkelöinti', icon: '🥒' },
    { id: 'kastikkeet', name: 'Kastikkeet', icon: '🧂' },
    { id: 'muut', name: 'Muut', icon: '🔧' }
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

  // Initialize with default prep items if empty (automatic save through state setter)
  useEffect(() => {
    if (prepItems.length === 0) {
      const defaultPreps: PrepItem[] = [
        // Majoneesit
        { id: 1, name: 'Valkosipulimajoneesi', category: 'majoneesit', estimatedTime: '15 min', isCustom: false, hasRecipe: true, frequency: 3,
          recipe: { ingredients: '• **1 cup** majoneesi\n• **3-4** valkosipulin kynttä, hienoksi hakattuna\n• **1 rkl** sitruunamehua\n• **Suolaa** ja **mustapippuria** maun mukaan', 
                   instructions: '1. **Sekoita**: Yhdistä majoneesi ja hienonnettu valkosipuli\n2. **Mausta**: Lisää sitruunamehu, suola ja pippuri\n3. **Anna maustua**: Anna seisoa jääkaapissa vähintään 30 minuuttia\n4. **Tarkista maku**: Säädä mausteita tarpeen mukaan' }},
        { id: 2, name: 'Chilimajoneesi', category: 'majoneesit', estimatedTime: '10 min', isCustom: false, hasRecipe: true, frequency: 4,
          recipe: { ingredients: '• **1 cup** majoneesi\n• **2-3 rkl** sriracha-kastiketta\n• **1 tl** hunajaa\n• **1 tl** limemehua', 
                   instructions: '1. **Yhdistä**: Sekoita majoneesi ja sriracha-kastike\n2. **Makeutus**: Lisää hunaja ja limemehu\n3. **Sekoita hyvin**: Varmista tasainen sekoitus\n4. **Maista ja säädä**: Lisää chilimakua tai hunajaa tarpeen mukaan' }},
        { id: 3, name: 'Kevätsipulimajoneesi', category: 'majoneesit', estimatedTime: '10 min', isCustom: false, hasRecipe: false, frequency: 3, recipe: null },
        { id: 4, name: 'Bad Santa -majoneesi', category: 'majoneesit', estimatedTime: '15 min', isCustom: false, hasRecipe: false, frequency: 5, recipe: null },
        { id: 5, name: 'Manse-majoneesi', category: 'majoneesit', estimatedTime: '12 min', isCustom: false, hasRecipe: false, frequency: 4, recipe: null },
        
        // Proteiinit
        { id: 6, name: 'Marinoitu kana', category: 'proteiinit', estimatedTime: '30 min', isCustom: false, hasRecipe: true, frequency: 2,
          recipe: { ingredients: '• **4** kananfileetä\n• **1/4 cup** oliiviöljyä\n• **2 rkl** sitruunamehua\n• **3** valkosipulin kynttä, murskattuna\n• **1 tl** kuivattuja yrttejä\n• **Suolaa** ja **pippuria**', 
                   instructions: '1. **Valmista marinade**: Sekoita öljy, sitruunamehu, valkosipuli ja yrtit\n2. **Mausta kana**: Hiero kanaan suolaa ja pippuria\n3. **Marinoi**: Laita kana marinadiin 2-4 tunniksi\n4. **Huoneenlämpö**: Anna tulla huoneenlämpöön ennen kypsennystä' }},
        { id: 7, name: 'Lihapullat', category: 'proteiinit', estimatedTime: '45 min', isCustom: false, hasRecipe: true, frequency: 3,
          recipe: { ingredients: '• **500g** jauhelihaa\n• **1** sipuli, hienoksi hakattuna\n• **1** muna\n• **1/2 cup** korppujauhoja\n• **Suolaa**, **pippuria**, **mausteet**', 
                   instructions: '1. **Sekoita**: Yhdistä kaikki ainekset kulhossa\n2. **Muotoile**: Tee tasakokoisia palloja\n3. **Kypsennä**: Paista pannulla tai uunissa\n4. **Valmista**: Kypsyys 65°C sisälämpötila' }},
        
        // Kasvikset
        { id: 8, name: 'Tuoreet tomaatit (leikattu)', category: 'kasvikset', estimatedTime: '15 min', isCustom: false, hasRecipe: false, frequency: 1, recipe: null },
        { id: 9, name: 'Kevätsipuli', category: 'kasvikset', estimatedTime: '10 min', isCustom: false, hasRecipe: false, frequency: 2, recipe: null },
        
        // Marinointi & pikkelöinti
        { id: 10, name: 'Marinoitu punasipuli', category: 'marinointi', estimatedTime: '20 min', isCustom: false, hasRecipe: true, frequency: 4,
          recipe: { ingredients: '• **2** punasipulia, ohuksi viipaloiduna\n• **1/2 cup** valkoviinietikkaa\n• **2 rkl** sokeria\n• **1 tl** suolaa\n• **1** laakerinlehti', 
                   instructions: '1. **Liuota**: Sekoita etikka, sokeri ja suola\n2. **Sipulit**: Laita viipaloidut sipulit kulhoon\n3. **Kaada liuos**: Kaada kuuma liuos sipulien päälle\n4. **Anna marinoitua**: Vähintään 30 minuuttia ennen käyttöä' }},
        { id: 11, name: 'Pikkelöity punasipuli', category: 'marinointi', estimatedTime: '25 min', isCustom: false, hasRecipe: false, frequency: 5, recipe: null },
        { id: 12, name: 'Pikkelöity tomaatti', category: 'marinointi', estimatedTime: '20 min', isCustom: false, hasRecipe: false, frequency: 4, recipe: null },
        { id: 13, name: 'Pikkelöity kurkku', category: 'marinointi', estimatedTime: '20 min', isCustom: false, hasRecipe: false, frequency: 4, recipe: null },
        { id: 14, name: 'Paholaisen hillo', category: 'marinointi', estimatedTime: '30 min', isCustom: false, hasRecipe: false, frequency: 7, recipe: null },
        { id: 15, name: 'Hapan omena -hillo', category: 'marinointi', estimatedTime: '35 min', isCustom: false, hasRecipe: false, frequency: 7, recipe: null },
        { id: 16, name: 'Marinoitu punakaali', category: 'marinointi', estimatedTime: '25 min', isCustom: false, hasRecipe: false, frequency: 5, recipe: null },
        
        // Kastikkeet
        { id: 17, name: 'Konjakki-sinappi', category: 'kastikkeet', estimatedTime: '15 min', isCustom: false, hasRecipe: true, frequency: 6,
          recipe: { ingredients: '• **1/2 cup** dijon-sinappia\n• **3 rkl** konjakkia\n• **1 rkl** hunajaa\n• **1 tl** valkosipulijauhetta', 
                   instructions: '1. **Sekoita**: Yhdistä sinappi ja konjakki\n2. **Makeutus**: Lisää hunaja ja valkosipulijauhe\n3. **Sekoita hyvin**: Varmista tasainen sekoitus\n4. **Anna vetäytyä**: Säilytä jääkaapissa käyttöön asti' }},
        { id: 18, name: 'BBQ-hunaja-sinappi', category: 'kastikkeet', estimatedTime: '12 min', isCustom: false, hasRecipe: false, frequency: 5, recipe: null },
        
        // Muut
        { id: 19, name: 'Täytä kylmävitriini', category: 'muut', estimatedTime: '20 min', isCustom: false, hasRecipe: false, frequency: 1, recipe: null },
        { id: 20, name: 'Vaihda öljy', category: 'muut', estimatedTime: '15 min', isCustom: false, hasRecipe: false, frequency: 7, recipe: null },
        { id: 21, name: 'Asiakasjuomakaappi kuntoon', category: 'muut', estimatedTime: '25 min', isCustom: false, hasRecipe: false, frequency: 2, recipe: null },
        { id: 22, name: 'Alkoholijuomakaappi kuntoon', category: 'muut', estimatedTime: '20 min', isCustom: false, hasRecipe: false, frequency: 3, recipe: null },
        { id: 23, name: 'Keitä smash-perunat', category: 'muut', estimatedTime: '45 min', isCustom: false, hasRecipe: true, frequency: 2,
          recipe: { ingredients: '• **1kg** pieniä perunoita\n• **Suolaa** keitinveteen\n• **Oliiviöljyä**\n• **Rosmariinia**\n• **Merisuolaa**\n• **Mustapippuria**', 
                   instructions: '1. **Keitä**: Keitä perunat kuoressa suolavedessä kypsiksi\n2. **Valuta**: Anna valua ja jäähtyä hieman\n3. **Smash**: Litistä perunat haarukalla kevyesti\n4. **Paista**: Paista uunissa 200°C öljyssä ja mausteissa kultaisiksi' }}
      ];
      
      console.log('📝 Initializing default prep items...');
      setPrepItems(() => defaultPreps);
    }
  }, [prepItems.length, setPrepItems]);

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
        setTimeout(() => setMovedPrepsNotification(0), 8000);
        
        // Remove from yesterday and add to today
        const movedPreps = incompletePreps.map(prep => ({
          ...prep,
          id: Date.now() + Math.random(),
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
    tomorrow.setHours(0, 1, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    const midnightTimer = setTimeout(() => {
      moveIncompletePreps();
      localStorage.setItem('lastPrepMoveCheck', getDateString(new Date()));
    }, timeUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [scheduledPreps, setPrepSelections, setScheduledPreps]);

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

  // Update prep selection with smart workflow
  const updatePrepSelection = (
    prep: PrepItem, 
    field: 'priority' | 'timeSlot', 
    value: string, 
    context: string = 'main'
  ): void => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
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
      
      // Check if prep is already scheduled to prevent duplicates
      const existingScheduledPrep = scheduledPreps.find(p => 
        p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
      );
      
      if (existingScheduledPrep) {
        console.log(`🔄 Updating existing prep: ${prep.name} with new priority/time`);
        setScheduledPreps(prev => prev.map(p => 
          p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
            ? { ...p, priority: updatedSelection.priority, timeSlot: value }
            : p
        ));
      } else {
        console.log(`➕ Creating new scheduled prep: ${prep.name}`);
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

  // Add click outside handler
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
      console.log(`➖ Removing prep from schedule: ${prep.name}`);
      setScheduledPreps(prev => prev.filter(p => 
        !(p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate))
      ));
    } else {
      // Check if prep is already scheduled to prevent duplicates
      const existingScheduledPrep = scheduledPreps.find(p => 
        p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
      );
      
      if (existingScheduledPrep) {
        console.log(`🔄 Prep already scheduled, just updating selection: ${prep.name}`);
        setPrepSelections(prev => ({
          ...prev,
          [selectionKey]: { 
            priority: existingScheduledPrep.priority, 
            timeSlot: existingScheduledPrep.timeSlot, 
            selected: true 
          }
        }));
      } else {
        console.log(`➕ Adding new prep to schedule: ${prep.name}`);
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
    
    // Auto-select the new custom prep
    togglePrepSelection(customPrep);
  };

  // Toggle prep completion (automatic save through state setter)
  const togglePrepCompletion = (scheduledPrepId: number): void => {
    console.log('🔄 Toggling prep completion for ID:', scheduledPrepId);
    
    setScheduledPreps(prev => prev.map(prep => 
      prep.id === scheduledPrepId 
        ? { ...prep, completed: !prep.completed }
        : prep
    ));
  };

  // Filter preps
  const filteredPreps = prepItems.filter(prep => {
    const matchesCategory = selectedCategory === 'all' || prep.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prep.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get today's scheduled preps
  const todayScheduledPreps = scheduledPreps.filter(prep => 
    prep.scheduledDate === getFormattedDate(new Date())
  );

  // Get selected date's scheduled preps
  const selectedDateScheduledPreps = scheduledPreps.filter(prep => 
    prep.scheduledDate === getDateString(selectedDate)
  );

  const completedToday = todayScheduledPreps.filter(prep => prep.completed).length;
  const totalToday = todayScheduledPreps.length;

  // Suggested Preps Function - based on completion data and frequency
  const renderSuggestedPrepsSection = () => {
    const today = new Date();
    
    const overduePreps = prepItems.map(prep => {
      const completions = scheduledPreps.filter(scheduledPrep => 
        scheduledPrep.prepId === prep.id && scheduledPrep.completed
      );
      
      let daysSinceLastCompletion = 999;
      
      if (completions.length > 0) {
        const latestCompletion = completions.reduce((latest, current) => {
          const currentDate = new Date(current.scheduledDate);
          const latestDate = new Date(latest.scheduledDate);
          return currentDate > latestDate ? current : latest;
        });
        
        const lastCompletionDate = new Date(latestCompletion.scheduledDate);
        const timeDiff = today.getTime() - lastCompletionDate.getTime();
        daysSinceLastCompletion = Math.floor(timeDiff / (1000 * 3600 * 24));
      }
      
      const overdueDays = daysSinceLastCompletion - (prep.frequency + 1);
      
      return {
        prep,
        daysSinceLastCompletion,
        overdueDays,
        isOverdue: overdueDays > 0
      };
    })
    .filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.prep.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        item.prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.prep.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      return item.isOverdue && matchesCategory && matchesSearch;
    })
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, 3);
    
    if (overduePreps.length === 0) return null;
    
    return (
      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <button
          onClick={() => setShowSuggestedPreps(!showSuggestedPreps)}
          className="w-full flex items-center justify-between text-left mb-3 hover:text-orange-600"
        >
          <h4 className="font-medium text-orange-800 flex items-center">
            ⚠️ Suggested Preps ({overduePreps.length})
          </h4>
          <span className={`transition-transform ${showSuggestedPreps ? 'rotate-180' : 'rotate-0'}`}>
            ▼
          </span>
        </button>
        
        {showSuggestedPreps && (
          <div className="space-y-2">
            {overduePreps.map(({ prep, daysSinceLastCompletion, overdueDays }) => {
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
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-orange-600 truncate">
                            {prep.estimatedTime} • {prep.category}
                          </p>
                          {prep.hasRecipe && (
                            <button
                              onClick={() => prep.recipe && showRecipe(prep.recipe, prep.name)}
                              className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                            >
                              📖
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-red-600 font-medium mt-1">
                          {daysSinceLastCompletion === 999 ? 'Never done' : 
                           `${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} overdue`}
                        </div>
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
                        
                        {/* Priority and Time dropdowns would go here - same as main list */}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-2 text-xs text-orange-600">
              💡 These items are overdue based on their preparation frequency
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{
        __html: `
          .priority-glow {
            position: relative;
            z-index: 0;
            font-weight: 600;
            border-radius: 0.25rem;
            padding: 0.125rem 0.25rem;
          }
          .soft-dropdown {
            backdrop-filter: blur(16px);
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          }
        `
      }} />

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
                <span className="sr-only">Close</span>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="space-y-4">
                {/* Time Slot Tasks and Anytime Tasks */}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePrepCompletion(prep.id);
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
                                    {prep.hasRecipe && (
                                      <button
                                        onClick={() => prep.recipe && showRecipe(prep.recipe, prep.name)}
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
                    </div>
                  );
                })}
                
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePrepCompletion(prep.id);
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
                                    {prep.hasRecipe && (
                                      <button
                                        onClick={() => prep.recipe && showRecipe(prep.recipe, prep.name)}
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
                    </div>
                  );
                })()}
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

            {/* Suggested Preps Section */}
            {renderSuggestedPrepsSection()}

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
                          
                          {/* Priority and Time Assignment UI would go here */}
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
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                {isSelected 
                                  ? `${priorities.find(p => p.id === selection.priority)?.name} Priority${selection.timeSlot ? ` • ${timeSlots.find(t => t.id === selection.timeSlot)?.name}` : ' • Anytime'}`
                                  : 'Click to assign priority & time'
                                }
                              </button>
                              
                              {/* Dropdown components would go here */}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                        <button
                          onClick={() => {
                            setScheduledPreps(prev => prev.filter(p => 
                              !(p.prepId === prep.prepId && p.scheduledDate === prep.scheduledDate)
                            ));
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

      {/* Week View - simplified version */}
      {activeView === 'week' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Week Overview</h3>
          <div className="grid grid-cols-7 gap-2">
            {getWeekDates().map((date, index) => {
              const datePreps = scheduledPreps.filter(prep => 
                prep.scheduledDate === getDateString(date)
              );
              const completed = datePreps.filter(prep => prep.completed).length;
              const isToday = getDateString(date) === getFormattedDate(new Date());
              
              return (
                <div key={index} className={`p-3 border rounded-lg text-center ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="font-medium text-gray-800">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-2xl font-bold text-gray-600 my-2">
                    {date.getDate()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {completed}/{datePreps.length} done
                  </div>
                  {datePreps.length > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div 
                        className="bg-green-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${(completed / datePreps.length) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{selectedRecipeName}</h3>
                  <p className="text-sm text-gray-600">Recipe Details</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecipeModal(false)}
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
                  <div 
                    className="whitespace-pre-wrap text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: selectedRecipe.ingredients
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-2">📝</span>
                  Instructions
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div 
                    className="whitespace-pre-wrap text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: selectedRecipe.instructions
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowRecipeModal(false)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Close Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrepListPrototype;
