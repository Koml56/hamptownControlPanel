// RecipeModal.tsx - Modal component for displaying recipes
import React from ‘react’;
import { X, ChefHat } from ‘lucide-react’;
import type { Recipe } from ‘./prep-types’;
import { formatRecipeText } from ‘./prep-utils’;

interface RecipeModalProps {
isOpen: boolean;
recipe: Recipe | null;
recipeName: string;
onClose: () => void;
}

const RecipeModal: React.FC<RecipeModalProps> = ({
isOpen,
recipe,
recipeName,
onClose
}) => {
if (!isOpen || !recipe) return null;

return (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
<div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
{/* Header */}
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

```
    {/* Recipe Content */}
    <div className="p-6 space-y-6">
      {/* Ingredients */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm mr-2">🥄</span>
          Ingredients
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div 
            className="whitespace-pre-wrap text-gray-700"
            dangerouslySetInnerHTML={{
              __html: formatRecipeText(recipe.ingredients)
            }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
          <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-2">📝</span>
          Instructions
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div 
            className="whitespace-pre-wrap text-gray-700"
            dangerouslySetInnerHTML={{
              __html: formatRecipeText(recipe.instructions)
            }}
          />
        </div>
      </div>
    </div>

    {/* Footer */}
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
```

);
};

export default RecipeModal;
