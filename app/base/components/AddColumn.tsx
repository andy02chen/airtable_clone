import { useState } from "react";

export function AddColumnButton({ onAdd }: { onAdd: (name: string, type: "TEXT" | "NUMBER") => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"TEXT" | "NUMBER">("TEXT");

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim(), type);
      setName("");
      setType("TEXT");
      setShowForm(false);
    }
  };

  return (
    <th className="relative w-[50px] border border-gray-300 text-center cursor-pointer hover:bg-gray-50"
    onClick={() => setShowForm((prev) => !prev)}>
      +
      {showForm && (
        <div className="absolute top-full left-0 z-10 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg p-2"
          onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            placeholder="Column name"
            className="w-full px-2 py-1 mb-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="w-full px-2 py-1 mb-2 border rounded"
            value={type}
            onChange={(e) => setType(e.target.value as "TEXT" | "NUMBER")}
          >
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
          </select>
          <button
            className="w-full px-2 py-1 bg-blue-400 text-white rounded hover:bg-blue-500 disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              handleSubmit();
            }}
            disabled={!name.trim()}
          >
            Add
          </button>
        </div>
      )}
    </th>
  );
}
