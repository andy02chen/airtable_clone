import { api } from "~/src/trpc/react";

export default function CreateBase() {
  const createBase = api.base.create.useMutation({
  onSuccess: (data) => {
    console.log("Base created:", data);
  },
  onError: (error) => {
    console.error("Error creating base:", error);
  },
});


  return(
    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
      onClick={() => createBase.mutate({ name: "test" })}
    >
      Create Base
    </button>
  );
}