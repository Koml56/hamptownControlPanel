// src/employee-app/inventory/components/DraggableItemCard.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ItemCard from './ItemCard';
import { InventoryItem, CustomCategory } from '../../types';

interface DraggableItemCardProps {
  item: InventoryItem;
  onUpdateCount: (itemId: number | string) => void;
  onReportWaste: (itemId: number | string) => void;
  showQuickActions?: boolean;
  customCategories?: CustomCategory[];
}

const DraggableItemCard: React.FC<DraggableItemCardProps> = ({
  item,
  onUpdateCount,
  onReportWaste,
  showQuickActions = true,
  customCategories = []
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <ItemCard
        item={item}
        onUpdateCount={onUpdateCount}
        onReportWaste={onReportWaste}
        showQuickActions={showQuickActions}
        customCategories={customCategories}
      />
    </div>
  );
};

export default DraggableItemCard;