import { useEffect, useState } from 'react';

type SortConfig = {
  columnId: number;
  direction: 'asc' | 'desc';
  priority: number;
}

type SortPanelProps = {
  columns: { id: number; name: string; type: 'text' | 'number' }[];
  onDone: (sortConfigs: SortConfig[]) => void;
  onClose: () => void;
  initialSortConfigs?: SortConfig[];
};

export default function SortPanel({ columns, onDone, onClose, initialSortConfigs = [] }: SortPanelProps) {
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>(initialSortConfigs);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const addSortConfig = () => {
    if(selectedColumnId === null) return;

    if (sortConfigs.some(config => config.columnId === selectedColumnId)) {
      return;
    }

    const newConfig: SortConfig = {
      columnId: selectedColumnId,
      direction: sortDirection,
      priority: sortConfigs.length + 1
    }

    setSortConfigs([...sortConfigs, newConfig]);
    setSelectedColumnId(null);
  }

  const removeSortConfig = (columnId: number) => {
    const newConfigs = sortConfigs.filter(config => config.columnId !== columnId);
    setSortConfigs(newConfigs);
    
    // If this was the last sort config, clear everything and notify parent
    if (newConfigs.length === 0) {
      setSelectedColumnId(null);
      setSortDirection('asc');
      onDone([]); // Notify parent that sorts are cleared
    } else {
      // Update priorities for remaining sorts
      const updatedConfigs = newConfigs.map((config, index) => ({
        ...config,
        priority: index + 1
      }));
      setSortConfigs(updatedConfigs);
      onDone(updatedConfigs); // Update parent with new configs
    }
  };

  const availableColumns = columns.filter(col => 
    !sortConfigs.some(config => config.columnId === col.id)
  );

  const getColumnName = (columnId: number) => {
    return columns.find(col => col.id === columnId)?.name ?? '';
  };

  const getColumnType = (columnId: number) => {
    return columns.find(col => col.id === columnId)?.type ?? 'text';
  };

  return (
    <div
      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border w-96 max-h-96 overflow-hidden z-50"
      onClick={handlePanelClick}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Sort Columns</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {/* Current Sort Configurations */}
        {sortConfigs.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Sort Order:</label>
            <div className="space-y-2">
              {sortConfigs.map((config, index) => {
                const columnType = getColumnType(config.columnId);
                return (
                  <div key={config.columnId} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium min-w-6 text-center">
                      {config.priority}
                    </span>
                    <span className="flex-1 text-sm font-medium">
                      {getColumnName(config.columnId)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        className={`px-2 py-1 rounded text-xs transition`}
                      >
                        {columnType === 'text' 
                          ? (config.direction === 'asc' ? 'A→Z' : 'Z→A')
                          : (config.direction === 'asc' ? '↑' : '↓')
                        }
                      </button>
                      <button
                        onClick={() => removeSortConfig(config.columnId)}
                        className="px-1 py-1 text-xs text-red-600 hover:text-red-800 cursor-pointer"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Sort Configuration */}
        {availableColumns.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Add Column to Sort:</label>
            <div className="flex gap-2">
              <select
                value={selectedColumnId ?? ''}
                onChange={e => setSelectedColumnId(Number(e.target.value))}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="" disabled>Select column...</option>
                {availableColumns.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              
              {selectedColumnId !== null && (
                <>
                  <select
                    value={sortDirection}
                    onChange={e => setSortDirection(e.target.value as 'asc' | 'desc')}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="asc">
                      {getColumnType(selectedColumnId) === 'text' ? 'A → Z' : 'Ascending'}
                    </option>
                    <option value="desc">
                      {getColumnType(selectedColumnId) === 'text' ? 'Z → A' : 'Descending'}
                    </option>
                  </select>
                  <button
                    onClick={addSortConfig}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                  >
                    Add
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Clear All */}
        {sortConfigs.length > 0 && (
          <div className="flex justify-between items-center pt-2 border-t">
            <button
              onClick={() => {
                setSortConfigs([]);
                onDone([]);
                onClose();
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
            >
              Clear All
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDone(sortConfigs);
                  onClose();
                }}
                className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
              >
                Apply Sort
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
