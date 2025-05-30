import { useState } from "react";

export type FilterConfig = {
  columnId: number;
  operator: 'gt' | 'lt' | 'not_empty' | 'empty' | 'contains' | 'not_contains' | 'eq';
  value: string;
}

type FilterPanelProps = {
  columns: { id: number; name: string; type: 'text' | 'number' }[];
  onDone: (filterConfigs: FilterConfig[]) => void;
  onClose: () => void;
  initialFilterConfigs?: FilterConfig[];
}

export default function FilterPanel({ columns, onDone, onClose, initialFilterConfigs = [] }: FilterPanelProps) {
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>(initialFilterConfigs);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<FilterConfig['operator'] | ''>('');
  const [filterValue, setFilterValue] = useState<string>('');

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const getOperatorsForColumn = (columnId: number) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return [];

    if (column.type === 'number') {
      return [
        { value: 'gt' as const, label: 'Greater than' },
        { value: 'lt' as const, label: 'Less than' },
      ];
    } else {
      return [
        { value: 'not_empty' as const, label: 'Is not empty' },
        { value: 'empty' as const, label: 'Is empty' },
        { value: 'contains' as const, label: 'Contains' },
        { value: 'not_contains' as const, label: 'Does not contain' },
        { value: 'eq' as const, label: 'Equal to' },
      ];
    }
  };

  const needsValue = (operator: FilterConfig['operator'] | '') => {
    return !['empty', 'not_empty'].includes(operator as string);
  };

  const addFilterConfig = () => {
    if (selectedColumnId === null || !selectedOperator) return;
    if (needsValue(selectedOperator) && !filterValue.trim()) return;

    if (filterConfigs.some(config => config.columnId === selectedColumnId)) {
      return;
    }

    const newFilter: FilterConfig = {
      columnId: selectedColumnId,
      operator: selectedOperator,
      value: needsValue(selectedOperator) ? filterValue : ''
    };

    setFilterConfigs([...filterConfigs, newFilter]);
    setSelectedColumnId(null);
    setSelectedOperator('');
    setFilterValue('');
  };

  const removeFilterConfig = (columnId: number) => {
    const newConfigs = filterConfigs.filter(config => config.columnId !== columnId);
    setFilterConfigs(newConfigs);
    
    if (newConfigs.length === 0) {
      setSelectedColumnId(null);
      setSelectedOperator('');
      setFilterValue('');
      onDone([]);
    } else {
      onDone(newConfigs);
    }
  };

  const availableColumns = columns.filter(col => 
    !filterConfigs.some(config => config.columnId === col.id)
  );

  const getColumnName = (columnId: number) => {
    return columns.find(col => col.id === columnId)?.name ?? '';
  };

  const getColumnType = (columnId: number) => {
    return columns.find(col => col.id === columnId)?.type ?? 'text';
  };

  const getOperatorLabel = (operator: FilterConfig['operator'], columnType: 'text' | 'number') => {
    const operators = columnType === 'number' 
      ? [
          { value: 'gt', label: '>' },
          { value: 'lt', label: '<' },
        ]
      : [
          { value: 'not_empty', label: 'Not Empty' },
          { value: 'empty', label: 'Empty' },
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: '∄' },
          { value: 'eq', label: '=' }
        ];
    
    return operators.find(op => op.value === operator)?.label ?? operator;
  };

  return (
    <div
      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border w-96 h-auto overflow-hidden z-50"
      onClick={handlePanelClick}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Filter Columns</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4 h-auto overflow-y-auto">
        {/* Current Filter Configurations */}
        {filterConfigs.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Active Filters:</label>
            <div className="space-y-2">
              {filterConfigs.map((config) => {
                const columnType = getColumnType(config.columnId);
                return (
                  <div key={config.columnId} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                    <span className="flex-1 text-sm font-medium">
                      {getColumnName(config.columnId)}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {getOperatorLabel(config.operator, columnType)}
                    </span>
                    {config.value && (
                      <span className="text-sm text-gray-600 max-w-20 truncate" title={config.value}>
                        &quot;{config.value}&quot;
                      </span>
                    )}
                    <button
                      onClick={() => removeFilterConfig(config.columnId)}
                      className="px-1 py-1 text-xs text-red-600 hover:text-red-800 cursor-pointer"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Filter Configuration */}
        {availableColumns.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Add Filter Condition:</label>
            <div className="space-y-2">
              <select
                value={selectedColumnId ?? ''}
                onChange={e => {
                  const columnId = Number(e.target.value);
                  setSelectedColumnId(columnId);
                  setSelectedOperator('');
                  setFilterValue('');
                }}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="" disabled>Select column...</option>
                {availableColumns.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              
              {selectedColumnId !== null && (
                <select
                  value={selectedOperator}
                  onChange={e => {
                    setSelectedOperator(e.target.value as FilterConfig['operator']);
                    setFilterValue('');
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500  cursor-pointer"
                >
                  <option value="" disabled>Select condition...</option>
                  {getOperatorsForColumn(selectedColumnId).map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              )}

              {selectedColumnId !== null && selectedOperator && needsValue(selectedOperator) && (
                <input
                  type={getColumnType(selectedColumnId) === 'number' ? 'number' : 'text'}
                  value={filterValue}
                  onChange={e => setFilterValue(e.target.value)}
                  placeholder="Enter value..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {selectedColumnId !== null && selectedOperator && (
                <button
                  onClick={addFilterConfig}
                  disabled={needsValue(selectedOperator) && !filterValue.trim()}
                  className="w-full px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  Add Filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clear All and Action Buttons */}
        {filterConfigs.length > 0 && (
          <div className="flex justify-between items-center pt-2 border-t">
            <button
              onClick={() => {
                setFilterConfigs([]);
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
                className="px-4 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100  cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDone(filterConfigs);
                  onClose();
                }}
                className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700  cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}