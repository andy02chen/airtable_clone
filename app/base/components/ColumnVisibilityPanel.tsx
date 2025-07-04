import React from 'react';

interface Column {
  id: number;
  name: string;
  type?: string;
}

interface ColumnVisibilityPanelProps {
  columns: Column[];
  hiddenColumns: Set<string>;
  onToggleColumn: (columns: Set<string>) => void;
  onClose: () => void;
  isPending: boolean;
}

export default function ColumnVisibilityPanel({ 
  columns, 
  hiddenColumns, 
  onToggleColumn, 
  onClose,
  isPending
}: ColumnVisibilityPanelProps) {
  const visibleCount = columns.length - hiddenColumns.size;
  
  const handleToggleAll = () => {
    if (hiddenColumns.size === 0) {
      const allColumnIds = new Set(columns.map(column => `column_${column.id}`));
      onToggleColumn(allColumnIds);
    } else {
      onToggleColumn(new Set<string>());
    }
  };

  // Prevent event bubbling when clicking inside the panel
  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border w-80 max-h-80 overflow-hidden z-50"
      onClick={handlePanelClick}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Hide Columns</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
        >
          ×
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">
            {visibleCount} of {columns.length} columns visible
          </span>
          <button
            onClick={handleToggleAll}
            className="text-sm text-blue-600 hover:text-blue-800  cursor-pointer"
            disabled={isPending}
          >
            {hiddenColumns.size === 0 ? 'Hide all' : 'Show all'}
          </button>
        </div>
        
        <div className="max-h-48 overflow-y-auto">
          {columns.map((column) => {
            const columnId = `column_${column.id}`;
            const isVisible = !hiddenColumns.has(columnId);
            
            return (
              <div
                key={column.id}
                className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={columnId}
                    checked={isVisible}
                    onChange={() => {
                      const newSet = new Set(hiddenColumns);
                      if (newSet.has(columnId)) {
                        newSet.delete(columnId);
                      } else {
                        newSet.add(columnId);
                      }
                      onToggleColumn(newSet);
                    }}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    disabled={isPending}
                  />
                  <label
                    htmlFor={columnId}
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {column.name}
                  </label>
                </div>
                
                {column.type && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {column.type.toLowerCase()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}