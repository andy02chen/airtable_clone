

export default function SortPanel() {
  return(
    <div 
      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border w-80 max-h-80 overflow-hidden z-50"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Hide Columns</h3>
        <button
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-sm text-blue-600 hover:text-blue-800"
          >
          </button>
        </div>
        
        <div className="max-h-48 overflow-y-auto">
        </div>
      </div>
    </div>
  );
}