import { utils } from "prettier/doc.js";
import { api } from "~/src/trpc/react";

export default function CreateBase() {
  const utils = api.useUtils();

  const createBase = api.base.create.useMutation({
    onSuccess: () => {
      utils.base.list.invalidate();
    },
  });

  return(
    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
      onClick={() => createBase.mutate({name:"test"})}
    >
      Create Base
    </button>
  );
}