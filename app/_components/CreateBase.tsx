import { api } from "~/src/trpc/react";
import { toast } from "sonner";
import { useState } from "react";

export default function CreateBase() {
  const utils = api.useUtils();

  const createBase = api.base.create.useMutation();

  const [baseName, setBaseName] = useState("Untitled Base");
  const [showInput, setShowInput] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  return(
    <div className="gap-4 flex">
      {!showInput ?
        (
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
            onClick={() => setShowInput(true)}
          >
            Create Base
          </button>
        )
        :
        (
          <div className="flex gap-2">
        <input
          type="text"
          className="bg-white border-black border-2 px-2"
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          autoFocus
          onFocus={(e) => e.target.select()} 
        />
        <button
          className={`px-4 py-2 text-white rounded cursor-pointer ${
            submitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          onClick={async () => {
            if (submitting) return;

            setSubmitting(true);
            try {
              if (!baseName.trim()) {
                toast.error("Please enter a base name");
                setSubmitting(false);
                return;
              }
              await createBase.mutateAsync({ name: baseName });
              await utils.base.list.invalidate();
              toast.success("Base created successfully!");
              setBaseName("Untitled Base");
              setShowInput(false);
            } catch (error) {
              toast.error(`Failed to create base`);
              console.error("Creation error:", error);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? 'Creating...' : 'Confirm'}
        </button>
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
          onClick={() => {
            setShowInput(false);
            setBaseName("Untitled Base");
          }}
          disabled = {submitting}
        >
          Cancel
        </button>
      </div>
        )
      }
    </div>
  );
}