import { useState } from 'react';

type SortPanelProps = {
  columns: { id: number; name: string; type: 'text' | 'number' }[];
  onDone: (sortConfig: { columnId: number; direction: 'asc' | 'desc' }) => void;
  onClose: () => void;
};

export default function SortPanel({ columns, onDone, onClose }: SortPanelProps) {
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const currentColumn = columns.find(col => col.id === selectedColumnId);

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border w-auto max-h-80 overflow-hidden z-50"
      onClick={handlePanelClick}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Sort Columns</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className='flex gap-4'>
          <div>
            <label className="w-40 block text-sm font-medium mb-1">Select Column:</label>
            <select
              value={selectedColumnId ?? ''}
              onChange={e => setSelectedColumnId(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select column...</option>
              {columns.map(col => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          {selectedColumnId !== null && (
            <div>
              <label className="block text-sm font-medium mb-1">Sort Direction:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortDirection('asc')}
                  className={`w-24 px-2 py-1 rounded border text-sm transition  ${
                    sortDirection === 'asc'
                      ? 'bg-blue-500 text-white'
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {currentColumn?.type === 'text' ? 'A → Z' : '↑ Asc'}
                </button>
                <button
                  onClick={() => setSortDirection('desc')}
                  className={`w-24 px-2 py-1 rounded border text-sm transition  ${
                    sortDirection === 'desc'
                      ? 'bg-blue-500 text-white'
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {currentColumn?.type === 'text' ? 'Z → A' : '↓ Desc'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              if (selectedColumnId !== null) {
                onDone({ columnId: selectedColumnId, direction: sortDirection });
                onClose();
              }
            }}
            disabled={selectedColumnId === null}
            className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
